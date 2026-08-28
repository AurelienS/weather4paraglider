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
import { PlaceSearch } from "./components/PlaceSearch";
import { SiteForm } from "./components/SiteForm";
import { Sounding } from "./components/Sounding";
import { SurfaceStats } from "./components/SurfaceStats";
import { Windgram } from "./components/Windgram";
import {
  DEMO_POINT,
  dayKey,
  groupByDay,
  hourLabel,
  pickDefaultHour,
  utcSlot,
} from "./lib/format";
import { loadFavorites, storeFavorites, type Favorite } from "./lib/favorites";
import { addPin, encodePins, parsePins, pinKey, type Pin } from "./lib/pins";

type Point = { lat: number; lon: number };
type View = "windgram" | "sounding";

const COMPARE_KEY = "w4p.compare.v1";

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

function readCompareStore(): { on: boolean; pins: Pin[] } {
  try {
    const raw = window.localStorage.getItem(COMPARE_KEY);
    if (!raw) return { on: false, pins: [] };
    const v = JSON.parse(raw) as { on?: unknown; pins?: unknown };
    const pins = Array.isArray(v.pins)
      ? (v.pins as Pin[]).filter(
          (p) => p && typeof p.lat === "number" && typeof p.lon === "number",
        )
      : [];
    return { on: v.on === true, pins };
  } catch {
    return { on: false, pins: [] };
  }
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
  const params = new URLSearchParams({
    lat: String(point.lat),
    lon: String(point.lon),
    model: modelId,
  });
  if (compare) params.set("compare", "1");
  let search = params.toString();
  // append pins manually: encodePins output is already URI-safe and must not be
  // re-encoded by URLSearchParams (which would turn %20 into %2520)
  if (compare && pins.length > 0) search += `&pins=${encodePins(pins)}`;
  url.search = search;
  window.history.replaceState(null, "", url);
}

