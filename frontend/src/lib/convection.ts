import type { Hour } from "../api/types";

/**
 * Convective-layer depth and the updraft a pilot can expect, diagnosed from
 * the model's own profile plus its surface heating.
 *
 * Height. A modified Holzworth / parcel top (Holzworth 1964; the +0.5 K
 * threshold of Coniglio et al. 2013) on virtual potential temperature.
 * The parcel is the mixed layer, not the superadiabatic skin at 2 m: that
 * skin is only a few tens of metres deep (Stull 1988) and launching from it
 * overshoots a weak cap. A surface inversion, in the sense of Liu & Liang
 * (2010) (about +1 K over the first ~150 m), is not a convective layer, so
 * a nocturnal residual layer is not painted as thermals. Profiles that never
 * reach a cap (AROME HD, the 15-min nowcast, ICON-CH1) return null rather
 * than a fake ceiling at the last available level.
 *
 * Strength. Deardorff's convective scale (1970), which is the quantity
 * DrJack's BLIPMAP publishes as the average dry updraft near mid-layer:
 *   w* = (g/θv · zi · H / (ρ cp))^(1/3)
 * H is the model's sensible heat flux when it publishes one (ICON-D2).
 * Otherwise H is estimated with Holtslag & Van Ulden (1983) from the
 * shortwave radiation, the cloud cover and the 2 m temperature. The
 * vertical shape inside the layer is Allen (2006) / Lenschow & Stephens
 * (1980), renormalized so the value at mid-layer equals w* (DrJack's
 * reading of the same scale). It is the average dry updraft, before the
 * wing's sink, and it fades to nothing near the inversion. Cumulus
 * condensation and wind shear are not folded into the number.
 */

const G = 9.80665;
const CP = 1005;
const LV = 2.45e6;
const RD_OVER_G = 287.05 / G;
const DALR = 9.8;
/** Coniglio et al. 2013: the cap must exceed the parcel by this much. */
const LID_K = 0.5;
/** Liu & Liang 2010, land: θ difference that counts as a surface inversion. */
const INVERSION_K = 1;
/** Below this depth the "layer" is the surface skin, not a thermal. */
const MIN_DEPTH_M = 200;
/** A profile that is still buoyant but shorter than this does not show a top. */
const MIN_REACH_M = 1500;
/** Holtslag & Van Ulden need a real daytime flux before thermals count. */
const MIN_HEAT_WM2 = 15;
const MIN_SUN_WM2 = 80;
/** Skin deeper than this is left out of the environment profile. */
const SKIN_M = 40;

const ALBEDO = 0.23;
const LW_C1 = 5.31e-13;
const LW_C2 = 60;
const SIGMA = 5.67e-8;
const GROUND_FRACTION = 0.1;
/** Modified Priestley-Taylor moisture factor and offset (Holtslag & Van Ulden). */
const PT_ALPHA = 1;
const PT_BETA = 20;

export type HeatFlux = {
  /** True when the number comes from the model rather than the radiation scheme. */
  modelKnown: boolean;
  /** Sensible heat flux into the atmosphere (W/m²), never negative. */
  hUp: number;
  /** Latent heat flux into the atmosphere (W/m²), 0 when unpublished. */
  leUp: number;
  shortwave: number | null;
};

function finite(v: number | null | undefined): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/**
 * ICON and ECMWF publish surface fluxes positive downward (into the ground).
 * Stored values are the flux into the atmosphere: positive when the ground
 * heats the air. Verified on ICON-D2, where the midday flux is negative
 * while shortwave radiation peaks.
 */
export function upwardHeatFlux(downwardPositiveWm2: number | null): number | null {
  if (downwardPositiveWm2 == null || !Number.isFinite(downwardPositiveWm2)) return null;
  return Math.round(-downwardPositiveWm2 * 10) / 10;
}

function satVaporHpa(tC: number): number {
  return 6.112 * Math.exp((17.67 * tC) / (tC + 243.5));
}

function specificHumidity(tdC: number | null, pHpa: number): number {
  if (tdC == null) return 0;
  const e = satVaporHpa(tdC);
  return (0.622 * e) / Math.max(pHpa - e, 1);
}

