import type { Hour } from "../api/types";
import { dayKey, hourOfDay } from "./format";
import { ALT_STEP_M, CLOUD_VEIL_PCT, convectiveTop, sampleCell, type ChartTone } from "./windgram";

/**
 * Pure helpers for the meteogram view: a meteoblue-style stacked chart of
 * surface weather (clouds + precip, temperature, wind) over a full 24 h day.
 * All geometry math lives here so it can be unit tested; the SVG assembly
 * stays in components/Meteogram.tsx.
 */

/** Hours of one day (00:00–23:00 Paris wall clock), sorted by time. */
export function meteoHoursForDay(hours: Hour[], day: string): Hour[] {
  return hours
    .filter((h) => dayKey(h.time) === day)
    .sort((a, b) => a.time.localeCompare(b.time));
}

/** Round a value up to the next multiple of step (axis maximums). */
export function niceCeil(v: number, step: number): number {
  return Math.ceil(v / step) * step;
}

/** °C window for the temperature curve, padded. Dew point is not on this chart. */
export function tempRange(hours: Hour[]): { min: number; max: number } {
  const values = hours.flatMap((h) =>
    [h.surface.t2m].filter((v): v is number => v != null),
  );
  if (values.length === 0) return { min: 0, max: 20 };
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  return { min: Math.floor(lo) - 1, max: Math.ceil(hi) + 1 };
}

/** km/h maximum for the wind panel, rounded up to a multiple of 10. */
export function windMax(hours: Hour[]): number {
  const values = hours.flatMap((h) =>
    [h.surface.wind10, h.surface.gust10].filter((v): v is number => v != null),
  );
  return niceCeil(Math.max(10, ...values), 10);
}

/** mm at which a rain bar reaches its full height — SHARED by every
 * meteogram so bars are comparable between models (1.2 mm must not look
 * like 10 mm). Heavier hours saturate; the value label keeps the amount. */
export const PRECIP_SCALE_MM = 10;

/** The meteogram altitude axis always runs to 10 km. */
export const METEO_Z_MAX_M = 10_000;

/**
 * A cloudy slice at the same altitudes the windgram veils. `cover` is the
 * strongest sample inside the slice.
 */
export type CloudDeck = { baseM: number; topM: number; cover: number };

/** One continuous cloud, hour by hour, at the altitude it actually occupies. */
export type CloudBandPoint = { hour: number; baseM: number; topM: number; cover: number };
export type CloudBand = CloudBandPoint[];

/** A deck may step one windgram row between hours and stay the same cloud. */
const BAND_GAP_M = 300;

/**
 * 0 at the veil (10 %), 1 when overcast. The middle of the scale is lifted
 * so a modest change in cover moves the gray more than a straight line would.
 */
export function cloudShade(cover: number): number {
  const t = Math.min(1, Math.max(0, (cover - CLOUD_VEIL_PCT) / (100 - CLOUD_VEIL_PCT)));
  return Math.round(t ** 0.7 * 100) / 100;
}

type RGB = [number, number, number];
/** Cream paper: a cool pale veil through to charcoal. */
const LIGHT_CLOUD: readonly [RGB, RGB] = [
  [214, 218, 224],
  [32, 38, 48],
];
/** Dark paper: a dim lift through to a near-white cloud. */
const DARK_CLOUD: readonly [RGB, RGB] = [
  [72, 80, 90],
  [236, 240, 245],
];

function cloudRgb(cover: number, tone: ChartTone): RGB {
  const t = cloudShade(cover);
  const [from, to] = tone === "dark" ? DARK_CLOUD : LIGHT_CLOUD;
  return from.map((channel, i) => Math.round(channel + ((to[i] ?? channel) - channel) * t)) as RGB;
}

/** Gray of a cloud slice. Thin cover stays pale, overcast goes dense. */
export function cloudGray(cover: number, tone: ChartTone = "light"): string {
  const [r, g, b] = cloudRgb(cover, tone);
  return `rgb(${r}, ${g}, ${b})`;
}

export type ShadeStop = { offset: number; color: string };

/** Samples of the ease between two hours. SVG blends linearly between
 * stops, so the curve has to be drawn as several short steps. */
const BLEND_STEPS = 4;