export default function App() {
  const [point, setPoint] = useState<Point>(readPointFromUrl);
  const [modelId, setModelId] = useState<ModelId>(readModelFromUrl);
  const [place, setPlace] = useState<string | null>(null);
  const [bump, setBump] = useState(0);
  const forceRef = useRef(false);
  const [data, setData] = useState<AromeResponse | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const [hourIdx, setHourIdx] = useState(0);
  const [activeZ, setActiveZ] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>("windgram");
  const [zMax, setZMax] = useState(4000);
  const [compare, setCompare] = useState<boolean>(INITIAL.compare);
  const [pins, setPins] = useState<Pin[]>(INITIAL.pins);
  const [pinStates, setPinStates] = useState<Record<string, PinState>>({});
  const [favs, setFavs] = useState<Favorite[]>(loadFavorites);
  const forcePinsRef = useRef(false);

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
    try {
      window.localStorage.setItem(COMPARE_KEY, JSON.stringify({ on: compare, pins }));
    } catch {
      /* storage unavailable (private mode) */
    }
  }, [point.lat, point.lon, modelId, compare, pins]);

  useEffect(() => {
    const ac = new AbortController();
    const force = forceRef.current;
    forceRef.current = false;

    fetchArome(point.lat, point.lon, modelId, { force, signal: ac.signal })
      .then((payload) => {
        if (ac.signal.aborted) return;
        const idx = pickDefaultHour(payload.hours);
        const chosen = payload.hours[idx];
        setData(payload);
        setHourIdx(idx);
        setDay(chosen ? dayKey(chosen.time) : null);
        setActiveZ(null);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        const message =
          err instanceof Error && err.message
            ? err.message
            : "Could not fetch data.";
        setError(message);
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });

    return () => ac.abort();
  }, [point.lat, point.lon, modelId, bump]);

  useEffect(() => {
    if (!compare || pins.length === 0) return;
    const ac = new AbortController();
    const force = forcePinsRef.current;
    forcePinsRef.current = false;
    let alive = true;
    for (const pin of pins) {
      const key = pinKey(pin);
      fetchArome(pin.lat, pin.lon, modelId, { force, signal: ac.signal })
        .then((payload) => {
          if (!alive) return;
          setPinStates((s) => ({ ...s, [key]: { status: "ready", data: payload } }));
        })
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === "AbortError") return;
          if (!alive) return;
          const message =
            err instanceof Error && err.message
              ? err.message
              : "Could not fetch data.";
          setPinStates((s) => ({ ...s, [key]: { status: "error", message } }));
        });
    }
    return () => {
      alive = false;
      ac.abort();
    };
  }, [compare, pins, modelId, bump]);

  const mainKey = pinKey({ lat: point.lat, lon: point.lon });
  const mainPinned = pins.some((p) => pinKey(p) === mainKey);
  // reuse the pin's stored name when the place label is not known (e.g. reload)
  const mainPinName = pins.find((p) => pinKey(p) === mainKey)?.name;

  function selectModel(next: ModelId) {
    if (next === modelId) return;
    setLoading(true);
    setError(null);
    setModelId(next);
  }

  const days = useMemo(() => (data ? groupByDay(data.hours) : []), [data]);
  const activeDay = day && days.some((d) => d.key === day) ? day : days[0]?.key;
  const dayHours = days.find((d) => d.key === activeDay)?.hours ?? [];
  const hour = dayHours.find((h) => h.time === data?.hours[hourIdx]?.time) ?? dayHours[0];

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
    forceRef.current = true;
    forcePinsRef.current = true;
    setBump((n) => n + 1);
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
        <div className="brand">
          <h1>Weather4Paragliding</h1>
          <p>Windgram &amp; sounding per model · Open-Meteo multi-model</p>
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
      </header>

      <div className="flash">
        {error ? (
          <div className="banner error" role="alert">
            <span>{error}</span>
            <button type="button" className="btn" onClick={refresh}>
              Retry
            </button>
          </div>
        ) : loading ? (
          <div className="banner">{data ? "Updating…" : "Extracting profile…"}</div>
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
            aria-label="Add the current place to your favorites"
            onClick={addFavorite}
          >
            + Favorite
          </button>
        </div>
      ) : null}

      {data && !compare ? (
        <p className="meta">
          <span>
            {data.lat.toFixed(3)}°N {data.lon.toFixed(3)}°E
          </span>
          <span>
            cell {data.nearestCell.lat.toFixed(3)}, {data.nearestCell.lon.toFixed(3)}
          </span>
          <span>model alt. {data.modelElevationM}&nbsp;m</span>
          <span>
            {data.model} {data.grid} · {data.openMeteoModel ?? data.source}
          </span>
          <span>cache {utcSlot(data.runInitUtc)} UTC</span>
        </p>
      ) : null}

      {data ? (
        <>
          <div className="toolbar">
            <label className="pick">
              Model
              <select
                value={modelId}
                onChange={(e) => {
                  const next = e.target.value;
                  if (isModelId(next)) selectModel(next);
                }}
              >
                {MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label} · {m.days} days
                  </option>
                ))}
              </select>
            </label>
            <div className="seg" role="tablist" aria-label="Day">
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
            <div className="seg" role="tablist" aria-label="View">
              <button
                type="button"
                className={view === "windgram" ? "is-on" : undefined}
                onClick={() => setView("windgram")}
              >
                Windgram
              </button>
              <button
                type="button"
                className={view === "sounding" ? "is-on" : undefined}
                onClick={() => setView("sounding")}
              >
                Sounding
              </button>
            </div>
            {view === "windgram" ? (
              <div className="seg" role="tablist" aria-label="Ceiling">
                <button
                  type="button"
                  className={zMax === 4000 ? "is-on" : undefined}
                  onClick={() => setZMax(4000)}
                >
                  4000 m
                </button>
                <button
                  type="button"
                  className={zMax === 6000 ? "is-on" : undefined}
                  onClick={() => setZMax(6000)}
                >
                  6000 m
                </button>
              </div>
            ) : (
              <label className="pick">
                Hour
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
            )}
          </div>

          {!compare ? (
            view === "windgram" ? (
              <Windgram hours={dayHours} elevationM={data.modelElevationM} zMax={zMax} />
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

          <p className="hint-keys">250 m AMSL grid interpolated between model levels</p>

          {compare ? (
            <section className="board" aria-label="Comparison board">
              <div className="board-head">
                <h2>
                  Compare · {pins.length} {pins.length > 1 ? "places" : "place"}
                </h2>
                <div className="board-tools">
                  <PlaceSearch
                    disabled={false}
                    compact
                    id="board-place"
                    label=""
                    ariaLabel="Add a place to the comparison"
                    placeholder="Add a place to compare…"
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
                    Clear all
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
                      zMax={zMax}
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
    </div>
  );
}
