import { useId, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import type { Hour } from "../api/types";
import { clamp, linePath, niceRange, ticks } from "../lib/chart";
import { sampleAt, sampleDir } from "../lib/cursor";
import { compass } from "../lib/format";
import { interpolate, type Dict, type Lang } from "../lib/i18n";
import { smoothPath } from "../lib/meteogram";
import { useI18n } from "../i18nContext";

const VB_W = 920;
const VB_H = 560;
const PAD = { top: 28, right: 20, bottom: 44, left: 56 };
const WIND_W = 200;
const GAP = 28;
const DALR = 9.8;

type Props = {
  hour: Hour;
  elevationM: number;
};

type LevelRead = {
  z: number;
  y: number;
  t: number | null;
  td: number | null;
  wind: number | null;
  dir: number | null;
  rh: number | null;
  cloud: number | null;
};

type HoverBox = LevelRead & { left: number; top: number; flip: boolean };

export function Sounding({ hour, elevationM }: Props) {
  const { t, lang } = useI18n();
  const layout = useMemo(() => buildLayout(hour, elevationM), [hour, elevationM]);
  const uid = useId().replace(/:/g, "");

  const plotRef = useRef<HTMLDivElement>(null);
  const [card, setCard] = useState<HoverBox | null>(null);

  function onMove(e: PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const plot = plotRef.current?.getBoundingClientRect();
    if (!plot || rect.height === 0 || rect.width === 0) return;
    const y = ((e.clientY - rect.top) / rect.height) * VB_H;
    if (y < PAD.top || y > layout.plotBottom) {
      setCard(null);
      return;
    }
    const z = layout.yToZ(y);
    const read = readLevel(hour, z);
    const left = e.clientX - plot.left;
    const top = e.clientY - plot.top;
    const next: HoverBox = { ...read, y, left, top, flip: left > plot.width - 210 };
    setCard((prev) =>
      prev &&
      prev.z === next.z &&
      prev.left === next.left &&
      prev.top === next.top &&
      prev.flip === next.flip
        ? prev
        : next,
    );
  }

  function onLeave() {
    setCard(null);
  }

  return (
    <div className="sounding-frame">
      <div className="sounding-plot" ref={plotRef}>
      <div className="sounding-scroll">
      <svg
        className="sounding"
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        role="img"
        aria-label={t.soundingAria}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
      >
        <defs>
          <clipPath id={`temp-${uid}`}>
            <rect
              x={PAD.left}
              y={PAD.top}
              width={layout.tempRight - PAD.left}
              height={layout.plotH}
            />
          </clipPath>
          <clipPath id={`wind-${uid}`}>
            <rect
              x={layout.windLeft}
              y={PAD.top}
              width={layout.windRight - layout.windLeft}
              height={layout.plotH}
            />
          </clipPath>
        </defs>
        <rect x="0" y="0" width={VB_W} height={VB_H} className="chart-bg" />

        <g className="plot-temp">
          {layout.dalrX != null ? (
            <rect
              x={PAD.left}
              y={PAD.top}
              width={Math.max(0, Math.min(layout.dalrX, layout.tempRight) - PAD.left)}
              height={layout.plotH}
              className="unstable-wash"
            />
          ) : null}
          {layout.zTicks.map((z) => {
            const y = layout.yOf(z);
            return (
              <g key={`z-${z}`}>
                <line x1={PAD.left} y1={y} x2={layout.tempRight} y2={y} className="grid" />
                <text x={PAD.left - 8} y={y + 3} className="tick-y" textAnchor="end">
                  {z}
                </text>
              </g>
            );
          })}
          {layout.thTicks.map((th) => {
            const x = layout.xTh(th);
            return (
              <g key={`th-${th}`}>
                <line x1={x} y1={PAD.top} x2={x} y2={layout.plotBottom} className="grid dalr-grid" />
                <text x={x} y={VB_H - 16} className="tick-x" textAnchor="middle">
                  {th}°
                </text>
              </g>
            );
          })}

          <g clipPath={`url(#temp-${uid})`}>
            {layout.isoPaths.map((iso) => (
              <path
                key={`iso-${iso.t}`}
                d={iso.d}
                className={iso.t === 0 ? "grid iso0" : "grid iso-t"}
              />
            ))}
            {layout.isoLabels.map((l) => (
              <text
                key={`isolab-${l.t}`}
                x={l.x}
                y={l.y}
                className="line-label"
                textAnchor="middle"
                transform={`rotate(${l.angle} ${l.x} ${l.y})`}
              >
                {l.text}
              </text>
            ))}
            <path d={layout.groundPath} className="ground" />
            {layout.cloudBaseY != null ? (
              <line
                x1={PAD.left}
                y1={layout.cloudBaseY}
                x2={layout.tempRight}
                y2={layout.cloudBaseY}
                className="cloud-base"
              />
            ) : null}
            {layout.dalrX != null ? (
              <>
                <line
                  x1={layout.dalrX}
                  y1={PAD.top}
                  x2={layout.dalrX}
                  y2={layout.plotBottom}
                  className="dalr"
                />
                <text
                  x={layout.dalrX + 12}
                  y={layout.plotBottom - 8}
                  className="line-label"
                  textAnchor="start"
                  transform={`rotate(-90 ${layout.dalrX + 12} ${layout.plotBottom - 8})`}
                >
                  {t.dryAdiabat}
                </text>
              </>
            ) : null}
            <path d={layout.tPath} className="curve-t" />
            {layout.tdPath ? <path d={layout.tdPath} className="curve-td" /> : null}
            {layout.tdDots.map((d) => (
              <circle key={`td-${d.z}`} cx={d.x} cy={d.y} r="2.4" className="dot-td" />
            ))}
          </g>
          {layout.cloudBaseY != null ? (
            <text
              x={layout.tempRight - 6}
              y={layout.cloudBaseY - 5}
              className="anno"
              textAnchor="end"
            >
              {interpolate(t.cloudBaseAnno, { m: hour.surface.cloudBaseM ?? 0 })}
            </text>
          ) : null}
          <text x={PAD.left + 6} y={PAD.top + 14} className="anno">
            {t.unstable}
          </text>
          <text x={layout.tempRight - 6} y={PAD.top + 14} className="anno" textAnchor="end">
            {t.stable}
          </text>
          <rect
            x={PAD.left}
            y={PAD.top}
            width={layout.tempRight - PAD.left}
            height={layout.plotH}
            className="plot-frame"
            fill="none"
          />
        </g>

        <g className="plot-wind">
          {layout.zTicks.map((z) => {
            const y = layout.yOf(z);
            return (
              <line
                key={`wz-${z}`}
                x1={layout.windLeft}
                y1={y}
                x2={layout.windRight}
                y2={y}
                className="grid"
              />
            );
          })}
          {layout.wTicks.map((w) => {
            const x = layout.xW(w);
            return (
              <g key={`w-${w}`}>
                <line x1={x} y1={PAD.top} x2={x} y2={layout.plotBottom} className="grid" />
                <text x={x} y={VB_H - 16} className="tick-x" textAnchor="middle">
                  {w}
                </text>
              </g>
            );
          })}
          <g clipPath={`url(#wind-${uid})`}>
            {layout.windPath ? <path d={layout.windPath} className="curve-wind" /> : null}
            {layout.windDots.map((d) => (
              <circle key={`wdot-${d.z}`} cx={d.x} cy={d.y} r="2.2" className="wind-dot" />
            ))}
          </g>
          <rect
            x={layout.windLeft}
            y={PAD.top}
            width={layout.windRight - layout.windLeft}
            height={layout.plotH}
            className="plot-frame"
            fill="none"
          />
        </g>

        {card ? (
          <g className="cursor" pointerEvents="none">
            <line
              x1={PAD.left}
              y1={card.y}
              x2={layout.windRight}
              y2={card.y}
              className="hover-line"
            />
            {card.t != null ? (
              <circle
                cx={layout.xTh(thetaOf(card.t, card.z, elevationM))}
                cy={card.y}
                r="3.5"
                className="cursor-dot t"
              />
            ) : null}
            {card.td != null ? (
              <circle
                cx={layout.xTh(thetaOf(card.td, card.z, elevationM))}
                cy={card.y}
                r="3.2"
                className="cursor-dot td"
              />
            ) : null}
            {card.wind != null ? (
              <circle
                cx={layout.xW(card.wind)}
                cy={card.y}
                r="3.2"
                className="cursor-dot wind"
              />
            ) : null}
          </g>
        ) : null}

        <text x={PAD.left} y={18} className="axis-title">
          {t.axisTemp}
        </text>
        <text x={layout.windLeft} y={18} className="axis-title">
          {t.axisWind}
        </text>
        <text x={PAD.left - 8} y={PAD.top - 8} className="axis-title" textAnchor="end">
          m
        </text>
      </svg>
      </div>
      {card ? (
        <HoverCard read={card} left={card.left} top={card.top} flip={card.flip} t={t} lang={lang} />
      ) : null}
      </div>

      <ul className="legend">
        <li>
          <i className="swatch t" /> {t.legendAirT}
        </li>
        <li>
          <i className="swatch td" /> {t.legendTd}
        </li>
        <li>
          <i className="swatch dalr" /> {t.legendDalr}
        </li>
        <li>{t.legendUnstable}</li>
        <li>
          <i className="swatch wind" /> {t.legendWind}
        </li>
      </ul>
    </div>
  );
}

function HoverCard({
  read,
  left,
  top,
  flip,
  t,
  lang,
}: {
  read: LevelRead;
  left: number;
  top: number;
  flip: boolean;
  t: Dict;
  lang: Lang;
}) {
  const spread = read.t != null && read.td != null ? (read.t - read.td).toFixed(1) : null;
  const style: CSSProperties = { left, top };
  const wind =
    read.wind == null
      ? t.hoverWind
      : `${Math.round(read.wind)} km/h ${compass(read.dir, lang)}`;
  return (
    <div className={flip ? "hover-card is-flip" : "hover-card"} style={style}>
      <strong>{Math.round(read.z)} m</strong>
      <span>
        T {fmt(read.t)} · Td {fmt(read.td)}
        {spread ? ` · ${interpolate(t.hintSpread, { x: spread })}` : ""}
      </span>
      <span>
        {wind}
        {read.rh != null ? ` · RH ${Math.round(read.rh)}%` : ""}
        {read.cloud != null ? ` · ${interpolate(t.hoverCloud, { n: Math.round(read.cloud) })}` : ""}
      </span>
    </div>
  );
}

function readLevel(hour: Hour, z: number): LevelRead {
  const pts = hour.profile;
  const at = (pick: (p: (typeof pts)[number]) => number | null) =>
    pts.map((p) => ({ at: p.z, value: pick(p) }));
  return {
    z,
    y: 0,
    t: sampleAt(at((p) => p.t), z),
    td: sampleAt(at((p) => p.td), z),
    wind: sampleAt(at((p) => p.wind), z),
    dir: sampleDir(at((p) => p.dir), z),
    rh: sampleAt(at((p) => p.rh), z),
    cloud: sampleAt(at((p) => p.cloud), z),
  };
}

function fmt(v: number | null): string {
  return v == null ? "—" : `${v.toFixed(1)}°`;
}

function thetaOf(t: number, z: number, zRef: number): number {
  return t + (DALR * (z - zRef)) / 1000;
}

function buildLayout(hour: Hour, elevationM: number) {
  const profile = hour.profile;
  const zRef = elevationM;
  const zs = profile.map((p) => p.z);
  const winds = profile.map((p) => p.wind).filter((v): v is number => v != null);
  const zLo = Math.min(elevationM, ...(zs.length ? zs : [elevationM]), 0);
  const zHi = Math.max(...(zs.length ? zs : [elevationM]), elevationM + 500, 3000);
  const [zMin, zMax] = niceRange(zLo - 80, zHi + 80, 500);

  const t0 = profile[0]?.t;
  const z0 = profile[0]?.z ?? zRef;
  // Dry adiabat of the surface air (the 2 m temperature, placed at the first
  // profile level). "Left of the line" stays that dry-parcel check. The
  // windgram tint uses the mixed-layer virtual parcel, so a superadiabatic
  // skin can leave this line a little to the right of the tinted top.
  const tSurface = hour.surface.t2m ?? t0;
  const thCenter = tSurface != null ? thetaOf(tSurface, z0, zRef) : 15;
  const tThetas = profile
    .filter((p) => p.t != null)
    .map((p) => thetaOf(p.t as number, p.z, zRef));
  const tdThetas = profile
    .filter((p) => p.td != null)
    .map((p) => thetaOf(p.td as number, p.z, zRef));
  let span = 10;
  for (const th of tThetas) span = Math.max(span, Math.abs(th - thCenter));
  span = Math.ceil((span + 4) / 5) * 5;
  let thMin = thCenter - span;
  let thMax = thCenter + span;
  if (tdThetas.length > 0) {
    const tdMin = Math.min(...tdThetas);
    if (tdMin < thMin + 2) thMin = tdMin - 3;
  }
  [thMin, thMax] = niceRange(thMin, thMax, 5);

  const wMaxRaw = Math.max(40, ...winds, 0);
  const [, wMax] = niceRange(0, wMaxRaw, 20);

  const plotBottom = VB_H - PAD.bottom;
  const plotH = plotBottom - PAD.top;
  const tempRight = VB_W - PAD.right - WIND_W - GAP;
  const tempW = tempRight - PAD.left;
  const windLeft = tempRight + GAP;
  const windRight = VB_W - PAD.right;
  const windPlotW = windRight - windLeft;

  const yOf = (z: number) => PAD.top + ((zMax - z) / (zMax - zMin)) * plotH;
  const yToZ = (y: number) => zMax - ((clamp(y, PAD.top, plotBottom) - PAD.top) / plotH) * (zMax - zMin);
  const xTh = (th: number) => PAD.left + ((th - thMin) / (thMax - thMin)) * tempW;
  const xW = (w: number) => windLeft + (clamp(w, 0, wMax) / (wMax || 1)) * windPlotW;

  const tPts = profile
    .filter((p) => p.t != null)
    .map((p) => ({ x: xTh(thetaOf(p.t as number, p.z, zRef)), y: yOf(p.z) }));
  const tdPts = profile
    .filter((p) => p.td != null)
    .map((p) => ({ x: xTh(thetaOf(p.td as number, p.z, zRef)), y: yOf(p.z), z: p.z }));

  const windPts = profile
    .filter((p) => p.wind != null)
    .map((p) => ({ x: xW(p.wind as number), y: yOf(p.z), z: p.z }));

  const dalrX = t0 != null ? xTh(thCenter) : null;

  const isoTemps = ticks(-20, 40, 10);
  const isoPaths = isoTemps.map((t) => {
    const a = { x: xTh(thetaOf(t, zMin, zRef)), y: yOf(zMin) };
    const b = { x: xTh(thetaOf(t, zMax, zRef)), y: yOf(zMax) };
    return { t, d: linePath([a, b]), a, b };
  });
  const isoLabels = isoPaths
    .map(({ t, a, b }) => {
      const angle = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
      // keep the label inside the plot: when the line exits through the right
      // edge, stop shortly before the crossing point
      const pEdge = b.x > a.x ? Math.min(1, (tempRight - a.x) / (b.x - a.x)) : 1;
      const p = Math.min(0.8, pEdge * 0.85);
      const x = a.x + (b.x - a.x) * p;
      const y = a.y + (b.y - a.y) * p;
      return { t, x, y, angle, text: t === 0 ? "0 °C" : `${t}°` };
    })
    .filter((l) => l.x > PAD.left + 16 && l.x < tempRight - 16);

  const gy = yOf(elevationM);
  const groundPath = `M${PAD.left},${plotBottom} L${PAD.left},${gy} L${tempRight},${gy} L${tempRight},${plotBottom} Z`;

  return {
    plotH,
    plotBottom,
    tempRight,
    windLeft,
    windRight,
    yOf,
    yToZ,
    xTh,
    xW,
    zTicks: ticks(zMin, zMax, 500),
    thTicks: ticks(thMin, thMax, 5),
    wTicks: ticks(0, wMax, 20),
    tPath: tPts.length >= 2 ? smoothPath(tPts) : linePath(tPts),
    tdPath: tdPts.length >= 2 ? smoothPath(tdPts) : "",
    tdDots: tdPts,
    windPath: windPts.length >= 2 ? smoothPath(windPts) : "",
    windDots: windPts,
    dalrX,
    isoPaths,
    isoLabels,
    groundPath,
    cloudBaseY: hour.surface.cloudBaseM != null ? yOf(hour.surface.cloudBaseM) : null,
  };
}
