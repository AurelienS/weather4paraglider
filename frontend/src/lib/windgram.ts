import type { Hour, ProfilePoint } from "../api/types";
import { liftingCondensationLevelM, thermalSpeed } from "./convection";

export { convectiveTop } from "./convection";

export const ALT_STEP_M = 250;

export type GramCell = {
  z: number;
  belowTerrain: boolean;
  wind: number | null;
  gust: number | null;
  dir: number | null;
  t: number | null;
  td: number | null;
  rh: number | null;
  cloud: number | null;
  /** Estimated vertical velocity (m/s), 0 outside the convective layer. */
  wMs: number;
};

export type RGB = [number, number, number];

/**
 * Dry-updraft tint, before the wing's sink (about 1.1 m/s on a normal
 * paraglider). Four hues, and only the strength changes inside a hue —
 * the bands do not blend, or the grid turns olive again:
 *   0–0.5    paper     a trace, not a climb
 *   0.5–1.2  teal      under the sink, a scratch at best
 *   1.2–2.2  gold      a climb, about 1 m/s on the vario at the top
 *   2.2–3.5  vermilion strong
 *   3.5–6    violet    rough; the average rarely passes 6
 * Wind arrows keep their own green–red scale. Each tint stays light enough
 * for the dark speed number.
 */
const THERMAL_BANDS: readonly { from: number; to: number; wash: RGB; solid: RGB }[] = [
  { from: 0.5, to: 1.2, wash: [198, 224, 216], solid: [110, 186, 174] },
  { from: 1.2, to: 2.2, wash: [246, 228, 170], solid: [232, 186, 78] },
  { from: 2.2, to: 3.5, wash: [242, 170, 148], solid: [214, 96, 84] },
  { from: 3.5, to: 6, wash: [214, 160, 196], solid: [168, 124, 198] },
];

/** Legend stops: a wash and a solid per band, so the guide bar cuts cleanly. */
export const THERMAL_STOPS: readonly [number, RGB][] = THERMAL_BANDS.flatMap((band) => [
  [band.from, band.wash] as [number, RGB],
  [band.to, band.solid] as [number, RGB],
]);

const WIND_STOPS: [number, RGB][] = [
  [0, [46, 168, 88]],
  [12, [126, 198, 72]],
  [22, [232, 206, 52]],
  [32, [242, 148, 42]],
  [42, [230, 74, 64]],
  [55, [168, 64, 176]],
  [80, [98, 40, 148]],
];

export function altitudeLevels(elevM: number, zMax: number, step = ALT_STEP_M): number[] {
  const start = Math.ceil((elevM + 15) / step) * step;
  const levels: number[] = [];
  for (let z = start; z <= zMax; z += step) levels.push(z);
  return levels;
}

/**
 * Altitude used to color the ground row. The updraft profile is zero right
 * on the surface, and the next grid line sits up to one step above the
 * ground, so the row shows the climb in the middle of that band.
 */
export function groundTintZ(elevM: number, step = ALT_STEP_M): number {
  const line = altitudeLevels(elevM, elevM + step + 15, step)[0];
  if (line == null) return elevM;
  return (elevM + line) / 2;
}

/**
 * AMSL altitude of the row carrying the 0 °C isotherm line: the row just
 * BELOW the lowest sub-zero cell, so the line sits on the shared edge
 * between the sub-zero cell and the above-zero cell under it.
 * levels/temps are sorted high -> low altitude. Falls back to the ground row
 * (elevM) when the transition happens between the lowest row and the ground.
 */
export function iso0CellZ(
  levels: readonly number[],
  temps: readonly (number | null)[],
  groundT: number | null,
  elevM: number,
): number | null {
  for (let i = levels.length - 1; i >= 0; i--) {
    const t = temps[i];
    if (t == null) continue;
    if (t <= 0) {
      if (i + 1 < levels.length) return levels[i + 1] ?? null;
      return groundT != null && groundT > 0 ? elevM : null;
    }
  }
  return groundT != null && groundT <= 0 ? elevM : null;
}

export function sampleCell(
  hour: Hour,
  z: number,
  elevM: number,
  cblTop: number | null = null,
): GramCell {
  if (z < elevM) {
    return {
      z,
      belowTerrain: true,
      wind: null,
      gust: null,
      dir: null,
      t: null,
      td: null,
      rh: null,
      cloud: null,
      wMs: 0,
    };
  }
  const profile = [...hour.profile].sort((a, b) => a.z - b.z);
  const uv = interpUV(profile, z);
  const t = round1(
    interpScalar(profile, z, (p) => p.t) ??
      (z <= elevM + 40 ? hour.surface.t2m : null),
  );
  return {
    z,
    belowTerrain: false,
    wind: uv ? Math.round(uv.speed) : null,
    gust: null,
    dir: uv ? Math.round(uv.dir) : null,
    t,
    td: round1(interpScalar(profile, z, (p) => p.td)),
    rh: round0(interpScalar(profile, z, (p) => p.rh)),
    cloud: cloudAt(z, elevM, hour, profile, cblTop),
    wMs: thermalSpeed(hour, z, elevM, cblTop),
  };
}

