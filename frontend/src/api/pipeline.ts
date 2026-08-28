import { HEIGHT_AGL_M, OM_GRID, OM_MODEL, PRESSURE_HPA, type OpenMeteoRaw } from "./openmeteo";
import type { AromeResponse, Hour, ProfilePoint, Surface } from "./types";

export const MERGE_MIN_DZ_M = 80;
export const PROFILE_Z_MAX_M = 6000;
export const CLOUD_BASE_RH = 90;
export const CLOUD_BASE_FRACT = 50;

export const CLOUD_BASE_RULE =
  `cloudBaseM = AMSL of the first profile level (z ascending) where ` +
  `RH >= ${CLOUD_BASE_RH} % or CLD_FRACT >= ${CLOUD_BASE_FRACT} %; ` +
  "null otherwise. No interpolation.";

const PARIS = "Europe/Paris";

const PARTS_FMT = new Intl.DateTimeFormat("en-US", {
  timeZone: PARIS,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const OFFSET_FMT = new Intl.DateTimeFormat("en-US", {
  timeZone: PARIS,
  timeZoneName: "longOffset",
});

type WallParts = { y: number; m: number; d: number; h: number; min: number };

function parisParts(ms: number): WallParts {
  const parts = PARTS_FMT.formatToParts(new Date(ms));
  const get = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((p) => p.type === type)?.value ?? "0");
  const h24 = get("hour");
  return {
    y: get("year"),
    m: get("month"),
    d: get("day"),
    h: h24 === 24 ? 0 : h24,
    min: get("minute"),
  };
}

function parisOffsetMs(pseudoUtcMs: number): number {
  const name =
    OFFSET_FMT.formatToParts(new Date(pseudoUtcMs))
      .find((p) => p.type === "timeZoneName")
      ?.value ?? "GMT+00:00";
  const m = /GMT([+-])(\d{1,2})(?::(\d{2}))?/.exec(name);
  if (!m) return 0;
  const sign = m[1] === "-" ? -1 : 1;
  return sign * (Number(m[2]) * 60 + Number(m[3] ?? "0")) * 60000;
}

const pad = (n: number): string => String(n).padStart(2, "0");

function naiveISO(p: WallParts, h: number, min: number): string {
  return `${p.y}-${pad(p.m)}-${pad(p.d)}T${pad(h)}:${pad(min)}`;
}

function offsetString(deltaMs: number): string {
  const total = Math.round(Math.abs(deltaMs) / 60000);
  const sign = deltaMs < 0 ? "-" : "+";
  return `${sign}${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}

function parseParisWall(value: string): { instant: number; offsetMs: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value.trim());
  if (!m) return null;
  const pseudo = Date.UTC(
    Number(m[1]),
    Number(m[2]) - 1,
    Number(m[3]),
    Number(m[4]),
    Number(m[5]),
  );
  const offsetMs = parisOffsetMs(pseudo);
  return { instant: pseudo - offsetMs, offsetMs };
}

export function cacheSlotUtc(nowMs: number = Date.now()): string {
  const d = new Date(nowMs);
  d.setUTCMinutes(0, 0, 0);
  d.setUTCHours(d.getUTCHours() - (d.getUTCHours() % 3));
  return `${d.toISOString().slice(0, 19)}Z`;
}

export type TimeWindow = {
  start: number;
  end: number;
  fromISO: string;
  toISO: string;
};

export function resolveWindow(nowMs: number = Date.now()): TimeWindow {
  const startParts = parisParts(nowMs);
  const startPseudo = Date.UTC(startParts.y, startParts.m - 1, startParts.d, 7, 0);
  const start = startPseudo - parisOffsetMs(startPseudo);
  const endParts = parisParts(nowMs + 2 * 86_400_000);
  const endPseudo = Date.UTC(endParts.y, endParts.m - 1, endParts.d, 22, 0);
  const end = endPseudo - parisOffsetMs(endPseudo);
  return {
    start,
    end,
    fromISO: `${naiveISO(startParts, 7, 0)}:00${offsetString(startPseudo - start)}`,
    toISO: `${naiveISO(endParts, 22, 0)}:00${offsetString(endPseudo - end)}`,
  };
}

export function roundPoint(lat: number, lon: number): [number, number] {
  const r = (v: number): number => Number((Math.round(v / 0.01) * 0.01).toFixed(4));
  return [r(lat), r(lon)];
}

function num(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

const r1 = (x: number | null): number | null => (x == null ? null : Math.round(x * 10) / 10);
const ri = (x: number | null): number | null => (x == null ? null : Math.round(x));

type Hourly = Record<string, Array<number | string | null>>;

function at(hourly: Hourly, key: string, index: number): number | null {
  const series = hourly[key];
  if (!Array.isArray(series) || index >= series.length) return null;
  return num(series[index]);
}

function heightPoints(hourly: Hourly, i: number, elev: number): ProfilePoint[] {
  const points: ProfilePoint[] = [
    {
      z: Math.round(elev + 2),
      src: "h2",
      t: r1(at(hourly, "temperature_2m", i)),
      rh: ri(at(hourly, "relative_humidity_2m", i)),
      td: r1(at(hourly, "dew_point_2m", i)),
      wind: ri(at(hourly, "wind_speed_10m", i)),
      dir: ri(at(hourly, "wind_direction_10m", i)),
      cloud: null,
    },
  ];
  for (const h of HEIGHT_AGL_M) {
    const t = at(hourly, `temperature_${h}m`, i);
    const wind = at(hourly, `wind_speed_${h}m`, i);
    const dir = at(hourly, `wind_direction_${h}m`, i);
    if (t == null && wind == null && dir == null) continue;
    points.push({
      z: Math.round(elev + h),
      src: `h${h}`,
      t: r1(t),
      rh: null,
      td: null,
      wind: ri(wind),
      dir: ri(dir),
      cloud: null,
    });
  }
  return points;
}

function isobarPoints(hourly: Hourly, i: number): ProfilePoint[] {
  const points: ProfilePoint[] = [];
  for (const p of PRESSURE_HPA) {
    const z = at(hourly, `geopotential_height_${p}hPa`, i);
    if (z == null) continue;
    points.push({
      z: Math.round(z),
      src: `p${p}`,
      t: r1(at(hourly, `temperature_${p}hPa`, i)),
      rh: ri(at(hourly, `relative_humidity_${p}hPa`, i)),
      td: r1(at(hourly, `dew_point_${p}hPa`, i)),
      wind: ri(at(hourly, `wind_speed_${p}hPa`, i)),
      dir: ri(at(hourly, `wind_direction_${p}hPa`, i)),
      cloud: ri(at(hourly, `cloud_cover_${p}hPa`, i)),
    });
  }
  return points;
}

export function fuseProfile(
  heights: ProfilePoint[],
  isobars: ProfilePoint[],
  modelElev: number,
): ProfilePoint[] {
  const keptIso = isobars.filter(
    (pt) =>
      pt.z >= modelElev && !heights.some((h) => Math.abs(pt.z - h.z) < MERGE_MIN_DZ_M),
  );
  return [...heights, ...keptIso]
    .sort((a, b) => a.z - b.z)
    .filter((p) => p.z <= PROFILE_Z_MAX_M);
}

export function estimateCloudBase(profile: ProfilePoint[]): number | null {
  for (const pt of profile) {
    if ((pt.rh != null && pt.rh >= CLOUD_BASE_RH) || (pt.cloud != null && pt.cloud >= CLOUD_BASE_FRACT)) {
      return pt.z;
    }
  }
  return null;
}

function surfaceOf(hourly: Hourly, i: number, profile: ProfilePoint[]): Surface {
  return {
    t2m: r1(at(hourly, "temperature_2m", i)),
    rh2m: ri(at(hourly, "relative_humidity_2m", i)),
    wind10: ri(at(hourly, "wind_speed_10m", i)),
    dir10: ri(at(hourly, "wind_direction_10m", i)),
    gust10: ri(at(hourly, "wind_gusts_10m", i)),
    cape: ri(at(hourly, "cape", i)),
    precip: r1(at(hourly, "precipitation", i)),
    cloudLow: ri(at(hourly, "cloud_cover_low", i)),
    cloudMid: ri(at(hourly, "cloud_cover_mid", i)),
    cloudHigh: ri(at(hourly, "cloud_cover_high", i)),
    cloudBaseM: estimateCloudBase(profile),
    psfc: r1(at(hourly, "surface_pressure", i)),
  };
}

export function assembleResponse(
  lat: number,
  lon: number,
  raw: OpenMeteoRaw,
  slot: string,
  window: TimeWindow,
): AromeResponse {
  const hourly: Hourly = raw.hourly ?? {};
  const times = (hourly.time ?? []) as string[];
  const elev = num(raw.elevation) ?? 0;
  const [rlat, rlon] = roundPoint(lat, lon);
  const warnings = [
    "source=open-meteo models=arome_france (0.025°). No seamless, no HD, no ARPEGE.",
    "runInitUtc = Open-Meteo 3 h cache slot, not the Météo-France run init time.",
    "Isobaric Td: derived by Open-Meteo from T+RH. AGL Td beyond 2 m: null (not published).",
    CLOUD_BASE_RULE,
  ];

  const hours: Hour[] = [];
  for (let i = 0; i < times.length; i++) {
    const parsed = parseParisWall(times[i] ?? "");
    if (!parsed) continue;
    if (parsed.instant < window.start || parsed.instant > window.end) continue;
    const profile = fuseProfile(
      heightPoints(hourly, i, elev),
      isobarPoints(hourly, i),
      elev,
    );
    hours.push({
      time: `${times[i]}:00${offsetString(parsed.offsetMs)}`,
      surface: surfaceOf(hourly, i, profile),
      profile,
    });
  }

  return {
    model: "AROME",
    grid: OM_GRID,
    source: "open-meteo",
    openMeteoModel: OM_MODEL,
    lat,
    lon,
    modelElevationM: Math.round(elev),
    nearestCell: { lat: num(raw.latitude) ?? rlat, lon: num(raw.longitude) ?? rlon },
    runInitUtc: slot,
    runAvailable: true,
    timezone: PARIS,
    fetchedAt: new Date().toISOString().slice(0, 19) + "Z",
    hours,
    warnings,
    cloudBaseRule: CLOUD_BASE_RULE,
    attribution:
      "Météo-France AROME data via Open-Meteo (CC BY 4.0). " +
      "Licence Ouverte 2.0 / Météo-France. " +
      "https://open-meteo.com/en/licence",
  };
}
