import type { AromeResponse, Hour, ProfilePoint, Surface } from "../api/types";

/** Same precision as the pipeline: one decimal for measured values,
 * integers for percentages and altitudes. */
const r1 = (x: number | null): number | null => (x == null ? null : Math.round(x * 10) / 10);
const ri = (x: number | null): number | null => (x == null ? null : Math.round(x));

/** Mean of the non-null values; null when nothing is measurable. */
function meanOf(xs: Array<number | null>): number | null {
  const vals = xs.filter((x): x is number => x != null);
  return vals.length === 0 ? null : vals.reduce((a, b) => a + b, 0) / vals.length;
}

/** Wind is a vector: mean the u/v components, not the degrees (mean of
 * 10 kt from 0° and 10 kt from 90° is 7 kt from 45°, not 10 kt from 45°). */
export function meanWind(
  speeds: Array<number | null>,
  dirs: Array<number | null>,
): { wind: number | null; dir: number | null } {
  let u = 0;
  let v = 0;
  let n = 0;
  for (let i = 0; i < speeds.length; i++) {
    const s = speeds[i];
    const d = dirs[i];
    if (s == null || d == null) continue;
    const r = (d * Math.PI) / 180;
    u += -s * Math.sin(r);
    v += -s * Math.cos(r);
    n += 1;
  }
  if (n === 0) return { wind: null, dir: null };
  u /= n;
  v /= n;
  const dir = (Math.atan2(-u, -v) * 180) / Math.PI;
  return { wind: Math.hypot(u, v), dir: (dir + 360) % 360 };
}

/** Linear interpolation of a scalar profile field at altitude z (points
 * sorted by z ascending; null outside the model's own range). */
function lerpAt(
  points: ProfilePoint[],
  z: number,
  get: (p: ProfilePoint) => number | null,
): number | null {
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    if (!a || !b) break;
    if (a.z <= z && z <= b.z) {
      const av = get(a);
      const bv = get(b);
      if (av == null || bv == null) return av ?? bv;
      return av + ((bv - av) * (z - a.z)) / (b.z - a.z);
    }
  }
  return null;
}

/** Average the models' profiles level by level. Models have different
 * level grids (and surface elevations), so each profile is first
 * interpolated onto a common 100 m grid, then the scalars are averaged
 * (wind as vectors) — null where no model reaches. */
function averageProfile(models: ProfilePoint[][], grid: number[]): ProfilePoint[] {
  return grid.map((z) => {
    const { wind, dir } = meanWind(
      models.map((pts) => lerpAt(pts, z, (p) => p.wind)),
      models.map((pts) => lerpAt(pts, z, (p) => p.dir)),
    );
    return {
      z,
      src: "avg",
      t: r1(meanOf(models.map((pts) => lerpAt(pts, z, (p) => p.t)))),
      rh: ri(meanOf(models.map((pts) => lerpAt(pts, z, (p) => p.rh)))),
      td: r1(meanOf(models.map((pts) => lerpAt(pts, z, (p) => p.td)))),
      cloud: ri(meanOf(models.map((pts) => lerpAt(pts, z, (p) => p.cloud)))),
      // wind speeds are always integers, like everywhere in the app
      wind: wind == null ? null : Math.round(wind),
      dir: dir == null ? null : Math.round(dir),
    };
  });
}

function averageSurface(surfaces: Surface[]): Surface {
  const { wind, dir } = meanWind(
    surfaces.map((s) => s.wind10),
    surfaces.map((s) => s.dir10),
  );
  return {
    t2m: r1(meanOf(surfaces.map((s) => s.t2m))),
    rh2m: ri(meanOf(surfaces.map((s) => s.rh2m))),
    wind10: wind == null ? null : Math.round(wind),
    dir10: dir == null ? null : Math.round(dir),
    gust10: ri(meanOf(surfaces.map((s) => s.gust10))),
    cape: ri(meanOf(surfaces.map((s) => s.cape))),
    precip: r1(meanOf(surfaces.map((s) => s.precip))),
    cloudLow: ri(meanOf(surfaces.map((s) => s.cloudLow))),
    cloudMid: ri(meanOf(surfaces.map((s) => s.cloudMid))),
    cloudHigh: ri(meanOf(surfaces.map((s) => s.cloudHigh))),
    cloudBaseM: ri(meanOf(surfaces.map((s) => s.cloudBaseM))),
    psfc: r1(meanOf(surfaces.map((s) => s.psfc))),
  };
}

/** Average the models' hours on their shared timeline: every hour present
 * in at least one model contributes, each field means the models that
 * have it. Profiles land on a common 100 m grid. */
export function averageHours(list: Hour[][]): Hour[] {
  const times = new Set<string>();
  for (const hours of list) for (const h of hours) times.add(h.time);
  const out: Hour[] = [];
  for (const time of [...times].sort()) {
    const hours = list
      .map((hs) => hs.find((h) => h.time === time))
      .filter((h): h is Hour => h != null);
    if (hours.length === 0) continue;
    // the grid starts at the first altitude where the lowest-reaching model
    // actually has data (rounded up to 100 m): levels below any model's own
    // surface carry nulls there, and the convective layer math needs a real
    // profile[0] (surface Td) — a null-filled start kills the shading
    const zLo = Math.min(
      ...hours.map((h) => Math.min(...h.profile.map((p) => p.z))),
    );
    const maxZ = Math.max(0, ...hours.flatMap((h) => h.profile.map((p) => p.z)));
    const grid: number[] = [];
    for (let z = Math.ceil(zLo / 100) * 100; z <= maxZ; z += 100) grid.push(z);
    out.push({
      time,
      surface: averageSurface(hours.map((h) => h.surface)),
      profile: averageProfile(
        hours.map((h) => h.profile),
        grid,
      ),
    });
  }
  return out;
}

/** The ensemble mean of the model boards' payloads, shaped like a
 * response so the existing Windgram/Sounding renderers work as-is.
 * null below two models: averaging one model is a no-op. */
export function averageResponses(responses: AromeResponse[]): AromeResponse | null {
  const first = responses[0];
  if (!first || responses.length < 2) return null;
  // the most recent run: what the mean is anchored to
  const runInitUtc =
    responses.map((r) => r.runInitUtc).sort().at(-1) ?? first.runInitUtc;
  return {
    model: "Average",
    grid: "",
    source: first.source,
    lat: first.lat,
    lon: first.lon,
    modelElevationM: Math.round(
      meanOf(responses.map((r) => r.modelElevationM)) ?? first.modelElevationM,
    ),
    nearestCell: first.nearestCell,
    runInitUtc,
    runAvailable: first.runAvailable,
    timezone: first.timezone,
    fetchedAt: first.fetchedAt,
    hours: averageHours(responses.map((r) => r.hours)),
    warnings: [],
    attribution: first.attribution,
  };
}
