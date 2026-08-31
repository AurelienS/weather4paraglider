import { useEffect, useMemo, useRef, useState } from "react";
import { fetchArome } from "./api/client";
import type { AromeResponse } from "./api/types";
import {
  DEFAULT_MODEL,
  MODELS,
  isModelId,
  modelById,
  type ModelId,
} from "./api/models";
import { PinCard, type PinState } from "./components/PinCard";
import { FavoritesMenu } from "./components/FavoritesMenu";
import { Guide } from "./components/Guide";
import { PlaceSearch } from "./components/PlaceSearch";
import { SiteForm } from "./components/SiteForm";
import { Sounding } from "./components/Sounding";
import { SurfaceStats } from "./components/SurfaceStats";
import { Windgram } from "./components/Windgram";
import {
  DEMO_POINT,
  groupByDay,
  hourLabel,
  selectionAfterLoad,
  utcSlot,
} from "./lib/format";
import { loadFavorites, storeFavorites, type Favorite } from "./lib/favorites";
import { placeText, reverseGeocode } from "./lib/geocode";
import { addPin, encodePins, parsePins, pinKey, type Pin } from "./lib/pins";
import { applyTheme, loadTheme, otherTheme, storeTheme, type Theme } from "./lib/theme";
import { interpolate, LANGS, type Lang } from "./lib/i18n";
import { loadVersioned, storeVersioned } from "./lib/storage";
import { useI18n } from "./i18nContext";
import { useIsMobile } from "./lib/useIsMobile";

type Point = { lat: number; lon: number };
type View = "windgram" | "sounding";

const COMPARE_KEY = "w4p.compare.v1";

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

function readPointFromUrl(): Point {
  const q = new URLSearchParams(window.location.search);
  const lat = q.get("lat") == null ? NaN : Number(q.get("lat"));
  const lon = q.get("lon") == null ? NaN : Number(q.get("lon"));
  if (Number.isFinite(lat) && Number.isFinite(lon)) return { lat, lon };
  return { lat: DEMO_POINT.lat, lon: DEMO_POINT.lon };
}

function readModelFromUrl(): ModelId {
  const q = new URLSearchParams(window.location.search);
  const raw = q.get("model");
  return raw != null && isModelId(raw) ? raw : DEFAULT_MODEL;
}

type CompareStore = { on: boolean; pins: Pin[] };

const COMPARE_VERSION = 1;

function parseCompare(data: unknown): CompareStore | null {
  if (data == null || typeof data !== "object") return null;
  const rec = data as Record<string, unknown>;
  const pins = Array.isArray(rec.pins)
    ? (rec.pins as Pin[]).filter(
        (p) => p && typeof p.lat === "number" && typeof p.lon === "number",
      )
    : [];
  return { on: rec.on === true, pins };
}

function readCompareStore(): CompareStore {
  const outcome = loadVersioned<CompareStore>(COMPARE_KEY, {
    current: COMPARE_VERSION,
    parse: parseCompare,
  });
  return outcome.data ?? { on: false, pins: [] };
}

function readInitialCompare(): boolean {
  const q = new URLSearchParams(window.location.search);
  if (q.get("compare") != null) return q.get("compare") === "1";
  return readCompareStore().on;
}

function readInitialPins(): Pin[] {
  const q = new URLSearchParams(window.location.search);
  const raw = q.get("pins");
  if (raw != null) return parsePins(raw);
  return readCompareStore().pins;
}

// evaluated once at startup; keeps the invariant that in compare mode the
// current place is always among the pins
const INITIAL = (() => {
  const point = readPointFromUrl();
  const compare = readInitialCompare();
  let pins = readInitialPins();
  if (compare && !pins.some((p) => pinKey(p) === pinKey(point))) {
    pins = addPin(pins, { lat: point.lat, lon: point.lon });
  }
  return { point, compare, pins };
})();

function writeStateToUrl(point: Point, modelId: ModelId, compare: boolean, pins: Pin[]) {
  const url = new URL(window.location.href);
  const isHome =
    point.lat === DEMO_POINT.lat &&
    point.lon === DEMO_POINT.lon &&
    modelId === DEFAULT_MODEL &&
    !compare &&
    pins.length === 0;
  const params = new URLSearchParams();
  if (!isHome) {
    params.set("lat", String(point.lat));
    params.set("lon", String(point.lon));
    params.set("model", modelId);
  }
  if (compare) params.set("compare", "1");
  let search = params.toString();
  // append pins manually: encodePins output is already URI-safe and must not be
  // re-encoded by URLSearchParams (which would turn %20 into %2520)
  if (compare && pins.length > 0) search += `&pins=${encodePins(pins)}`;
  url.search = search;
  window.history.replaceState(null, "", url);
}

