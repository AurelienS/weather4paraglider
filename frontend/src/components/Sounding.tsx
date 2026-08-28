import { useId, useMemo, type MouseEvent } from "react";
import type { Hour, ProfilePoint } from "../api/types";
import { clamp, linePath, niceRange, ticks } from "../lib/chart";
import { compass, srcLabel } from "../lib/format";

const VB_W = 920;
const VB_H = 560;
const PAD = { top: 28, right: 20, bottom: 44, left: 56 };
const WIND_W = 200;
const GAP = 28;
const DALR = 9.8;

type Props = {
  hour: Hour;
  elevationM: number;
  activeZ: number | null;
  onActiveZ: (z: number | null) => void;
};

export function Sounding({ hour, elevationM, activeZ, onActiveZ }: Props) {
  const layout = useMemo(() => buildLayout(hour, elevationM), [hour, elevationM]);
  const uid = useId().replace(/:/g, "");

  function onMove(e: MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = ((e.clientY - rect.top) / rect.height) * VB_H;
    const z = layout.yToZ(y);
    const nearest = nearestPoint(hour.profile, z);
    onActiveZ(nearest?.z ?? null);
  }

  const hover = hour.profile.find((p) => p.z === activeZ) ?? null;
  const hy = hover ? layout.yOf(hover.z) : null;

  return (
    <div className="sounding-wrap">
      <svg
        className="sounding"
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        role="img"
        aria-label="Sounding: T, Td and wind. Vertical axis = dry adiabat."
        onMouseMove={onMove}
        onMouseLeave={() => onActiveZ(null)}
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
              <line
                x1={layout.dalrX}
                y1={PAD.top}
                x2={layout.dalrX}
                y2={layout.plotBottom}
                className="dalr"
              />
            ) : null}
            <path d={layout.tPath} className="curve-t" />
            {layout.tdPath ? <path d={layout.tdPath} className="curve-td" /> : null}
            {layout.tdDots.map((d) => (
              <circle key={`td-${d.z}`} cx={d.x} cy={d.y} r="2.4" className="dot-td" />
            ))}
          </g>
          {layout.cloudBaseY != null ? (
            <text x={layout.tempRight - 6} y={layout.cloudBaseY - 5} className="anno" textAnchor="end">
              base {hour.surface.cloudBaseM} m
            </text>
          ) : null}
          <text x={PAD.left + 6} y={PAD.top + 14} className="anno">
            ← unstable
          </text>
          <text x={layout.tempRight - 6} y={PAD.top + 14} className="anno" textAnchor="end">
            stable →
          </text>
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
              <circle
                key={`wdot-${d.z}`}
                cx={d.x}
                cy={d.y}
                r={d.z === activeZ ? 3.2 : 2.2}
                className="wind-dot"
              />
            ))}
          </g>
        </g>

        {hy != null ? (
          <line x1={PAD.left} y1={hy} x2={layout.windRight} y2={hy} className="hover-line" />
        ) : null}

        <text x={PAD.left} y={18} className="axis-title">
          T / Td · vertical = γd 9.8 K/km
        </text>
        <text x={layout.windLeft} y={18} className="axis-title">
          Wind (km/h)
        </text>
        <text x={PAD.left - 8} y={PAD.top - 8} className="axis-title" textAnchor="end">
          m
        </text>
      </svg>

      {hover ? <HoverCard point={hover} x={layout.tempRight} y={layout.yOf(hover.z)} /> : null}

      <ul className="legend">
        <li>
          <i className="swatch t" /> air T
        </li>
        <li>
          <i className="swatch td" /> Td
        </li>
        <li>
          <i className="swatch dalr" /> dry adiabat (vertical)
        </li>
        <li>leaning left = unstable</li>
        <li>
          <i className="swatch wind" /> wind
        </li>
      </ul>
    </div>
  );
}

function HoverCard({ point, x, y }: { point: ProfilePoint; x: number; y: number }) {
  const spread = point.t != null && point.td != null ? (point.t - point.td).toFixed(1) : null;
  return (
    <div
      className="hover-card"
      style={{
        left: `${(x / VB_W) * 100}%`,
        top: `${(y / VB_H) * 100}%`,
      }}
    >
      <strong>
        {point.z} m · {srcLabel(point.src)}
      </strong>
      <span>
        T {fmt(point.t)} · Td {fmt(point.td)}
        {spread ? ` · T−Td ${spread} K` : ""}
      </span>
      <span>
        {point.wind == null ? "wind —" : `${point.wind} km/h ${compass(point.dir)}`}
        {point.rh != null ? ` · RH ${point.rh}%` : ""}
        {point.cloud != null ? ` · cloud ${point.cloud}%` : ""}
      </span>
    </div>
  );
}

function fmt(v: number | null): string {
  return v == null ? "—" : `${v.toFixed(1)}°`;
}

function nearestPoint(profile: ProfilePoint[], z: number): ProfilePoint | null {
  let best: ProfilePoint | null = null;
  let bestD = Infinity;
  for (const p of profile) {
    const d = Math.abs(p.z - z);
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return best;
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
  const thCenter = t0 != null ? thetaOf(t0, z0, zRef) : 15;
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
    return { t, d: linePath([a, b]) };
  });

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
    tPath: linePath(tPts),
    tdPath: tdPts.length >= 2 ? linePath(tdPts) : "",
    tdDots: tdPts,
    windPath: windPts.length >= 2 ? linePath(windPts) : "",
    windDots: windPts,
    dalrX,
    isoPaths,
    groundPath,
    cloudBaseY: hour.surface.cloudBaseM != null ? yOf(hour.surface.cloudBaseM) : null,
  };
}