function smoothstep(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

function mixRgb(a: RGB, b: RGB, t: number): RGB {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

/**
 * Gray along one cloud, in gradient space. Each hour keeps its own gray at
 * its centre. Between two hours the gray eases across the whole gap, slowly
 * at first, so the change is not a flat hold followed by a short ramp.
 */
export function cloudShadeStops(
  points: readonly { x: number; cover: number }[],
  x0: number,
  span: number,
  tone: ChartTone = "light",
): ShadeStop[] {
  if (points.length === 0 || span <= 0) return [];
  const at = (x: number) => Math.min(1, Math.max(0, (x - x0) / span));
  const css = (rgb: RGB) => `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
  const stops: ShadeStop[] = [];
  const push = (offset: number, rgb: RGB) => {
    const next = Math.min(1, Math.max(0, offset));
    const prev = stops[stops.length - 1];
    if (prev && Math.abs(prev.offset - next) < 1e-4) {
      prev.color = css(rgb);
      return;
    }
    stops.push({ offset: next, color: css(rgb) });
  };
  const first = points[0]!;
  const firstRgb = cloudRgb(first.cover, tone);
  push(0, firstRgb);
  push(at(first.x), firstRgb);
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]!;
    const cur = points[i]!;
    const a = cloudRgb(prev.cover, tone);
    const b = cloudRgb(cur.cover, tone);
    const xA = at(prev.x);
    const xB = at(cur.x);
    for (let step = 1; step <= BLEND_STEPS; step++) {
      const u = step / (BLEND_STEPS + 1);
      push(xA + (xB - xA) * u, mixRgb(a, b, smoothstep(u)));
    }
    push(xB, b);
  }
  const last = points[points.length - 1]!;
  push(1, cloudRgb(last.cover, tone));
  return stops;
}

/**
 * Cloudy slices for one hour, sampled on the windgram grid with the same
 * 10 % veil. A schematic low/mid/high stack left holes whenever the strict
 * cloud base (RH 90 % or cover 50 %) was missing while the windgram was
 * already gray.
 */
export function cloudSpans(hour: Hour, elevM: number, zMax = METEO_Z_MAX_M): CloudDeck[] {
  const cbl = convectiveTop(hour, elevM);
  const start = Math.ceil((elevM + 15) / ALT_STEP_M) * ALT_STEP_M;
  const half = ALT_STEP_M / 2;
  const spans: CloudDeck[] = [];
  let open: { base: number; top: number; cover: number } | null = null;
  const close = (slice: { base: number; top: number; cover: number }) => {
    spans.push({
      baseM: Math.max(0, slice.base - half),
      topM: Math.min(zMax, slice.top + half),
      cover: slice.cover,
    });
  };
  for (let z = start; z <= zMax; z += ALT_STEP_M) {
    const cloud = sampleCell(hour, z, elevM, cbl).cloud;
    if (cloud != null && cloud >= CLOUD_VEIL_PCT) {
      if (open) {
        open.top = z;
        open.cover = Math.max(open.cover, cloud);
      } else {
        open = { base: z, top: z, cover: cloud };
      }
    } else if (open) {
      close(open);
      open = null;
    }
  }
  if (open) close(open);
  return spans;
}

function decksTouch(a: CloudDeck, b: CloudDeck): boolean {
  return a.baseM <= b.topM + BAND_GAP_M && b.baseM <= a.topM + BAND_GAP_M;
}

/**
 * Join each hour's cloudy slices into bands. A slice continues the previous
 * hour when the two overlap. A clear hour, or a missing hour, ends the band,
 * which is the same gap the windgram shows as a clear column.
 */
export function cloudBands(hours: Hour[], elevM: number, zMax = METEO_Z_MAX_M): CloudBand[] {
  const ordered = [...hours].sort((a, b) => a.time.localeCompare(b.time));
  const done: CloudBand[] = [];
  let open: CloudBand[] = [];
  for (const hour of ordered) {
    const h = hourOfDay(hour.time);
    const spans = cloudSpans(hour, elevM, zMax);
    const used = new Set<number>();
    const next: CloudBand[] = [];
    for (const band of open) {
      const prev = band[band.length - 1]!;
      if (h - prev.hour !== 1) {
        done.push(band);
        continue;
      }
      let best = -1;
      let bestOverlap = -Infinity;
      spans.forEach((span, i) => {
        if (used.has(i) || !decksTouch(prev, span)) return;
        const overlap = Math.min(prev.topM, span.topM) - Math.max(prev.baseM, span.baseM);
        if (overlap > bestOverlap) {
          bestOverlap = overlap;
          best = i;
        }
      });
      if (best < 0) {
        done.push(band);
        continue;
      }
      used.add(best);
      const span = spans[best]!;
      band.push({ hour: h, baseM: span.baseM, topM: span.topM, cover: span.cover });
      next.push(band);
    }
    spans.forEach((span, i) => {
      if (used.has(i)) return;
      next.push([{ hour: h, baseM: span.baseM, topM: span.topM, cover: span.cover }]);
    });
    open = next;
  }
  done.push(...open);
  return done;
}

/** Top of the convective layer (m) per hour, where the model is unstable. */
export type CblPoint = { hour: number; zM: number };

export function cblSeries(hours: Hour[], elevationM: number): CblPoint[] {
  const points: CblPoint[] = [];
  for (const h of hours) {
    const z = convectiveTop(h, elevationM);
    if (z != null) points.push({ hour: hourOfDay(h.time), zM: z });
  }
  return points;
}

/** Labeled hour ticks: every `step` hours from midnight. */
export function meteoHourTicks(step: number): number[] {
  const ticks: number[] = [];
  for (let h = 0; h < 24; h += step) ticks.push(h);
  return ticks;
}

/** Minimum vertical gap between the right-margin curve names (10 px font). */
export const LABEL_GAP = 13;

/** Push the right-margin labels apart so they never overlap: sorted by the
 * desired y, then a forward/backward pass enforces the gap inside the band.
 * Returns each label's final baseline y by key. */
export function spreadLabels(
  items: Array<{ key: string; y: number }>,
  min: number,
  max: number,
  gap: number = LABEL_GAP,
): Record<string, number> {
  if (items.length === 0) return {};
  const sorted = [...items].sort((a, b) => a.y - b.y);
  const ys = sorted.map((s) => Math.min(Math.max(s.y, min), max));
  for (let i = 1; i < ys.length; i++) {
    ys[i] = Math.max(ys[i]!, ys[i - 1]! + gap);
  }
  ys[ys.length - 1] = Math.min(ys[ys.length - 1]!, max);
  for (let i = ys.length - 2; i >= 0; i--) {
    ys[i] = Math.min(ys[i]!, ys[i + 1]! - gap);
  }
  ys[0] = Math.max(ys[0]!, min);
  const out: Record<string, number> = {};
  sorted.forEach((s, i) => {
    out[s.key] = ys[i]!;
  });
  return out;
}

export type XY = { x: number; y: number };

/** Smooth SVG path through the points (Catmull-Rom → cubic Béziers):
 * cloud bands must read as soft shapes, not angular bars. */
export function smoothPath(pts: XY[]): string {
  if (pts.length === 0) return "";
  const f = (v: number) => Math.round(v * 10) / 10;
  if (pts.length === 1) return `M ${f(pts[0]!.x)},${f(pts[0]!.y)}`;
  const d: string[] = [`M ${f(pts[0]!.x)},${f(pts[0]!.y)}`];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]!;
    const p1 = pts[i]!;
    const p2 = pts[i + 1]!;
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d.push(`C ${f(c1x)},${f(c1y)} ${f(c2x)},${f(c2y)} ${f(p2.x)},${f(p2.y)}`);
  }
  return d.join(" ");
}

/** Closed smooth outline: rounds every corner (quadratic curves through the
 * midpoints) so a cloud band's two ends are soft too, not flat cuts. */
export function smoothClosedPath(pts: XY[]): string {
  const n = pts.length;
  if (n < 3) return "";
  const f = (v: number) => Math.round(v * 10) / 10;
  const mid = (a: XY, b: XY): XY => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  let d = "";
  let prev: XY | null = null;
  for (let i = 0; i < n; i++) {
    const a = pts[i]!;
    const b = pts[(i + 1) % n]!;
    const m = mid(a, b);
    if (!prev) {
      d += `M ${f(m.x)},${f(m.y)}`;
    } else {
      d += ` Q ${f(a.x)},${f(a.y)} ${f(m.x)},${f(m.y)}`;
    }
    prev = m;
  }
  return `${d} Z`;
}
