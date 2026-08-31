import { useEffect, useMemo, useRef, useState } from "react";
import { MODELS, isModelId } from "./api/models";
import { CompareBoard } from "./components/CompareBoard";
import { Guide } from "./components/Guide";
import { SiteForm } from "./components/SiteForm";
import { Sounding } from "./components/Sounding";
import { SurfaceStats } from "./components/SurfaceStats";
import { Windgram } from "./components/Windgram";
import { groupByDay, hourLabel, utcSlot } from "./lib/format";
import { findPlaceEntry } from "./lib/compare";
import { interpolate, LANGS, type Lang } from "./lib/i18n";
import { pinKey } from "./lib/pins";
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
const MODEL_GROUP_ORDER = ["allAltitude", "lowLevel", "nowcast", "longRange"] as const;

// fixed windgram ceiling: one tall grid, the page scrolls
const Z_MAX_M = 5000;
type ModelGroup = (typeof MODEL_GROUP_ORDER)[number];

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
  const place = useStore((s) => s.place);

  const day = useStore((s) => s.day);
  const hourIdx = useStore((s) => s.hourIdx);
  const view = useStore((s) => s.view);
  const activeZ = useStore((s) => s.activeZ);
  const setActiveZ = useStore((s) => s.setActiveZ);
  const setView = useStore((s) => s.setView);
  const selectDay = useStore((s) => s.selectDay);
  const selectHourTime = useStore((s) => s.selectHourTime);

  const compare = useStore((s) => s.compare);
  const entries = useStore((s) => s.entries);

  const favs = useStore((s) => s.favs);
  const theme = useStore((s) => s.theme);
  const addFavorite = useStore((s) => s.addFavorite);

  const isMobile = useIsMobile();
  const [guide, setGuide] = useState(
    () => new URLSearchParams(window.location.search).get("guide") === "1",
  );
  // tracks the compare mode already reflected in the history, so the URL
  // effect pushes a new entry only on a real mode transition
  const prevCompare = useRef(compare);

  const MODEL_GROUP_LABEL: Record<ModelGroup, string> = {
    nowcast: t.modelGroupNowcast,
    lowLevel: t.modelGroupLowLevel,
    allAltitude: t.modelGroupAllAltitude,
    longRange: t.modelGroupLongRange,
  };

  useEffect(() => {
    function onPop() {
      const q = new URLSearchParams(window.location.search);
      setGuide(q.get("guide") === "1");
      // the history entry already carries this mode: don't push again
      prevCompare.current = q.get("compare") === "1";
      useStore.getState().syncCompareFromUrl(prevCompare.current, q.get("pins"));
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

  // keep the URL and the compare board in sync with the state; entering or
  // leaving compare mode is a navigation (pushState), so the browser back
  // button leaves the compare page
  useEffect(() => {
    const entering = compare !== prevCompare.current;
    prevCompare.current = compare;
    if (entering) {
      const url = new URL(window.location.href);
      if (compare) url.searchParams.set("compare", "1");
      else {
        url.searchParams.delete("compare");
        url.searchParams.delete("pins");
      }
      window.history.pushState(null, "", url);
    }
    writeStateToUrl(point, modelId, compare, entries);
    storeCompare(compare, entries);
  }, [point, modelId, compare, entries]);

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

  function goHome(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    setGuide(false);
    useStore.getState().goHome();
  }

  const favKey = `${point.lat.toFixed(4)},${point.lon.toFixed(4)}`;
  const placeSaved = favs.some((f) => `${f.lat.toFixed(4)},${f.lon.toFixed(4)}` === favKey);

  const mainKey = pinKey(point);
  // reuse the board's stored name when the place label is not known (reload)
  const mainPinName = findPlaceEntry(entries, mainKey)?.name;

  const days = useMemo(
    () => (data ? groupByDay(data.hours, lang) : []),
    [data, lang],
  );
  const activeDay = day && days.some((d) => d.key === day) ? day : days[0]?.key;
  const dayHours = days.find((d) => d.key === activeDay)?.hours ?? [];
  const hour = dayHours.find((h) => h.time === data?.hours[hourIdx]?.time) ?? dayHours[0];

  return (
    <div className="app">
      <header className="top">
        <div className="top-actions">
          <select
            className="lang-select"
            aria-label={t.langLabel}
            title={t.langLabel}
            value={lang}
            onChange={(e) => setLang(e.target.value as (typeof LANGS)[number])}
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
        <div className="top-main">
          <div className="brand">
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
            <div className="brand-sub">
              <p>{t.brandSub}</p>
              <button type="button" className="guide-btn" onClick={openGuide}>
                {t.guideOpen}
              </button>
            </div>
          </div>
          {compare ? (
            <div className="compare-top">
              <button type="button" className="btn" onClick={() => useStore.getState().toggleCompare(false)}>
                ← {t.compareBack}
              </button>
            </div>
          ) : (
            <SiteForm />
          )}
        </div>
      </header>

      {guide ? (
        <Guide onBack={closeGuide} />
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

      {!compare ? (
        <div className="place-line">
          <strong>
            {place ?? mainPinName ?? `${point.lat.toFixed(4)}°N ${point.lon.toFixed(4)}°E`}
          </strong>
          <button
            type="button"
            className={placeSaved ? "btn fav-add is-hidden" : "btn fav-add"}
            aria-hidden={placeSaved}
            tabIndex={placeSaved ? -1 : 0}
            aria-label={t.addFavoriteAria}
            onClick={addFavorite}
          >
            {t.addFavorite}
          </button>
        </div>
      ) : null}

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
          <span>{interpolate(t.metaCache, { slot: utcSlot(data.runInitUtc) })}</span>
        </p>
      ) : null}

      {data ? (
        <>
          <div className="toolbar">
            <label className="pick">
              {t.modelLabel}
              <select
                value={modelId}
                onChange={(e) => {
                  const next = e.target.value;
                  if (isModelId(next)) selectModel(next);
                }}
              >
                {MODEL_GROUP_ORDER.map((group) => (
                  <optgroup key={group} label={MODEL_GROUP_LABEL[group]}>
                    {MODELS.filter((m) => m.group === group).map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label} · {interpolate(t.daysSuffix, { n: m.days })}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
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
              <Windgram hours={dayHours} elevationM={data.modelElevationM} zMax={Z_MAX_M} compact={isMobile} />
            ) : hour ? (
              <>
                <SurfaceStats hour={hour} elevationM={data.modelElevationM} />
                <Sounding
                  hour={hour}
                  elevationM={data.modelElevationM}
                  activeZ={activeZ}
                  onActiveZ={setActiveZ}
                />
              </>
            ) : null
          ) : null}

          <p className="hint-keys">{t.hintLevels}</p>

          {compare ? (
            <CompareBoard
              dayKey={activeDay ?? null}
              hourTime={hour?.time ?? null}
              view={view}
              zMax={Z_MAX_M}
              compact={isMobile}
            />
          ) : null}

          {data.warnings.length > 0 ? (
            <details className="notes">
              <summary>Data notes</summary>
              <ul>
                {data.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </details>
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
