import type { Hour, ProfilePoint } from "../api/types";

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

const THERMAL_STOPS: [number, RGB][] = [
  [0.3, [252, 244, 214]],
  [1.0, [247, 226, 168]],
  [2.0, [242, 204, 140]],
  [3.2, [236, 176, 122]],
  [5.0, [230, 150, 112]],
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

const DALR = 9.8;
/** Modified Holzworth / NWP: theta_v,env = theta_v,ground + 0.5 K (AMT 2022, Coniglio 2013). */
const LID_K = 0.5;

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
    wMs: thermalSpeed(hour, z, elevM, t, cblTop),
  };
}

/**
 * Modified Holzworth: dry parcel from ground Tv (gamma_d 9.8 K/km) up to
 * theta_v,env = theta_v,ground + 0.5 K. Operational CBL standard; DrJack
 * (soaring) puts the glider ceiling slightly below this level.
 */
export function convectiveTop(hour: Hour, elevM: number): number | null {
  const profile = [...hour.profile].sort((a, b) => a.z - b.z);
  const tSol = hour.surface.t2m ?? profile[0]?.t ?? null;
  const tdSol = profile[0]?.td ?? null;
  const zSol = profile[0]?.z ?? elevM;
  const pSfc = hour.surface.psfc ?? 1013;
  if (tSol == null) return null;
  const thetaP = virtualTheta(tSol, tdSol, zSol, zSol, pSfc);
  const zHi = profile[profile.length - 1]?.z ?? elevM;
  let lastIn = elevM;
  let seenUnstable = false;
  for (let z = elevM; z <= zHi; z += 50) {
    const tEnv = interpScalar(profile, z, (p) => p.t);
    if (tEnv == null) continue;
    const tdEnv = interpScalar(profile, z, (p) => p.td);
    const thetaE = virtualTheta(tEnv, tdEnv, z, zSol, pSfc);
    if (thetaE > thetaP + LID_K) {
      return seenUnstable ? lastIn : null;
    }
    seenUnstable = true;
    lastIn = z;
  }
  return seenUnstable ? lastIn : null;
}

function satVaporHpa(tC: number): number {
  return 6.112 * Math.exp((17.67 * tC) / (tC + 243.5));
}

function virtualTheta(
  tC: number,
  tdC: number | null,
  z: number,
  zSol: number,
  pSfcHpa: number,
): number {
  let tv = tC;
  if (tdC != null) {
    const p = pSfcHpa * Math.exp(-(z - zSol) / 8500);
    const e = satVaporHpa(tdC);
    const q = (0.622 * e) / Math.max(p - e, 1);
    tv = (tC + 273.15) * (1 + 0.608 * q) - 273.15;
  }
  return tv + (DALR * (z - zSol)) / 1000;
}

export function windRgb(kmh: number): RGB {
  return rampRgb(WIND_STOPS, kmh, [46, 168, 88]);
}

export function thermalRgb(wMs: number): RGB {
  return rampRgb(THERMAL_STOPS, wMs, [252, 244, 214]);
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

/** LCL AMSL: cloudBaseM, else ~125 m/K x (T-Td). */
function condensationLevelM(hour: Hour, elevM: number): number | null {
  if (hour.surface.cloudBaseM != null) return hour.surface.cloudBaseM;
  const t = hour.surface.t2m ?? hour.profile[0]?.t ?? null;
  const td = hour.profile[0]?.td ?? null;
  const zSol = hour.profile[0]?.z ?? elevM;
  if (t == null || td == null) return null;
  const spread = t - td;
  if (spread <= 0.3) return zSol;
  return zSol + 125 * spread;
}

function lowCloudFade(z: number, elevM: number, cloudLow: number | null): number | null {
  if (cloudLow == null || cloudLow < 5) return cloudLow;
  const agl = Math.max(0, z - elevM);
  return round0(cloudLow * Math.exp(-agl / 700));
}

/**
 * Estimated w (m/s) in the CBL: 1.15 sqrt(dT + 0.4) x (h / 800)^0.25
 * dT = dry-parcel T - env T. Not a model field.
 */
function thermalSpeed(
  hour: Hour,
  z: number,
  elevM: number,
  tEnv: number | null,
  cblTop: number | null,
): number {
  if (cblTop == null || z > cblTop + 40) return 0;
  const tSol = hour.surface.t2m ?? hour.profile[0]?.t ?? null;
  const zSol = hour.profile[0]?.z ?? elevM;
  const tUse = tEnv ?? (z <= elevM + 40 ? tSol : null);
  if (tSol == null || tUse == null) return 0;
  const tParcel = tSol - (DALR * (z - zSol)) / 1000;
  const dt = Math.max(0, tParcel - tUse);
  const h = Math.max(100, cblTop - zSol);
  const w = 1.15 * Math.sqrt(dt + 0.4) * (h / 800) ** 0.25;
  return Math.round(w * 10) / 10;
}

function rampRgb(stops: [number, RGB][], x: number, fallback: RGB): RGB {
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