/** Virtual potential temperature (°C) on the dry adiabat, moisture included. */
function thetaV(
  tC: number,
  tdC: number | null,
  z: number,
  zSfc: number,
  pSfc: number,
  qWhenDry = 0,
): number {
  const p = pSfc * Math.exp(-(z - zSfc) / (RD_OVER_G * (tC + 273.15)));
  const q = tdC != null ? specificHumidity(tdC, p) : qWhenDry;
  const tv = (tC + 273.15) * (1 + 0.608 * q) - 273.15;
  return tv + (DALR * (z - zSfc)) / 1000;
}

type Sample = { z: number; theta: number };

function cloudFraction(hour: Hour): number {
  const layers = [hour.surface.cloudLow, hour.surface.cloudMid, hour.surface.cloudHigh]
    .filter((v): v is number => v != null)
    .map((v) => Math.min(1, Math.max(0, v / 100)));
  if (layers.length === 0) return 0;
  return 1 - layers.reduce((clear, c) => clear * (1 - c), 1);
}

/**
 * Daytime sensible heat flux (W/m²) from routine weather data.
 * Holtslag & Van Ulden (1983): net radiation over grass (albedo 0.23,
 * ground flux 10% of the net) partitioned with their modified
 * Priestley-Taylor scheme (α = 1, β = 20 W/m²), which describes average
 * moisture. Dry rock and a sun-facing slope run warmer than this; the
 * model's own flux is used instead whenever it is published.
 */
export function holtslagSensible(input: {
  tC: number;
  pHpa: number;
  shortwave: number;
  cloudFraction: number;
}): number {
  if (input.shortwave <= 0) return 0;
  const tk = input.tC + 273.15;
  const rn =
    (1 - ALBEDO) * input.shortwave +
    LW_C1 * tk ** 6 -
    SIGMA * tk ** 4 +
    LW_C2 * Math.min(1, Math.max(0, input.cloudFraction));
  if (rn <= 0) return 0;
  const available = rn * (1 - GROUND_FRACTION);
  const es = satVaporHpa(input.tC);
  const s = Math.max(0.05, (es * 17.67 * 243.5) / (input.tC + 243.5) ** 2);
  const gamma = (CP / (0.622 * LV)) * input.pHpa;
  const weight = (1 - PT_ALPHA + gamma / s) / (1 + gamma / s);
  return Math.max(0, weight * available - PT_BETA);
}

export function surfaceHeating(hour: Hour): HeatFlux {
  const sw = finite(hour.surface.shortwave);
  const model = finite(hour.surface.sensibleUp);
  const latent = finite(hour.surface.latentUp);
  if (model != null) {
    return {
      modelKnown: true,
      hUp: Math.max(0, model),
      leUp: Math.max(0, latent ?? 0),
      shortwave: sw,
    };
  }
  const t = finite(hour.surface.t2m);
  if (t == null || sw == null) {
    return { modelKnown: false, hUp: 0, leUp: 0, shortwave: sw };
  }
  return {
    modelKnown: false,
    hUp: holtslagSensible({
      tC: t,
      pHpa: finite(hour.surface.psfc) ?? 1013,
      shortwave: sw,
      cloudFraction: cloudFraction(hour),
    }),
    leUp: 0,
    shortwave: sw,
  };
}

/**
 * Bolton (1980) lifting condensation level, metres AMSL.
 * Replaces Espy's 125 m/K rule, which is the same curve only near 20 °C.
 */
export function liftingCondensationLevelM(tC: number, tdC: number, zM: number): number {
  if (tC - tdC <= 0.3) return zM;
  const tK = tC + 273.15;
  const tdK = tdC + 273.15;
  const tl = 1 / (1 / (tdK - 56) + Math.log(tK / tdK) / 800) + 56;
  return zM + Math.max(0, (tK - tl) / (DALR / 1000));
}

