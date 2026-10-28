import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { soundingAvailable } from "./api/pipeline";
import { altitudeCeiling, canSeeHigher } from "./lib/ceiling";
import { Guide } from "./components/Guide";
import { HourLine } from "./components/HourLine";
import { Meteogram } from "./components/Meteogram";
import { PageNav, type Page } from "./components/PageNav";
import { PlaceRail } from "./components/PlaceRail";
import { SiteForm } from "./components/SiteForm";
import { Sounding } from "./components/Sounding";
import { SurfaceStats } from "./components/SurfaceStats";
import { Windgram, type ChartHinge } from "./components/Windgram";
import { useI18n } from "./i18nContext";
import { trackEvent, trackPageView } from "./lib/analytics";
import { deskHandlesArrow, stepFavorites, stepPrimaryModel } from "./lib/keys";
import { dayHasShoulder, groupByDay, hourLabel, hourWindow, utcSlot } from "./lib/format";
import { interpolate, LANGS, type Lang } from "./lib/i18n";
import { meteoHoursForDay } from "./lib/meteogram";
import { useIsMobile } from "./lib/useIsMobile";
import { useStore } from "./stores";
import { storeCompare, writeStateToUrl } from "./stores/url";

const LANG_NAMES: Record<Lang, string> = {
  en: "English",
  fr: "Français",
  de: "Deutsch",
  es: "Español",
};

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d={dir === "left" ? "M14.5 5.5 L8 12 l6.5 6.5" : "M9.5 5.5 L16 12 l-6.5 6.5"}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Underline that slides and stretches between the active tab. */
function InkSeg({
  label,
  inkKey,
  children,
}: {
  label: string;
  inkKey: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [ink, setInk] = useState({ x: 0, y: 0, w: 0, on: false });

  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    const measure = () => {
      const btn = root.querySelector<HTMLElement>("button.is-on, button[aria-selected='true']");
      if (!btn) {
        setInk((s) => (s.on ? { ...s, on: false } : s));
        return;
      }
      setInk({
        x: btn.offsetLeft,
        y: btn.offsetTop + btn.offsetHeight - 1.5,
        w: btn.offsetWidth,
        on: true,
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    return () => ro.disconnect();
  }, [inkKey]);

  return (
    <div className="seg" role="tablist" aria-label={label} ref={ref}>
      <span
        className={ink.on ? "seg-ink is-on" : "seg-ink"}
        style={{ left: ink.x, top: ink.y, width: ink.w }}
      />
      {children}
    </div>
  );
}

export default function App() {
  const { lang, setLang, t } = useI18n();

  const modelId = useStore((s) => s.modelId);
  const data = useStore((s) => s.data);
  const error = useStore((s) => s.error);
  const loading = useStore((s) => s.loading);
  const refresh = useStore((s) => s.refresh);
  const toggleTheme = useStore((s) => s.toggleTheme);
  const stepHour = useStore((s) => s.stepHour);

  const point = useStore((s) => s.point);

  const day = useStore((s) => s.day);
  const hourIdx = useStore((s) => s.hourIdx);
  const view = useStore((s) => s.view);
  const setView = useStore((s) => s.setView);
  const selectDay = useStore((s) => s.selectDay);
  const selectHourTime = useStore((s) => s.selectHourTime);
  const showEarly = useStore((s) => s.showEarly);
  const showLate = useStore((s) => s.showLate);
  const setShowEarly = useStore((s) => s.setShowEarly);
  const setShowLate = useStore((s) => s.setShowLate);

  const compare = useStore((s) => s.compare);

  const theme = useStore((s) => s.theme);

  const isMobile = useIsMobile();
  const [guide, setGuide] = useState(
    () => new URLSearchParams(window.location.search).get("guide") === "1",
  );
  const [lifted, setLifted] = useState(false);

  const page: Page = guide ? "guide" : "place";

  useEffect(() => {
    trackPageView(page);
  }, [page]);

  useEffect(() => {
    function onPop() {
      const url = new URL(window.location.href);
      setGuide(url.searchParams.get("guide") === "1");
      if (url.searchParams.has("compare") || url.searchParams.has("pins")) {
        url.searchParams.delete("compare");
        url.searchParams.delete("pins");
        window.history.replaceState(null, "", url);
      }
      if (useStore.getState().compare) useStore.getState().toggleCompare(false);
    }
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    const store = useStore.getState();
    store.ensurePlace();
    store.loadMain();
    store.loadEntries();
  }, []);

  // Compare boards are gone. An old link or a stored board is closed, and
  // the URL goes back to the place.
  useEffect(() => {
    if (compare) {
      useStore.getState().toggleCompare(false);
      return;
    }
    writeStateToUrl(point, modelId, false, "place", []);
    storeCompare(false, [], false);
  }, [point, modelId, compare]);

  // Up and down walk the favorite list. Left and right switch the two
  // models on the windgram and the meteogram, and step the hour on the
  // emagram. Capture so the place field does not swallow the keys.
  useEffect(() => {
    if (guide) return;
    function onKey(e: KeyboardEvent) {
      const el = e.target instanceof HTMLElement ? e.target : null;
      if (
        !deskHandlesArrow(
          e.key,
          {
            tagName: el?.tagName ?? "",
            id: el?.id ?? "",
            value: el instanceof HTMLInputElement ? el.value : "",
            isContentEditable: el?.isContentEditable ?? false,
          },
          {
            mapOpen: document.querySelector(".map-overlay") != null,
            menuOpen: document.querySelector(".place-menu") != null,
            modified: e.altKey || e.ctrlKey || e.metaKey || e.shiftKey,
          },
        )
      ) {
        return;
      }

      const state = useStore.getState();
      const delta: -1 | 1 = e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 1;
      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        if (state.favs.length === 0) return;
        e.preventDefault();
        if (e.repeat) return;
        const next = stepFavorites(state.favs, state.point.lat, state.point.lon, delta);
        if (!next) return;
        el?.blur();
        state.submitPlace(next.lat, next.lon, next.label);
        return;
      }

      if (state.view === "sounding") {
        e.preventDefault();
        state.stepHour(delta);
        return;
      }
      e.preventDefault();
      if (e.repeat) return;
      const next = stepPrimaryModel(state.modelId, delta);
      if (!next) return;
      el?.blur();
      state.selectModel(next);
      trackEvent("model_selected", { model: next });
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [guide]);

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
    if (next === "guide") {
      openGuide();
      return;
    }
    if (guide) closeGuide();
  }

  function goHome(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    const url = new URL(window.location.href);
    url.searchParams.delete("guide");
    window.history.replaceState(null, "", url);
    setGuide(false);
    useStore.getState().goHome();
  }

  const span = useMemo(() => hourWindow(showEarly, showLate), [showEarly, showLate]);
  const days = useMemo(
    () => (data ? groupByDay(data.hours, lang, span) : []),
    [data, lang, span],
  );
  const soundingDays = useMemo(
    () => (data ? groupByDay(data.hours, lang, hourWindow(true, true)) : []),
    [data, lang],
  );
  const activeDay = day && days.some((d) => d.key === day) ? day : days[0]?.key;
  const dayIndex = days.findIndex((d) => d.key === activeDay);
  const dayHours = days[dayIndex]?.hours ?? [];
  const soundingDayIndex = soundingDays.findIndex((d) => d.key === activeDay);
  const soundingHours = soundingDays[soundingDayIndex]?.hours ?? [];
  const meteoHours = useMemo(
    () => (data && activeDay ? meteoHoursForDay(data.hours, activeDay) : []),
    [data, activeDay],
  );
  const seeHigher = canSeeHigher(dayHours);
  const zMax = altitudeCeiling(dayHours, lifted);
  const earlyReach =
    data != null && activeDay != null && dayHasShoulder(data.hours, activeDay, "early");
  const lateReach =
    data != null && activeDay != null && dayHasShoulder(data.hours, activeDay, "late");
  const liftHinge: ChartHinge | null = seeHigher
    ? {
        open: lifted,
        label: lifted ? t.seeHigherBack : t.seeHigher,
        onToggle: () => setLifted((open) => !open),
      }
    : null;
  const earlyHinge: ChartHinge | null = earlyReach
    ? {
        open: showEarly,
        label: showEarly ? t.hoursEarlyBack : t.hoursEarly,
        text: t.hoursEarlyShort,
        onToggle: () => setShowEarly(!showEarly),
      }
    : null;
  const lateHinge: ChartHinge | null = lateReach
    ? {
        open: showLate,
        label: showLate ? t.hoursLateBack : t.hoursLate,
        text: t.hoursLateShort,
        onToggle: () => setShowLate(!showLate),
      }
    : null;
  const hour =
    soundingHours.find((h) => h.time === data?.hours[hourIdx]?.time) ?? soundingHours[0];
  const hourIndex = hour ? soundingHours.findIndex((h) => h.time === hour.time) : -1;
  const canPrev = hourIndex > 0 || soundingDayIndex > 0;
  const canNext =
    (hourIndex >= 0 && hourIndex < soundingHours.length - 1) ||
    (soundingDayIndex >= 0 && soundingDayIndex < soundingDays.length - 1);

  return (
    <div className="app">
      <header className="top">
        <div className="top-bar">
          <a
            className="brand-home"
            href="/"
            aria-label={t.homeAria}
            title={t.homeAria}
            onClick={goHome}
          >
            <span className="brand-lockup">
              <h1>Weather4Paragliding</h1>
            </span>
          </a>
          <PageNav page={page} onNavigate={navigate} />
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
              {theme === "dark" ? (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="1.6" />
                  <path
                    d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.1 5.1l1.6 1.6M17.3 17.3l1.6 1.6M18.9 5.1l-1.6 1.6M6.7 17.3l-1.6 1.6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M16.5 14.2A6.2 6.2 0 0 1 9.8 7.5 6.4 6.4 0 1 0 16.5 14.2z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      {guide ? (
        <Guide />
      ) : (
        <div className="workspace">
          <PlaceRail />
          <main className="stage">
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

            <SiteForm />

            {data ? (
              <p className="meta">
                <span>{interpolate(t.metaAlt, { m: data.modelElevationM })}</span>
                <span>
                  {interpolate(t.metaCache, { slot: utcSlot(data.runInitUtc) })}
                </span>
              </p>
            ) : null}

            {data ? (
              <>
                <div className="toolbar">
                  <InkSeg label={t.dayTablist} inkKey={`${activeDay ?? ""}-${lang}`}>
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
                  </InkSeg>
                  <InkSeg label={t.viewTablist} inkKey={`${view}-${lang}`}>
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
                  </InkSeg>
                </div>

                <div className="chart-swap" key={view}>
                  {view === "windgram" ? (
                    <Windgram
                      hours={dayHours}
                      elevationM={data.modelElevationM}
                      zMax={zMax}
                      compact={isMobile}
                      span={span}
                      lift={liftHinge}
                      early={earlyHinge}
                      late={lateHinge}
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
                    <div className="sounding-stage">
                      <button
                        type="button"
                        className="time-nudge"
                        aria-label={t.prevHour}
                        disabled={!canPrev}
                        onClick={() => stepHour(-1)}
                      >
                        <Chevron dir="left" />
                      </button>
                      <div className="sounding-col">
                        <p className="time-readout">{hourLabel(hour.time)}</p>
                        <SurfaceStats hour={hour} elevationM={data.modelElevationM} />
                        <Sounding
                          hour={hour}
                          elevationM={data.modelElevationM}
                          zMax={zMax}
                          lift={liftHinge}
                        />
                        <HourLine
                          hours={soundingHours}
                          current={hour.time}
                          label={t.hourLabel}
                          onSelect={selectHourTime}
                        />
                      </div>
                      <button
                        type="button"
                        className="time-nudge"
                        aria-label={t.nextHour}
                        disabled={!canNext}
                        onClick={() => stepHour(1)}
                      >
                        <Chevron dir="right" />
                      </button>
                    </div>
                  ) : null}
                </div>

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
          </main>
        </div>
      )}
    </div>
  );
}