export function windRgb(kmh: number): RGB {
  return rampRgb(WIND_STOPS, kmh, [46, 168, 88]);
}

const PAPER: RGB = [255, 255, 255];
/** Updraft where the first teal wash is reached. Below it the tint fades out. */
const TRACE_MS = 0.5;

export function thermalRgb(wMs: number): RGB {
  const first = THERMAL_BANDS[0];
  const last = THERMAL_BANDS[THERMAL_BANDS.length - 1];
  if (!first || !last || wMs <= 0) return PAPER;
  if (wMs < TRACE_MS) {
    // Squared so 0.1 m/s is about 4% of the way to teal: a trace, not a tint.
    const t = (wMs / TRACE_MS) ** 2;
    return lerpRgb(PAPER, first.wash, t);
  }
  if (wMs >= last.to) return last.solid;
  const band = THERMAL_BANDS.find((item) => wMs < item.to) ?? last;
  const span = band.to - band.from;
  const t = span <= 0 ? 1 : (wMs - band.from) / span;
  return lerpRgb(band.wash, band.solid, Math.min(1, Math.max(0, t)));
}

export function cellBackground(wMs: number, cloud: number | null): RGB {
  let rgb: RGB = PAPER;
  if (wMs > 0) rgb = thermalRgb(wMs);
  if (cloud != null && cloud >= 10) {
    const fog = 0.14 + 0.36 * ((cloud - 10) / 90);
    rgb = lerpRgb(rgb, [148, 150, 154], fog);
  }
  return rgb;
}

export function cssRgb(rgb: RGB): string {
  return `rgb(${rgb[0]} ${rgb[1]} ${rgb[2]})`;
}

/**
 * Minimum OKLab distance between the arrow and the cell. Luminance contrast
 * is the wrong test here: a green arrow on an orange thermal is obvious, while
 * an orange arrow on an orange thermal is not. 0.16 is enough for the hue to
 * read as its own color. Below that, the arrow is darkened along its hue.
 */
const ARROW_MIN_DISTANCE = 0.16;
const EDGE_LIGHT: RGB = [255, 252, 246];
const EDGE_DARK: RGB = [36, 28, 20];

/** Perceptual distance in OKLab. 0 = the same color. */
export function colorDistance(a: RGB, b: RGB): number {
  const [l1, a1, b1] = rgbToOklab(a);
  const [l2, a2, b2] = rgbToOklab(b);
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
}

/**
 * Arrow ink for one cell. The legend color is kept when it already stands
 * off the background. A same-family collision (green on green, orange on
 * orange) is darkened along that hue until the arrow reads on its own,
 * so the color still means the same wind speed.
 */
export function arrowInk(wind: RGB, background: RGB): RGB {
  if (colorDistance(wind, background) >= ARROW_MIN_DISTANCE) return wind;
  const [h, s, l0] = rgbToHsl(wind);
  return (
    walkLightness(h, s, l0, background, -1) ??
    walkLightness(h, s, l0, background, 1) ??
    (contrastRatio(EDGE_DARK, background) >= contrastRatio(EDGE_LIGHT, background)
      ? EDGE_DARK
      : EDGE_LIGHT)
  );
}

/**
 * Rim around the arrow. The neutral (near-black or near-white) that stands
 * off the cell the most, so the shaft stays a distinct shape.
 */
export function arrowEdge(background: RGB): RGB {
  return contrastRatio(EDGE_DARK, background) >= contrastRatio(EDGE_LIGHT, background)
    ? EDGE_DARK
    : EDGE_LIGHT;
}

function contrastRatio(a: RGB, b: RGB): number {
  const l1 = relativeLuminance(a);
  const l2 = relativeLuminance(b);
  const hi = l1 > l2 ? l1 : l2;
  const lo = l1 > l2 ? l2 : l1;
  return (hi + 0.05) / (lo + 0.05);
}

function relativeLuminance(rgb: RGB): number {
  return 0.2126 * linearSrgb(rgb[0]) + 0.7152 * linearSrgb(rgb[1]) + 0.0722 * linearSrgb(rgb[2]);
}

