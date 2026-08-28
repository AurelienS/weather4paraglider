import { useEffect, useMemo, useRef, useState } from "react";
import { ApiError, fetchArome } from "./api/client";
import type { AromeResponse } from "./api/types";
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
type View = "windgram" | "sondage";

function readPointFromUrl(): Point {
  const q = new URLSearchParams(window.location.search);
  const lat = q.get("lat") == null ? NaN : Number(q.get("lat"));
  const lon = q.get("lon") == null ? NaN : Number(q.get("lon"));
  if (Number.isFinite(lat) && Number.isFinite(lon)) return { lat, lon };
  return { lat: DEMO_POINT.lat, lon: DEMO_POINT.lon };
}

function writePointToUrl(point: Point) {
  const url = new URL(window.location.href);
  url.searchParams.set("lat", String(point.lat));
  url.searchParams.set("lon", String(point.lon));
  window.history.replaceState(null, "", url);
}

export default function App() {
  const [point, setPoint] = useState<Point>(readPointFromUrl);
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
    writePointToUrl({ lat: point.lat, lon: point.lon });

    fetchArome(point.lat, point.lon, { force, signal: ac.signal })
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
          err instanceof ApiError ? err.message : "Impossible de joindre l’API.";
        setError(message);
        setData(null);
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });

    return () => ac.abort();
  }, [point.lat, point.lon, bump]);

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

  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <h1>AROME</h1>
          <p>Windgram 0,025° · T, Td, vent · Météo-France via Open-Meteo</p>
        </div>
        <SiteForm
          lat={point.lat}
          lon={point.lon}
          placeLabel={place}
          loading={loading}
          onSubmit={(lat, lon, label) => {
            setLoading(true);
            setError(null);
            setPlace(label ?? null);
            if (lat === point.lat && lon === point.lon) setBump((n) => n + 1);
            else setPoint({ lat, lon });
          }}
          onRefresh={() => {
            setLoading(true);
            setError(null);
            forceRef.current = true;
            setBump((n) => n + 1);
          }}
        />
      </header>

      {error ? (
        <div className="banner error" role="alert">
          {error}
          <span>
            Appel direct <code>api.open-meteo.com</code> — vérifier la connexion ou
            réessayer.
          </span>
        </div>
      ) : null}

      {loading && !data ? <div className="banner">Extraction du profil…</div> : null}
      {loading && data ? <div className="banner">Mise à jour…</div> : null}

      {data ? (
        <>
          <p className="meta">
            <span>
              {data.lat.toFixed(3)}°N {data.lon.toFixed(3)}°E
            </span>
            <span>
              cellule {data.nearestCell.lat.toFixed(3)}, {data.nearestCell.lon.toFixed(3)}
            </span>
            <span>alt. modèle {data.modelElevationM}&nbsp;m</span>
            <span>
              {data.model} {data.grid}° · {data.openMeteoModel ?? data.source}
            </span>
            <span>cache {utcSlot(data.runInitUtc)} UTC</span>
          </p>

          <div className="toolbar">
            <div className="seg" role="tablist" aria-label="Jour">
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
            <div className="seg" role="tablist" aria-label="Vue">
              <button
                type="button"
                className={view === "windgram" ? "is-on" : undefined}
                onClick={() => setView("windgram")}
              >
                Windgram
              </button>
              <button
                type="button"
                className={view === "sondage" ? "is-on" : undefined}
                onClick={() => setView("sondage")}
              >
                Sondage
              </button>
            </div>
            {view === "windgram" ? (
              <div className="seg" role="tablist" aria-label="Plafond">
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
              <label className="hour-pick">
                Heure
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

          <p className="hint-keys">Grille 250 m AMSL interpolée entre niveaux AROME</p>

          {data.warnings.length > 0 ? (
            <details className="notes">
              <summary>Notes données</summary>
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
