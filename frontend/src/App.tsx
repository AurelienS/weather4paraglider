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

type Point = { lat: number; lon: number };
type View = "windgram" | "sounding";

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

function writeStateToUrl(point: Point, modelId: ModelId) {
  const url = new URL(window.location.href);
  url.searchParams.set("lat", String(point.lat));
  url.searchParams.set("lon", String(point.lon));
  url.searchParams.set("model", modelId);
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

  useEffect(() => {
    const ac = new AbortController();
    const force = forceRef.current;
    forceRef.current = false;
    writeStateToUrl({ lat: point.lat, lon: point.lon }, modelId);

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
    setBump((n) => n + 1);
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
          placeLabel={place}
          loading={loading}
          onSubmit={(lat, lon, label) => {
            setLoading(true);
            setError(null);
            setPlace(label ?? null);
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

      {data ? (
        <>
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

          {view === "windgram" ? (
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
          ) : null}

          <p className="hint-keys">250 m AMSL grid interpolated between model levels</p>

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

          <footer className="foot">{data.attribution}</footer>
        </>
      ) : null}
    </div>
  );
}
