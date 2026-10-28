import { useId, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import type { Hour } from "../api/types";
import { sampleAt, sampleDir } from "../lib/cursor";
import { compass, hourOfDay } from "../lib/format";
import { type Dict, type Lang } from "../lib/i18n";
import { useI18n } from "../i18nContext";
import { useStore } from "../stores";
import {
  cblSeries,
  cloudBands,
  cloudShadeStops,
  METEO_Z_MAX_M,
  meteoHourTicks,
  PRECIP_SCALE_MM,
  smoothClosedPath,
  smoothPath,
  spreadLabels,
  tempRange,
  windMax,
  type CloudBand,
  type XY,
} from "../lib/meteogram";

type Props = {
  /** The 24 h of the selected day (00:00–23:00 Paris), sorted by time. */
  hours: Hour[];
  elevationM: number;
  compact: boolean;
};

// viewBox geometry: ONE shared plot with a single altitude axis — 0 m sits
// on the chart's bottom line, the same line the rain bars stand on.
// Clouds and the convective layer use the real altitude
// scale; temperature and wind are curves with their values riding them.
const VB_W = 768;
const PAD_L = 46;
// wide right margin: the curve names sit outside the plot, level with the
// last point of their curve (the convective layer may end well before)
const PAD_R = 92;
const PLOT_W = VB_W - PAD_L - PAD_R;
const SLOT_W = PLOT_W / 24;

const PLOT_Y = 12;
// Tall enough that a 0–10 km axis is not crushed into the old 5 km frame.
const PLOT_H = 280;
const PLOT_B = PLOT_Y + PLOT_H; // the 0 line: ground, wind 0, rain 0
const TIME_Y = PLOT_B + 18;
const VB_H = TIME_Y + 14;

// wind and gust share the bottom 45% of the plot, temperature lives at 30–62% height
const WIND_SPAN = PLOT_H * 0.45;
const TEMP_TOP = PLOT_Y + PLOT_H * 0.3;
const TEMP_BOT = PLOT_Y + PLOT_H * 0.62;

const xOf = (hour: number) => PAD_L + (hour + 0.5) * SLOT_W;

/**
 * meteoblue-style compact meteogram: one shared plot, one altitude axis.
 * Rain bars stand on the 0 m bottom line. Wind and gust are lines on that
 * same scale. Gray decks and the yellow convective-top line sit at their
 * real altitude. Every curve carries its name and its values, written in
 * the curve's own color. All panels share the 00:00–24:00 axis of the day.
 */
type MeteoCursor = { x: number; hour: number; left: number; top: number; flip: boolean };

export function Meteogram({ hours, elevationM, compact }: Props) {
  const { t, lang } = useI18n();
  const tone = useStore((s) => s.theme);
  const uid = useId().replace(/:/g, "");
  const plotRef = useRef<HTMLDivElement>(null);
  const [cursor, setCursor] = useState<MeteoCursor | null>(null);

  function onMove(e: PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const plot = plotRef.current?.getBoundingClientRect();
    if (!plot || rect.width === 0) return;
    const x = ((e.clientX - rect.left) / rect.width) * VB_W;
    if (x < PAD_L || x > PAD_L + PLOT_W) {
      setCursor(null);
      return;
    }
    const left = e.clientX - plot.left;
    const top = e.clientY - plot.top;
    setCursor({
      x,
      hour: (x - PAD_L) / SLOT_W - 0.5,
      left,
      top,
      flip: left > plot.width - 220,
    });
  }

  const mMax = METEO_Z_MAX_M;

  const bands = useMemo(() => cloudBands(hours, elevationM), [hours, elevationM]);
  const tR = useMemo(() => tempRange(hours), [hours]);
  const wMax = useMemo(() => windMax(hours), [hours]);
  const cbl = useMemo(() => cblSeries(hours, elevationM), [hours, elevationM]);
  const ticks = useMemo(() => meteoHourTicks(compact ? 3 : 2), [compact]);
  const labelEvery = compact ? 3 : 2;

  const mToY = (m: number) => PLOT_B - (m / mMax) * PLOT_H;
  const tToY = (v: number) =>
    TEMP_BOT - ((v - tR.min) / (tR.max - tR.min)) * (TEMP_BOT - TEMP_TOP);
  const wToY = (v: number) => PLOT_B - (v / wMax) * WIND_SPAN;
  // rain bars share one fixed scale across every meteogram: 10 mm reaches
  // half the plot height, heavier hours saturate (the label keeps the value)
  const pToH = (mm: number) => Math.min(1, mm / PRECIP_SCALE_MM) * (PLOT_H * 0.5);

  // series as points (hours with data only), for polylines and label anchors
  const tempPts = hours
    .filter((h) => h.surface.t2m != null)
    .map((h) => ({ x: xOf(hourOfDay(h.time)), y: tToY(h.surface.t2m!) }));
  const windPts = hours
    .filter((h) => h.surface.wind10 != null)
    .map((h) => ({ x: xOf(hourOfDay(h.time)), y: wToY(h.surface.wind10!) }));
  const gustPts = hours
    .filter((h) => h.surface.gust10 != null)
    .map((h) => ({ x: xOf(hourOfDay(h.time)), y: wToY(h.surface.gust10!) }));
  const cblPts = cbl.map((p) => ({ x: xOf(p.hour), y: mToY(p.zM) }));

  const curve = (pts: XY[]) => (pts.length >= 2 ? smoothPath(pts) : "");
  // Soft closed outline. A single hour is a rounded slot; a run covers every
  // hour, including the half slot outside the first and last centres.
  const outlineOf = (band: CloudBand): XY[] => {
    const yOf = (m: number) => mToY(m);
    const first = band[0]!;
    const last = band[band.length - 1]!;
    if (band.length === 1) {
      const x = xOf(first.hour);
      const half = SLOT_W / 2;
      return [
        { x: x - half, y: yOf(first.baseM) },
        { x: x + half, y: yOf(first.baseM) },
        { x: x + half, y: yOf(first.topM) },
        { x: x - half, y: yOf(first.topM) },
      ];
    }
    const x0 = xOf(first.hour) - SLOT_W / 2;
    const xN = xOf(last.hour) + SLOT_W / 2;
    return [
      { x: x0, y: yOf(first.baseM) },
      ...band.map((p) => ({ x: xOf(p.hour), y: yOf(p.baseM) })),
      { x: xN, y: yOf(last.baseM) },
      { x: xN, y: yOf(last.topM) },
      ...[...band].reverse().map((p) => ({ x: xOf(p.hour), y: yOf(p.topM) })),
      { x: x0, y: yOf(first.topM) },
    ];
  };

  const rainBars = hours
    .filter((h) => (h.surface.precip ?? 0) > 0)
    .map((h) => ({
      hour: hourOfDay(h.time),
      mm: h.surface.precip!,
      top: PLOT_B - pToH(h.surface.precip!),
    }));

  const series = (pick: (h: Hour) => number | null) =>
    hours.map((h) => ({ at: hourOfDay(h.time), value: pick(h) }));
  const tNow = cursor ? sampleAt(series((h) => h.surface.t2m), cursor.hour) : null;
  const windNow = cursor ? sampleAt(series((h) => h.surface.wind10), cursor.hour) : null;
  const dirNow = cursor ? sampleDir(series((h) => h.surface.dir10), cursor.hour) : null;
  const gustNow = cursor ? sampleAt(series((h) => h.surface.gust10), cursor.hour) : null;
  const cloudNow = cursor
    ? {
        low: sampleAt(series((h) => h.surface.cloudLow), cursor.hour),
        mid: sampleAt(series((h) => h.surface.cloudMid), cursor.hour),
        high: sampleAt(series((h) => h.surface.cloudHigh), cursor.hour),
      }
    : null;
  const cblNow = cursor
    ? sampleAt(
        cbl.map((p) => ({ at: p.hour, value: p.zM })),
        cursor.hour,
        false,
      )
    : null;
  const precipHour = cursor ? Math.round(Math.min(23, Math.max(0, cursor.hour))) : null;
  const precip =
    precipHour == null
      ? null
      : (hours.find((h) => hourOfDay(h.time) === precipHour)?.surface.precip ?? null);

  return (
    <figure className="sheet meteo">
      <div className="meteo-plot" ref={plotRef}>
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        role="img"
        aria-label={t.viewMeteogram}
        className="meteo-svg"
        onPointerMove={onMove}
        onPointerLeave={() => setCursor(null)}
      >
        <defs>
          <clipPath id={`meteo-plot-${uid}`}>
            <rect x={PAD_L} y={PLOT_Y} width={PLOT_W} height={PLOT_H} />
          </clipPath>
          {bands.map((band, i) => {
            const x0 = xOf(band[0]!.hour) - SLOT_W / 2;
            const x1 = xOf(band[band.length - 1]!.hour) + SLOT_W / 2;
            const span = Math.max(x1 - x0, 1);
            return (
              <linearGradient
                key={`shade-${i}`}
                id={`cloud-shade-${uid}-${i}`}
                className="meteo-cloud-shade"
                x1={x0}
                x2={x1}
                y1="0"
                y2="0"
                gradientUnits="userSpaceOnUse"
              >
                {cloudShadeStops(
                  band.map((p) => ({ x: xOf(p.hour), cover: p.cover })),
                  x0,
                  span,
                  tone,
                ).map((stop, j) => (
                  <stop
                    key={j}
                    offset={stop.offset}
                    stopColor={stop.color}
                    stopOpacity={1}
                  />
                ))}
              </linearGradient>
            );
          })}
        </defs>
        <rect x="0" y="0" width={VB_W} height={VB_H} className="meteo-bg" />

        {/* hour grid + time labels */}
        {ticks.map((h) => (
          <g key={h}>
            <line
              x1={xOf(h)}
              x2={xOf(h)}
              y1={PLOT_Y}
              y2={TIME_Y - 4}
              className="meteo-grid"
            />
            <text x={xOf(h)} y={TIME_Y + 9} className="meteo-t">
              {String(h).padStart(2, "0")}
            </text>
          </g>
        ))}

        {[mMax / 2, mMax].map((m) => (
          <line
            key={`h-${m}`}
            x1={PAD_L}
            x2={PAD_L + PLOT_W}
            y1={mToY(m)}
            y2={mToY(m)}
            className="meteo-grid"
          />
        ))}
        <rect
          x={PAD_L}
          y={PLOT_Y}
          width={PLOT_W}
          height={PLOT_H}
          className="meteo-frame"
          fill="none"
        />

        <g clipPath={`url(#meteo-plot-${uid})`}>
          {/* One soft shape per continuous layer. The gray eases from hour
              to hour: pale when thin, dark when overcast. */}
          {bands.map((band, i) => {
            const d = smoothClosedPath(outlineOf(band));
            if (!d) return null;
            return (
              <path
                key={i}
                d={d}
                className="meteo-cloud"
                style={{ fill: `url(#cloud-shade-${uid}-${i})` }}
              />
            );
          })}

          {/* A hairline every 1000 m, over the clouds and under the curves. */}
          {Array.from({ length: 9 }, (_, i) => (i + 1) * 1000)
            .filter((m) => m !== mMax / 2)
            .map((m) => (
              <line
                key={`km-${m}`}
                x1={PAD_L}
                x2={PAD_L + PLOT_W}
                y1={mToY(m)}
                y2={mToY(m)}
                className="meteo-grid-minor"
              />
            ))}

          {curve(windPts) ? <path d={curve(windPts)} className="meteo-wind" /> : null}
          {curve(gustPts) ? <path d={curve(gustPts)} className="meteo-gust" /> : null}

          {/* rain: slim bars standing on the 0 line */}
          {rainBars.map((b) => (
            <rect
              key={b.hour}
              x={xOf(b.hour) - SLOT_W * 0.25}
              y={PLOT_B - pToH(b.mm)}
              width={SLOT_W * 0.5}
              height={pToH(b.mm)}
              className="meteo-precip"
              rx={1.2}
            />
          ))}

          {curve(tempPts) ? <path d={curve(tempPts)} className="meteo-temp-glow" /> : null}
          {curve(tempPts) ? <path d={curve(tempPts)} className="meteo-temp" /> : null}

          {/* the convective layer top, at its real altitude */}
          {curve(cblPts) ? <path d={curve(cblPts)} className="meteo-cbl" /> : null}
        </g>

        {/* the shared 0 line: ground level, wind 0, rain 0 */}
        <line
          x1={PAD_L}
          x2={PAD_L + PLOT_W}
          y1={PLOT_B}
          y2={PLOT_B}
          className="meteo-baseline"
        />

        {/* altitude axis (left, ticks): kept for clouds + convective layer;
            the right margin belongs to the curve names */}
        {[0, mMax / 2, mMax].map((m) => (
          <text
            key={m}
            x={PAD_L - 6}
            y={m === mMax ? mToY(m) + 12 : mToY(m) + 3.5}
            className="meteo-tx meteo-tx-l"
          >
            {Math.round(m)}
          </text>
        ))}
        {Array.from({ length: 9 }, (_, i) => (i + 1) * 1000)
          .filter((m) => m !== mMax / 2)
          .map((m) => (
            <text
              key={`km-tx-${m}`}
              x={PAD_L - 6}
              y={mToY(m) + 2.8}
              className="meteo-tx-minor meteo-tx-l"
            >
              {m}
            </text>
          ))}
        <text x={PAD_L - 6} y={PLOT_Y - 3} className="meteo-unit meteo-tx-l">
          m
        </text>

        {/* rain values just above each bar, in the rain color */}
        {rainBars.map((b) =>
          b.mm >= 0.1 ? (
            <text
              key={b.hour}
              x={xOf(b.hour)}
              y={b.top - 3}
              className="meteo-val meteo-val-r"
            >
              {b.mm.toFixed(1)}
            </text>
          ) : null,
        )}

        {/* temperature values riding the curve, with the unit, in the
            temp color */}
        {hours.map((h, i) =>
          h.surface.t2m != null && i % labelEvery === 0 ? (
            <text
              key={h.time}
              x={xOf(hourOfDay(h.time))}
              y={tToY(h.surface.t2m) - 4}
              className="meteo-val meteo-val-t"
            >
              {Math.round(h.surface.t2m)}°
            </text>
          ) : null,
        )}

        {/* gust values above the gust line, in the gust color */}
        {hours.map((h, i) =>
          h.surface.gust10 != null && i % labelEvery === 1 ? (
            <text
              key={h.time}
              x={xOf(hourOfDay(h.time))}
              y={wToY(h.surface.gust10) - 4}
              className="meteo-val meteo-val-g"
            >
              {h.surface.gust10}
            </text>
          ) : null,
        )}

        {/* wind values under the wind line, in the wind color */}
        {hours.map((h, i) =>
          h.surface.wind10 != null && i % labelEvery === 0 ? (
            <text
              key={h.time}
              x={xOf(hourOfDay(h.time))}
              y={wToY(h.surface.wind10) + 11}
              className="meteo-val meteo-val-w"
            >
              {h.surface.wind10}
            </text>
          ) : null,
        )}

        {/* Direction on the wind line: one open ink chevron per hour, no text. */}
        {hours.map((h) => {
          if (h.surface.dir10 == null || h.surface.wind10 == null) return null;
          const cx = xOf(hourOfDay(h.time));
          const cy = wToY(h.surface.wind10);
          if (h.surface.wind10 < 1.5) {
            return <circle key={h.time} cx={cx} cy={cy} r={1.8} className="meteo-calm" />;
          }
          return (
            <g
              key={h.time}
              transform={`translate(${cx} ${cy}) rotate(${h.surface.dir10 + 180})`}
              className="meteo-arrow"
            >
              <line x1="0" y1="6.6" x2="0" y2="-1.2" />
              <polyline points="-2.7,-1.45 0,-8.1 2.7,-1.45" />
            </g>
          );
        })}

        {/* ── curve names: to the right of the plot, level with the last
              point of their curve (the convective layer may end early);
              a spread pass keeps them readable, never overlapping ── */}
        {(() => {
          const rx = PAD_L + PLOT_W + 6;
          const wants: Array<{ key: string; y: number; text: string; cls: string }> = [];
          if (cblPts.length > 0) {
            wants.push({ key: "cbl", y: cblPts[cblPts.length - 1]!.y + 3, text: t.meteoLblCbl, cls: "meteo-lbl-cbl" });
          }
          if (windPts.length > 0) {
            wants.push({ key: "wind", y: windPts[windPts.length - 1]!.y + 3, text: t.meteoLblWind, cls: "meteo-lbl-wind" });
          }
          if (gustPts.length > 0) {
            wants.push({ key: "gust", y: gustPts[gustPts.length - 1]!.y + 3, text: t.meteoLblGust, cls: "meteo-lbl-gust" });
          }
          const ys = spreadLabels(
            wants.map(({ key, y }) => ({ key, y })),
            PLOT_Y + 10,
            PLOT_B,
          );
          return wants.map((n) => (
            <text key={n.key} x={rx} y={ys[n.key]} className={`meteo-lbl ${n.cls}`}>
              {n.text}
            </text>
          ));
        })()}

        {cursor ? (
          <g className="cursor" pointerEvents="none">
            <line
              x1={cursor.x}
              x2={cursor.x}
              y1={PLOT_Y}
              y2={PLOT_B}
              className="hover-line"
            />
            {tNow != null ? (
              <circle cx={cursor.x} cy={tToY(tNow)} r="3.4" className="cursor-dot t" />
            ) : null}
            {windNow != null ? (
              <circle cx={cursor.x} cy={wToY(windNow)} r="3.1" className="cursor-dot wind" />
            ) : null}
            {gustNow != null ? (
              <circle cx={cursor.x} cy={wToY(gustNow)} r="3.1" className="cursor-dot gust" />
            ) : null}
            {cblNow != null ? (
              <circle cx={cursor.x} cy={mToY(cblNow)} r="3.2" className="cursor-dot cbl" />
            ) : null}
          </g>
        ) : null}
      </svg>
      {cursor ? (
        <MeteoCard
          hour={cursor.hour}
          t2m={tNow}
          wind={windNow}
          dir={dirNow}
          gust={gustNow}
          precip={precip}
          cloud={cloudNow}
          cbl={cblNow}
          left={cursor.left}
          top={cursor.top}
          flip={cursor.flip}
          t={t}
          lang={lang}
        />
      ) : null}
      </div>
    </figure>
  );
}

function MeteoCard({
  hour,
  t2m,
  wind,
  dir,
  gust,
  precip,
  cloud,
  cbl,
  left,
  top,
  flip,
  t,
  lang,
}: {
  hour: number;
  t2m: number | null;
  wind: number | null;
  dir: number | null;
  gust: number | null;
  precip: number | null;
  cloud: { low: number | null; mid: number | null; high: number | null } | null;
  cbl: number | null;
  left: number;
  top: number;
  flip: boolean;
  t: Dict;
  lang: Lang;
}) {
  const style: CSSProperties = { left, top };
  const windTxt =
    wind == null ? t.hoverWind : `${Math.round(wind)} km/h ${compass(dir, lang)}`;
  const clouds =
    cloud == null
      ? ""
      : `${Math.round(cloud.low ?? 0)} / ${Math.round(cloud.mid ?? 0)} / ${Math.round(cloud.high ?? 0)}`;
  return (
    <div className={flip ? "hover-card is-flip" : "hover-card"} style={style}>
      <strong>{clockLabel(hour)}</strong>
      <span>
        T {t2m == null ? "—" : `${t2m.toFixed(1)}°`}
      </span>
      <span>
        {windTxt}
        {gust != null ? ` · ${t.meteoLblGust} ${Math.round(gust)}` : ""}
      </span>
      <span>
        {t.statPrecip} {precip == null ? "—" : `${precip.toFixed(1)} mm`}
        {clouds ? ` · ${t.statCloudCover} ${clouds}` : ""}
      </span>
      {cbl != null ? (
        <span>
          {t.meteoLblCbl} {Math.round(cbl)} m
        </span>
      ) : null}
    </div>
  );
}

function clockLabel(hour: number): string {
  const clamped = Math.min(23.983, Math.max(0, hour));
  let h = Math.floor(clamped);
  let m = Math.round((clamped - h) * 60);
  if (m === 60) {
    h += 1;
    m = 0;
  }
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