function environment(hour: Hour, elevM: number): { skin: number | null; column: Sample[] } {
  const pSfc = finite(hour.surface.psfc) ?? 1013;
  const points = hour.profile
    .filter((p) => p.t != null && p.z >= elevM - 1)
    .sort((a, b) => a.z - b.z);
  const tSkin = finite(hour.surface.t2m) ?? points[0]?.t ?? null;
  const tdSkin = points[0]?.td ?? null;
  const skin =
    tSkin == null ? null : thetaV(tSkin, tdSkin, elevM, elevM, pSfc);
  // Levels above 2 m often have no dew point (the AGL wind levels). Treating
  // them as dry while the next pressure level is moist invents a θv jump of
  // about a kelvin and a false cap. A missing dew point keeps the surface
  // specific humidity, which is the mixed-layer assumption.
  const qSfc = specificHumidity(tdSkin, pSfc);
  const column: Sample[] = [];
  for (const p of points) {
    if (p.t == null || p.z < elevM + SKIN_M) continue;
    column.push({
      z: p.z,
      theta: thetaV(p.t, p.td, p.z, elevM, pSfc, qSfc),
    });
  }
  return { skin, column };
}

function thetaAt(column: Sample[], z: number): number | null {
  const first = column[0];
  const last = column[column.length - 1];
  if (!first || !last) return null;
  if (z <= first.z) return first.theta;
  if (z >= last.z) return last.theta;
  for (let i = 1; i < column.length; i++) {
    const a = column[i - 1];
    const b = column[i];
    if (!a || !b || z > b.z) continue;
    if (a.z === b.z) return a.theta;
    const t = (z - a.z) / (b.z - a.z);
    return a.theta + (b.theta - a.theta) * t;
  }
  return null;
}

function nearestTheta(column: Sample[], elevM: number, agl: number, tol: number): number | null {
  let best: Sample | null = null;
  let bestD = tol;
  for (const s of column) {
    const d = Math.abs(s.z - elevM - agl);
    if (d <= bestD) {
      best = s;
      bestD = d;
    }
  }
  return best?.theta ?? null;
}

function parcelTheta(column: Sample[], elevM: number): number | null {
  let min = Infinity;
  let n = 0;
  for (const s of column) {
    const agl = s.z - elevM;
    if (agl > 300) break;
    if (s.theta < min) min = s.theta;
    n += 1;
  }
  if (n === 0) return column[0]?.theta ?? null;
  return min;
}

/**
 * A mixed layer is near-neutral up to a sharp cap. A stable lapse (about
 * 3 K/km of potential temperature) reaches the +0.5 K lid within a couple
 * of hundred metres. The gradient is taken above the first measured level:
 * below that, the mixed layer is extended downward, which would hide the
 * lapse. A rise shorter than 100 m that already hits the lid is a jump,
 * not the standard atmosphere, so it counts as a cap.
 */
function nearNeutral(column: Sample[], zTop: number, thetaP: number): boolean {
  const theta = thetaAt(column, zTop);
  const z0 = column[0]?.z;
  if (theta == null || z0 == null) return false;
  const riseM = zTop - z0;
  if (riseM < 100) return true;
  return (theta - thetaP) / (riseM / 1000) <= 2;
}

function regimeActive(
  heat: HeatFlux,
  inversion: boolean,
  superadiabatic: boolean,
): boolean {
  if (inversion && !superadiabatic) return false;
  if (heat.modelKnown) return heat.hUp >= MIN_HEAT_WM2;
  if (heat.hUp >= MIN_HEAT_WM2 && (heat.shortwave == null || heat.shortwave >= MIN_SUN_WM2)) {
    return true;
  }
  // No radiation and no model flux (a profile-only sounding): the
  // superadiabatic skin is the only evidence that the ground is heating.
  return superadiabatic && heat.shortwave == null && !heat.modelKnown;
}

/**
 * Top of the dry convective layer, metres AMSL. Null when the ground is
 * not heating, the surface layer is an inversion, or the profile is too
 * shallow to see the cap.
 */