export default function App() {
  const { lang, setLang, t } = useI18n();
  const [point, setPoint] = useState<Point>(readPointFromUrl);
  const [modelId, setModelId] = useState<ModelId>(readModelFromUrl);
  const [place, setPlace] = useState<string | null>(null);
  const [bump, setBump] = useState(0);
  const forceRef = useRef(false);
  const [data, setData] = useState<AromeResponse | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const [hourIdx, setHourIdx] = useState(0);
  const dayRef = useRef<string | null>(null);
  const hourTimeRef = useRef<string | null>(null);
  const carryRef = useRef(false);
  const [activeZ, setActiveZ] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>("windgram");
  const [compare, setCompare] = useState<boolean>(INITIAL.compare);
  const [pins, setPins] = useState<Pin[]>(INITIAL.pins);
  const [pinStates, setPinStates] = useState<Record<string, PinState>>({});
  const [favs, setFavs] = useState<Favorite[]>(loadFavorites);
  const [theme, setTheme] = useState<Theme>(loadTheme);
  const [guide, setGuide] = useState(
    () => new URLSearchParams(window.location.search).get("guide") === "1",
  );
  const forcePinsRef = useRef(false);
  const isMobile = useIsMobile();

  const MODEL_GROUP_LABEL: Record<ModelGroup, string> = {
    nowcast: t.modelGroupNowcast,
    lowLevel: t.modelGroupLowLevel,
    allAltitude: t.modelGroupAllAltitude,
    longRange: t.modelGroupLongRange,
  };

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    function onPop() {
      setGuide(new URLSearchParams(window.location.search).get("guide") === "1");
    }
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // a shared URL carries bare coordinates: look up the place name once so
  // the header shows "Chamonix-Mont-Blanc" instead of "45.9546°N 6.7539°E"
  useEffect(() => {
    if (place != null) return;
    const ctl = new AbortController();
    reverseGeocode(point.lat, point.lon, ctl.signal)
      .then((p) => {
        if (p) setPlace(placeText(p));
      })
      .catch(() => {
        // offline or Photon down: keep the coordinate fallback
      });
    return () => ctl.abort();
  }, [point.lat, point.lon, place]);

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

  const favKey = `${point.lat.toFixed(4)},${point.lon.toFixed(4)}`;
  const placeSaved = favs.some((f) => `${f.lat.toFixed(4)},${f.lon.toFixed(4)}` === favKey);

  function addFavorite() {
    if (placeSaved) return;
    const next = [
      {
        lat: point.lat,
        lon: point.lon,
        label:
          place ??
          mainPinName ??
          `${point.lat.toFixed(4)}, ${point.lon.toFixed(4)}`,
      },
      ...favs,
    ];
    setFavs(next);
    storeFavorites(next);
  }

  function removeFavorite(fav: Favorite) {
    const next = favs.filter((f) => f !== fav);
    setFavs(next);
    storeFavorites(next);
  }

  useEffect(() => {
    writeStateToUrl({ lat: point.lat, lon: point.lon }, modelId, compare, pins);
    storeVersioned(COMPARE_KEY, { on: compare, pins }, COMPARE_VERSION);
  }, [point.lat, point.lon, modelId, compare, pins]);

  useEffect(() => {
    const ac = new AbortController();
    const force = forceRef.current;
    forceRef.current = false;
    const carry = carryRef.current;
    carryRef.current = false;

    fetchArome(point.lat, point.lon, modelId, { force, signal: ac.signal, lang })
      .then((payload) => {
        if (ac.signal.aborted) return;
        const next = carry
          ? selectionAfterLoad(payload.hours, dayRef.current, hourTimeRef.current)
          : selectionAfterLoad(payload.hours, null, null);
        setData(payload);
        setHourIdx(next.hourIdx);
        setDay(next.day);
        setActiveZ(null);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        const message =
          err instanceof Error && err.message ? err.message : t.errUnexpected;
        setError(message);
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });

    return () => ac.abort();
  }, [point.lat, point.lon, modelId, bump, lang, t]);

  useEffect(() => {
    if (!compare || pins.length === 0) return;
    const ac = new AbortController();
    const force = forcePinsRef.current;
    forcePinsRef.current = false;
    let alive = true;
    for (const pin of pins) {
      const key = pinKey(pin);
      fetchArome(pin.lat, pin.lon, modelId, { force, signal: ac.signal, lang })
        .then((payload) => {
          if (!alive) return;
          setPinStates((s) => ({ ...s, [key]: { status: "ready", data: payload } }));
        })
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === "AbortError") return;
          if (!alive) return;
          const message =
            err instanceof Error && err.message ? err.message : t.errUnexpected;
          setPinStates((s) => ({ ...s, [key]: { status: "error", message } }));
        });
    }
    return () => {
      alive = false;
      ac.abort();
    };
  }, [compare, pins, modelId, bump, lang, t]);

  const mainKey = pinKey({ lat: point.lat, lon: point.lon });
  const mainPinned = pins.some((p) => pinKey(p) === mainKey);
  // reuse the pin's stored name when the place label is not known (e.g. reload)
  const mainPinName = pins.find((p) => pinKey(p) === mainKey)?.name;

  function selectModel(next: ModelId) {
    if (next === modelId) return;
    carryRef.current = true;
    setLoading(true);
    setError(null);
    setModelId(next);
  }

  const days = useMemo(
    () => (data ? groupByDay(data.hours, lang) : []),
    [data, lang],
  );
  const activeDay = day && days.some((d) => d.key === day) ? day : days[0]?.key;
  const dayHours = days.find((d) => d.key === activeDay)?.hours ?? [];
  const hour = dayHours.find((h) => h.time === data?.hours[hourIdx]?.time) ?? dayHours[0];

  useEffect(() => {
    dayRef.current = day;
    hourTimeRef.current = hour?.time ?? null;
  });

  function selectDay(key: string) {
    setDay(key);
    const first = days.find((d) => d.key === key)?.hours[0];
    if (!data || !first) return;
    const idx = data.hours.findIndex((h) => h.time === first.time);
    if (idx >= 0) setHourIdx(idx);
  }

  function refresh() {
    setLoading(true);
    setError(null);
    carryRef.current = true;
    forceRef.current = true;
    forcePinsRef.current = true;
    setBump((n) => n + 1);
  }

  function goHome(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    setGuide(false);
    setCompare(false);
    setPins([]);
    setPlace(null);
    setDay(null);
    setHourIdx(0);
    setView("windgram");
    setModelId(DEFAULT_MODEL);
    setPoint(DEMO_POINT);
  }

  function toggleCompare(next: boolean) {
    setCompare(next);
    // entering compare mode: the current place joins the board
    if (next && !mainPinned) {
      setPins((prev) =>
        addPin(prev, { lat: point.lat, lon: point.lon, name: place ?? undefined }),
      );
    }
  }

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
            onClick={() => {
              const next = otherTheme(theme);
              storeTheme(next);
              setTheme(next);
            }}
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
          <SiteForm
            lat={point.lat}
            lon={point.lon}
            model={modelById(modelId)}
            loading={loading}
            compare={compare}
            favs={favs}
            onFavoriteRemove={removeFavorite}
            onCompareChange={toggleCompare}
            onSubmit={(lat, lon, label) => {
              setLoading(true);
              setError(null);
              setPlace(label ?? null);
              // in compare mode every loaded place joins the board
              if (compare) {
                setPins((prev) =>
                  addPin(prev, { lat, lon, name: label ?? undefined }),
                );
              }
              if (lat === point.lat && lon === point.lon) setBump((n) => n + 1);
              else setPoint({ lat, lon });
            }}
            onRefresh={refresh}
          />
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
                  onChange={(e) => {
                    const idx = data.hours.findIndex((h) => h.time === e.target.value);
                    if (idx >= 0) setHourIdx(idx);
                  }}
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
            <section className="board" aria-label={t.boardAria}>
              <div className="board-head">
                <h2>
                  {pins.length > 1
                    ? interpolate(t.boardMany, { n: pins.length })
                    : t.boardOne}
                </h2>
                <div className="board-tools">
                  <PlaceSearch
                    disabled={false}
                    compact
                    id="board-place"
                    label=""
                    ariaLabel={t.boardAddAria}
                    placeholder={t.boardAddPlaceholder}
                    model={modelById(modelId)}
                    onPick={(p) =>
                      setPins((prev) =>
                        addPin(prev, {
                          lat: p.lat,
                          lon: p.lon,
                          name: `${p.label}, ${p.detail}`,
                        }),
                      )
                    }
                  />
                  <FavoritesMenu
                    list={favs}
                    currentKey={favKey}
                    disabledKeys={pins.map(pinKey)}
                    onPick={(fav) =>
                      setPins((prev) =>
                        addPin(prev, { lat: fav.lat, lon: fav.lon, name: fav.label }),
                      )
                    }
                  />
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() =>
                      setPins([
                        { lat: point.lat, lon: point.lon, name: place ?? undefined },
                      ])
                    }
                  >
                    {t.boardClear}
                  </button>
                </div>
              </div>
              <div className="board-list">
                {pins.map((pin) => {
                  const key = pinKey(pin);
                  const isCurrent = key === mainKey;
                  return (
                    <PinCard
                      key={key}
                      pin={pin}
                      state={pinStates[key]}
                      dayKey={activeDay ?? null}
                      hourTime={hour?.time ?? null}
                      view={view}
                      zMax={Z_MAX_M}
                      compact={isMobile}
                      onRemove={() => {
                        // removing the current place ends the comparison
                        if (isCurrent) setCompare(false);
                        setPins((prev) => prev.filter((p) => pinKey(p) !== key));
                      }}
                    />
                  );
                })}
              </div>
            </section>
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