function linearSrgb(channel: number): number {
  const s = channel / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

/** Björn Ottosson's OKLab. L is lightness, a is green–red, b is blue–yellow. */
function rgbToOklab(rgb: RGB): [number, number, number] {
  const r = linearSrgb(rgb[0]);
  const g = linearSrgb(rgb[1]);
  const b = linearSrgb(rgb[2]);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function walkLightness(
  h: number,
  s: number,
  l0: number,
  background: RGB,
  dir: -1 | 1,
): RGB | null {
  const limit = dir < 0 ? 0.12 : 0.9;
  for (let i = 1; i <= 48; i++) {
    const next = l0 + dir * i * 0.02;
    if (dir < 0 ? next < limit : next > limit) break;
    const candidate = hslToRgb(h, s, next);
    if (colorDistance(candidate, background) >= ARROW_MIN_DISTANCE) return candidate;
  }
  return null;
}

function rgbToHsl(rgb: RGB): [number, number, number] {
  const r = rgb[0] / 255;
  const g = rgb[1] / 255;
  const b = rgb[2] / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h, s, l];
}

function hslToRgb(h: number, s: number, l: number): RGB {
  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const channel = (t0: number) => {
    let t = t0;
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [
    Math.round(channel(h + 1 / 3) * 255),
    Math.round(channel(h) * 255),
    Math.round(channel(h - 1 / 3) * 255),
  ];
}

/**
 * Below the LCL / inside the dry CBL: no cloud (thermals).
 * Above: isobaric field. Low stratus only when there is no convection.
 */
function cloudAt(
  z: number,
  elevM: number,
  hour: Hour,
  profile: ProfilePoint[],
  cblTop: number | null,
): number | null {
  const lcl = condensationLevelM(hour, elevM);
  const convective = cblTop != null && cblTop > elevM + 80;
  if (convective) {
    const base = lcl ?? cblTop;
    if (z < base - 40) return 0;
  }
  const decks = profile.filter((p) => p.cloud != null);
  const first = decks[0];
  const last = decks[decks.length - 1];
  if (!first || !last) {
    return convective ? 0 : lowCloudFade(z, elevM, hour.surface.cloudLow);
  }
  if (z <= first.z) {
    if (convective) return round0(first.cloud);
    return lowCloudFade(z, elevM, hour.surface.cloudLow);
  }
  if (z >= last.z) return round0(last.cloud);
  return round0(interpScalar(profile, z, (p) => p.cloud));
}

/** LCL AMSL: the model's cloud base, else Bolton's lifting condensation level. */
function condensationLevelM(hour: Hour, elevM: number): number | null {
  if (hour.surface.cloudBaseM != null) return hour.surface.cloudBaseM;
  const t = hour.surface.t2m ?? hour.profile[0]?.t ?? null;
  const td = hour.profile[0]?.td ?? null;
  const zSol = hour.profile[0]?.z ?? elevM;
  if (t == null || td == null) return null;
  return liftingCondensationLevelM(t, td, zSol);
}

function lowCloudFade(z: number, elevM: number, cloudLow: number | null): number | null {
  if (cloudLow == null || cloudLow < 5) return cloudLow;
  const agl = Math.max(0, z - elevM);
  return round0(cloudLow * Math.exp(-agl / 700));
}

function rampRgb(stops: readonly [number, RGB][], x: number, fallback: RGB): RGB {
  const first = stops[0];
  const last = stops[stops.length - 1];
  if (!first || !last) return fallback;
  if (x <= first[0]) return first[1];
  for (let i = 1; i < stops.length; i++) {
    const hi = stops[i];
    const lo = stops[i - 1];
    if (!hi || !lo) continue;
    if (x <= hi[0]) {
      const t = (x - lo[0]) / (hi[0] - lo[0]);
      return lerpRgb(lo[1], hi[1], t);
    }
  }
  return last[1];
}

function interpScalar(
  profile: ProfilePoint[],
  z: number,
  get: (p: ProfilePoint) => number | null,
): number | null {
  let lo: ProfilePoint | null = null;
  let hi: ProfilePoint | null = null;
  for (const p of profile) {
    if (get(p) == null) continue;
    if (p.z <= z) lo = p;
    if (p.z >= z) {
      hi = p;
      break;
    }
  }
  if (!lo || !hi) return null;
  const a = get(lo);
  const b = get(hi);
  if (a == null || b == null) return null;
  if (lo.z === hi.z) return a;
  const t = (z - lo.z) / (hi.z - lo.z);
  return a + (b - a) * t;
}

function interpUV(
  profile: ProfilePoint[],
  z: number,
): { speed: number; dir: number } | null {
  let lo: ProfilePoint | null = null;
  let hi: ProfilePoint | null = null;
  for (const p of profile) {
    if (p.wind == null || p.dir == null) continue;
    if (p.z <= z) lo = p;
    if (p.z >= z) {
      hi = p;
      break;
    }
  }
  if (!lo || !hi || lo.wind == null || lo.dir == null || hi.wind == null || hi.dir == null) {
    return null;
  }
  const a = toUV(lo.wind, lo.dir);
  const b = toUV(hi.wind, hi.dir);
  const t = lo.z === hi.z ? 0 : (z - lo.z) / (hi.z - lo.z);
  const u = a.u + (b.u - a.u) * t;
  const v = a.v + (b.v - a.v) * t;
  const speed = Math.hypot(u, v);
  const dir = ((Math.atan2(-u, -v) * 180) / Math.PI + 360) % 360;
  return { speed, dir };
}

function toUV(speed: number, dir: number): { u: number; v: number } {
  const rad = (dir * Math.PI) / 180;
  return { u: -speed * Math.sin(rad), v: -speed * Math.cos(rad) };
}

function lerpRgb(a: RGB, b: RGB, t: number): RGB {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

function round1(v: number | null): number | null {
  return v == null ? null : Math.round(v * 10) / 10;
}

function round0(v: number | null): number | null {
  return v == null ? null : Math.round(v);
}