export function convectiveTop(hour: Hour, elevM: number): number | null {
  const { skin, column } = environment(hour, elevM);
  const first = column[0];
  const last = column[column.length - 1];
  if (!first || !last || skin == null) return null;

  const aloft = nearestTheta(column, elevM, 150, 120);
  const inversion = aloft != null && aloft > skin + INVERSION_K;
  const superadiabatic = aloft != null && skin > aloft + LID_K;
  if (!regimeActive(surfaceHeating(hour), inversion, superadiabatic)) return null;

  const thetaP = parcelTheta(column, elevM);
  if (thetaP == null) return null;

  let lastIn: number | null = null;
  for (let z = elevM; z <= last.z; z += 25) {
    const thetaE = thetaAt(column, z);
    if (thetaE == null) continue;
    if (thetaE > thetaP + LID_K) {
      if (lastIn == null || lastIn - elevM < MIN_DEPTH_M) return null;
      if (!nearNeutral(column, lastIn, thetaP)) return null;
      return lastIn;
    }
    lastIn = z;
  }
  if (lastIn == null || lastIn - elevM < MIN_DEPTH_M) return null;
  if (!nearNeutral(column, lastIn, thetaP)) return null;
  // Still buoyant at the top of the data. A short profile (no pressure
  // levels) must not draw a ceiling at its last point. A deep one is
  // convective at least up to the data we have.
  if (last.z - elevM < MIN_REACH_M) return null;
  return lastIn;
}

/**
 * Deardorff convective velocity scale (m/s). `depthM` is the layer depth,
 * `hUp` / `leUp` are fluxes into the atmosphere (W/m²). The latent term is
 * the virtual-temperature correction (Stull 1988).
 */
export function convectiveVelocity(input: {
  hUp: number;
  leUp: number;
  depthM: number;
  tC: number;
  tdC: number | null;
  pHpa: number;
}): number {
  if (input.hUp <= 0 || input.depthM < MIN_DEPTH_M) return 0;
  const p = Math.max(400, input.pHpa);
  const q = specificHumidity(input.tdC, p);
  const thetaK = (input.tC + 273.15) * (1 + 0.608 * q);
  const rho = (p * 100) / (287.05 * thetaK);
  const buoyancy = input.hUp / (rho * CP) + (0.61 * thetaK * Math.max(0, input.leUp)) / (rho * LV);
  if (buoyancy <= 0) return 0;
  return (G / thetaK * input.depthM * buoyancy) ** (1 / 3);
}

/** Allen (2006) eq. 11: normalized mean updraft, 0 outside (0, 1/1.1). */
export function allenShape(zOverZi: number): number {
  if (zOverZi <= 0 || zOverZi >= 1 / 1.1) return 0;
  return zOverZi ** (1 / 3) * (1 - 1.1 * zOverZi);
}

/**
 * Dry thermal updraft (m/s) at altitude `z`. Zero outside the layer.
 * The Allen/Lenschow shape is scaled so mid-layer equals `wStar`, which is
 * the average climb DrJack's forecasts report for that scale.
 */
export function thermalUpdraft(wStar: number, z: number, zBase: number, depth: number): number {
  if (wStar <= 0 || depth < MIN_DEPTH_M) return 0;
  const mid = allenShape(0.5);
  if (mid <= 0) return 0;
  const shape = allenShape((z - zBase) / depth);
  if (shape <= 0) return 0;
  return Math.round((wStar * shape) / mid * 10) / 10;
}

/** Updraft (m/s) at one altitude. Zero outside a convective layer. */
export function thermalSpeed(
  hour: Hour,
  z: number,
  elevM: number,
  cblTop: number | null,
): number {
  if (cblTop == null || z > cblTop || z < elevM) return 0;
  const depth = cblTop - elevM;
  const heat = surfaceHeating(hour);
  const t = finite(hour.surface.t2m) ?? hour.profile[0]?.t;
  if (t == null) return 0;
  const wStar = convectiveVelocity({
    hUp: heat.hUp,
    leUp: heat.leUp,
    depthM: depth,
    tC: t,
    tdC: hour.profile[0]?.td ?? null,
    pHpa: finite(hour.surface.psfc) ?? 1013,
  });
  return thermalUpdraft(wStar, z, elevM, depth);
}
