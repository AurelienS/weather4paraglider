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
 * paraglider). The steps are what that sink turns the number into:
 *   0.5  green    slower than the sink, most wings descend
 *   1.0  green    scratchy, a light climb at best
 *   1.5  lime     a patient climb
 *   2.0  yellow   a good climb, about 1 m/s on the vario
 *   2.5  orange   strong
 *   3.5  red      very strong
 *   4.5  magenta  rough
 *   6    violet   extreme; the average rarely gets here
 * Each color stays light so the dark speed number keeps its contrast.
 */
export const THERMAL_STOPS: readonly [number, RGB][] = [
  [0.5, [177, 217, 171]],
  [1.0, [131, 208, 128]],
  [1.5, [173, 210, 86]],
  [2.0, [240, 197, 56]],
  [2.5, [242, 142, 54]],
  [3.5, [228, 98, 88]],
  [4.5, [213, 123, 171]],
  [6.0, [180, 139, 208]],
];

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

export function thermalRgb(wMs: number): RGB {
  return rampRgb(THERMAL_STOPS, wMs, [177, 217, 171]);
}

export function cellBackground(wMs: number, cloud: number | null): RGB {
  let rgb: RGB = [255, 255, 255];
  if (wMs > 0.05) rgb = thermalRgb(wMs);
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
