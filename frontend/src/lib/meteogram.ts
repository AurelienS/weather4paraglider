import type { Hour } from "../api/types";
import { dayKey, hourOfDay } from "./format";
import { convectiveTop } from "./windgram";

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

/** Surface dew point: the lowest profile level sits at the model elevation,
 * its Td is the ground-level dew point (no td2m field in the API). */
export function surfaceTd(hour: Hour): number | null {
  const pts = [...hour.profile].sort((a, b) => a.z - b.z);
  return pts[0]?.td ?? null;
}

/** °C window for the temperature panel, padded, dew point included. */
export function tempRange(hours: Hour[]): { min: number; max: number } {
  const values = hours.flatMap((h) =>
    [h.surface.t2m, surfaceTd(h)].filter((v): v is number => v != null),
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

/** Altitude (m) maximum for the plot: room for the cloud decks above the
 * highest base, clamped to a 3000–5000 m window so the axis stays readable. */
export function cloudMaxM(hours: Hour[]): number {
  const base = hours
    .map((h) => h.surface.cloudBaseM)
    .filter((v): v is number => v != null);
  const top = Math.max(3000, ...(base.length > 0 ? base.map((b) => b + 4900) : [0]));
  return Math.min(5000, niceCeil(top, 1000));
}

/**
 * Continuous cloud decks stacked above the model's cloud base: each layer
 * (low/mid/high) gets a band whose thickness follows its cover percentage.
 * The bands are drawn as smooth areas across the hours, not per-hour bars.
 */
export type CloudDeck = { baseM: number; topM: number; cover: number };

const DECK_LAYERS: Array<{
  key: "cloudLow" | "cloudMid" | "cloudHigh";
  offsetM: number;
  spanM: number;
}> = [
  { key: "cloudLow", offsetM: 0, spanM: 1500 },
  { key: "cloudMid", offsetM: 1700, spanM: 1500 },
  { key: "cloudHigh", offsetM: 3400, spanM: 1500 },
];

export function cloudDecks(hour: Hour): (CloudDeck | null)[] {
  const base = hour.surface.cloudBaseM;
  if (base == null) return DECK_LAYERS.map(() => null);
  return DECK_LAYERS.map(({ key, offsetM, spanM }) => {
    const cover = hour.surface[key];
    if (cover == null || cover <= 0) return null;
    const thick = Math.max(150, (cover / 100) * spanM);
    return { baseM: base + offsetM, topM: base + offsetM + thick, cover };
  });
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
