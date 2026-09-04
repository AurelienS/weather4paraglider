import { useEffect, useMemo, useRef, useState } from "react";
import {
  MODELS,
  isModelId,
  MODEL_GROUP_ORDER,
  type ModelGroup,
} from "./api/models";
import { BoardHead } from "./components/BoardHead";
import { CompareBoard } from "./components/CompareBoard";
import { Guide } from "./components/Guide";
import { Meteogram } from "./components/Meteogram";
import { PageNav, type Page } from "./components/PageNav";
import { SiteForm } from "./components/SiteForm";
import { Sounding } from "./components/Sounding";
import { SurfaceStats } from "./components/SurfaceStats";
import { Windgram } from "./components/Windgram";
import { groupByDay, hourLabel, utcSlot } from "./lib/format";
import { trackEvent, trackPageView } from "./lib/analytics";
import { soundingAvailable } from "./api/pipeline";
import { meteoHoursForDay } from "./lib/meteogram";
import { interpolate, LANGS, type Lang } from "./lib/i18n";
import { useIsMobile } from "./lib/useIsMobile";
import { useStore } from "./stores";
import { storeCompare, writeStateToUrl } from "./stores/url";
import { useI18n } from "./i18nContext";

// language names are shown in their own language, whatever the UI language
const LANG_NAMES: Record<Lang, string> = {
  en: "English",
  fr: "Français",
  de: "Deutsch",
  es: "Español",
};

// dropdown grouping of the model select, in display order: the all-altitude
// reference models first, then the ground-precision specialists, the nowcast
// and finally the longer-range models
// fixed windgram ceiling: one tall grid, the page scrolls
const Z_MAX_M = 5000;

export default function App() {
  const { lang, setLang, t } = useI18n();

  const modelId = useStore((s) => s.modelId);
  const data = useStore((s) => s.data);
  const error = useStore((s) => s.error);
  const loading = useStore((s) => s.loading);
  const selectModel = useStore((s) => s.selectModel);
  const refresh = useStore((s) => s.refresh);
  const toggleTheme = useStore((s) => s.toggleTheme);

  const point = useStore((s) => s.point);

  const day = useStore((s) => s.day);
  const hourIdx = useStore((s) => s.hourIdx);
  const view = useStore((s) => s.view);
  const activeZ = useStore((s) => s.activeZ);
  const setActiveZ = useStore((s) => s.setActiveZ);
  const setView = useStore((s) => s.setView);
  const selectDay = useStore((s) => s.selectDay);
  const selectHourTime = useStore((s) => s.selectHourTime);

  const compare = useStore((s) => s.compare);
  const compareMode = useStore((s) => s.compareMode);
  const entries = useStore((s) => s.entries);
  const showAverage = useStore((s) => s.showAverage);

  const theme = useStore((s) => s.theme);

  const isMobile = useIsMobile();
  const [guide, setGuide] = useState(
    () => new URLSearchParams(window.location.search).get("guide") === "1",
  );
  // tracks the compare flavor already reflected in the history, so the URL
  // effect pushes a new entry only on a real transition (open, close or
  // switch between the place and model boards)
  const prevCompare = useRef<string | false>(
    compare ? (compareMode === "model" ? "models" : "1") : false,
  );

  // the nav is derived from the state: no separate page flag to keep in sync
  const page: Page = guide
    ? "guide"
    : compare
      ? compareMode === "model"
        ? "compare-models"
        : "compare-places"
      : "place";

  const MODEL_GROUP_LABEL: Record<ModelGroup, string> = {
    nowcast: t.modelGroupNowcast,
    lowLevel: t.modelGroupLowLevel,
    allAltitude: t.modelGroupAllAltitude,
    longRange: t.modelGroupLongRange,
  };

  // page views: place, the two compare boards and the guide; selections
  // that stay on the same page (day, hour, pin, model) are not page views
  useEffect(() => {
    trackPageView(page);
  }, [page]);

  useEffect(() => {
    function onPop() {
      const q = new URLSearchParams(window.location.search);
      setGuide(q.get("guide") === "1");
      const cmp = q.get("compare");
      const on = cmp === "1" || cmp === "models";
      // the history entry already carries this mode: don't push again
      prevCompare.current = on ? cmp : false;
      useStore
        .getState()
        .syncCompareFromUrl(
          on,
          q.get("pins"),
          cmp === "models" ? "model" : "place",
        );
    }
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // initial place name and first load; re-runs of this effect (StrictMode)
  // abort the previous loads, as the old effect cleanup did
  useEffect(() => {
    const store = useStore.getState();
    store.ensurePlace();
    store.loadMain();
    store.loadEntries();
  }, []);

  // keep the URL and the compare board in sync with the state; entering,
  // leaving or switching the compare board is a navigation (pushState), so
  // the browser back button walks through the pages
  useEffect(() => {
    const flavor = compare ? (compareMode === "model" ? "models" : "1") : false;
    const entering = flavor !== prevCompare.current;
    prevCompare.current = flavor;
    if (entering) {
      const url = new URL(window.location.href);
      if (flavor) url.searchParams.set("compare", flavor);
      else {
        url.searchParams.delete("compare");
        url.searchParams.delete("pins");
      }
      window.history.pushState(null, "", url);
    }
    writeStateToUrl(point, modelId, compare, compareMode, entries);
    storeCompare(compare, entries, showAverage);
  }, [point, modelId, compare, compareMode, entries, showAverage]);

  function openGuide() {
    const url = new URL(window.location.href);
    url.searchParams.set("guide", "1");
    window.history.pushState(null, "", url);
    setGuide(true);
  }

  function closeGuide() {
    const url = new URL(window.location.href);
    url.searchParams.delete("guide");
    window.history.pushState(null, "", url);
    setGuide(false);
  }

  function navigate(next: Page) {
    if (next === page) return;
    const store = useStore.getState();
    if (next === "guide") {
      openGuide();
      return;
    }
    if (guide) closeGuide();
    if (next === "place") {
      if (compare) store.toggleCompare(false);
    } else if (next === "compare-places") {
      store.toggleCompare(true, "place");
    } else {
      store.toggleCompare(true, "model");
    }
  }

  function goHome(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    setGuide(false);
    useStore.getState().goHome();
  }

  const days = useMemo(
    () => (data ? groupByDay(data.hours, lang) : []),
    [data, lang],
  );
  const activeDay = day && days.some((d) => d.key === day) ? day : days[0]?.key;
  const dayHours = days.find((d) => d.key === activeDay)?.hours ?? [];
  // the meteogram spans the whole 24 h of the selected day, not just the
  // 07:00–22:00 display window
  const meteoHours = useMemo(
    () => (data && activeDay ? meteoHoursForDay(data.hours, activeDay) : []),
    [data, activeDay],
  );
  const hour =
    dayHours.find((h) => h.time === data?.hours[hourIdx]?.time) ?? dayHours[0];

  return (
    <div className="app">
      <header className="top">
        <div className="top-bar">
          {/* left: logo */}
          <a
            className="brand-home"
            href="/"
            aria-label={t.homeAria}
            title={t.homeAria}
            onClick={goHome}
          >
            <svg className="logo" viewBox="0 0 32 32" aria-hidden="true">
              <path
                className="logo-wing"
                d="M2.5 12.5 C8 4.5 24 4.5 29.5 12.5 C24 10 8 10 2.5 12.5 Z"
              />
              <path
                className="logo-lines"
                d="M3 12.7 L13.6 23.6 M29 12.7 L18.4 23.6 M16 11.6 L16 23.6"
              />
              <circle className="logo-pilot" cx="16" cy="26.4" r="2.7" />
            </svg>
            <h1>Weather4Paragliding</h1>
          </a>
          {/* center: pages */}
          <PageNav page={page} onNavigate={navigate} />
          {/* right: language and theme */}
          <div className="top-actions">
            <select
              className="lang-select"
              aria-label={t.langLabel}
              title={t.langLabel}
              value={lang}
              onChange={(e) =>
                setLang(e.target.value as (typeof LANGS)[number])
              }
            >
              {LANGS.map((l) => (
                <option key={l} value={l}>
                  {LANG_NAMES[l]}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="theme-btn"
              aria-label={theme === "dark" ? t.themeToLight : t.themeToDark}
              title={theme === "dark" ? t.themeToLight : t.themeToDark}
              onClick={toggleTheme}
            >
              {theme === "dark" ? "☀" : "☾"}
            </button>
          </div>
        </div>
        <div className="top-main">
          {/* the Guide is static content: no selection controls in its
              header, the slot stays empty on that page */}
          {guide ? null : compare ? <BoardHead /> : <SiteForm />}
        </div>
      </header>

      {guide ? (
        <Guide />
      ) : (
        <>
          <div className="flash">
            {error ? (
              <div className="banner error" role="alert">
                <span>{error}</span>
                <button type="button" className="btn" onClick={refresh}>
                  {t.retry}
                </button>
              </div>
            ) : loading ? (
              <div className="banner">{data ? t.updating : t.extracting}</div>
            ) : null}
          </div>

          {data && !compare ? (
            <p className="meta">
              <span>
                {data.lat.toFixed(3)}°N {data.lon.toFixed(3)}°E
              </span>
              <span>
                {interpolate(t.metaCell, {
                  lat: data.nearestCell.lat.toFixed(3),
                  lon: data.nearestCell.lon.toFixed(3),
                })}
              </span>
              <span>{interpolate(t.metaAlt, { m: data.modelElevationM })}</span>
              <span>
                {data.model} {data.grid} · {data.openMeteoModel ?? data.source}
              </span>
              <span>
                {interpolate(t.metaCache, { slot: utcSlot(data.runInitUtc) })}
              </span>
            </p>
          ) : null}

          {data ? (
            <>
              <div className="toolbar">
                {/* the model board picks its models explicitly: the single-model
                select would be a confusing duplicate there */}
                {!(compare && compareMode === "model") ? (
                  <label className="pick">
                    {t.modelLabel}
                    <select
                      value={modelId}
                      onChange={(e) => {
                        const next = e.target.value;
                        if (isModelId(next)) {
                          selectModel(next);
                          trackEvent("model_selected", { model: next });
                        }
                      }}
                    >
                      {MODEL_GROUP_ORDER.map((group) => (
                        <optgroup key={group} label={MODEL_GROUP_LABEL[group]}>
                          {MODELS.filter((m) => m.group === group).map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.label} ·{" "}
                              {interpolate(t.daysSuffix, { n: m.days })}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </label>
                ) : null}
                <div className="seg" role="tablist" aria-label={t.dayTablist}>
                  {days.map((d) => (
                    <button
                      key={d.key}
                      type="button"
                      role="tab"
                      aria-selected={d.key === activeDay}
                      className={d.key === activeDay ? "is-on" : undefined}
                      onClick={() => selectDay(d.key)}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
                <div className="seg" role="tablist" aria-label={t.viewTablist}>
                  <button
                    type="button"
                    className={view === "windgram" ? "is-on" : undefined}
                    onClick={() => setView("windgram")}
                  >
                    {t.viewWindgram}
                  </button>
                  <button
                    type="button"
                    className={view === "meteogram" ? "is-on" : undefined}
                    onClick={() => setView("meteogram")}
                  >
                    {t.viewMeteogram}
                    <span className="beta-tag">beta</span>
                  </button>
                  <button
                    type="button"
                    className={view === "sounding" ? "is-on" : undefined}
                    onClick={() => setView("sounding")}
                  >
                    {t.viewSounding}
                  </button>
                </div>
                {view === "sounding" ? (
                  <label className="pick">
                    {t.hourLabel}
                    <select
                      value={hour?.time ?? ""}
                      onChange={(e) => selectHourTime(e.target.value)}
                    >
                      {dayHours.map((h) => (
                        <option key={h.time} value={h.time}>
                          {hourLabel(h.time)}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
              </div>

              {!compare ? (
                view === "windgram" ? (
                  <Windgram
                    hours={dayHours}
                    elevationM={data.modelElevationM}
                    zMax={Z_MAX_M}
                    compact={isMobile}
                  />
                ) : view === "meteogram" ? (
                  meteoHours.length > 0 ? (
                    <Meteogram
                      hours={meteoHours}
                      elevationM={data.modelElevationM}
                      compact={isMobile}
                    />
                  ) : (
                    <p className="board-card-note">{t.noDataDay}</p>
                  )
                ) : !soundingAvailable(data) ? (
                  <p className="board-card-note">{t.soundingUnavailable}</p>
                ) : hour ? (
                  <>
                    <SurfaceStats
                      hour={hour}
                      elevationM={data.modelElevationM}
                    />
                    <Sounding
                      hour={hour}
                      elevationM={data.modelElevationM}
                      activeZ={activeZ}
                      onActiveZ={setActiveZ}
                    />
                  </>
                ) : null
              ) : null}

              {compare ? (
                <CompareBoard
                  dayKey={activeDay ?? null}
                  hourTime={hour?.time ?? null}
                  view={view}
                  zMax={Z_MAX_M}
                  compact={isMobile}
                />
              ) : null}

              <footer className="foot">
                {data.attribution} ·{" "}
                <a
                  href="https://github.com/AurelienS/weather4paraglider/blob/main/LICENSE"
                  target="_blank"
                  rel="noreferrer"
                >
                  AGPL-3.0
                </a>{" "}
                ·{" "}
                <a
                  href="https://github.com/AurelienS/weather4paraglider"
                  target="_blank"
                  rel="noreferrer"
                >
                  GitHub
                </a>
              </footer>
            </>
          ) : null}
        </>
      )}
    </div>
  );
}
