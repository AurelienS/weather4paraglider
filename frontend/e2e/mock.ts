import type { Page, Route } from "@playwright/test";
import { allHourlyVars } from "../src/api/models";

const GEO_HEIGHTS: Record<string, number> = {
  "1000": 140,
  "975": 400,
  "950": 640,
  "925": 910,
  "900": 1180,
  "850": 1660,
  "800": 2170,
  "750": 2690,
  "700": 3230,
  "650": 3780,
  "600": 4350,
  "550": 4940,
  "500": 5560,
};

const pad = (n: number): string => String(n).padStart(2, "0");

function stamp(dayOffset: number, hour: number, minute = 0): string {
  const now = new Date();
  const paris = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(now);
  const [y, m, d] = paris.split("-").map(Number);
  const date = new Date(Date.UTC(y!, m! - 1, d! + dayOffset));
  const iso = date.toISOString().slice(0, 10);
  return `${iso}T${pad(hour)}:${pad(minute)}`;
}

function valueFor(v: string, hour: number): number {
  const t2 = 9 + 6 * Math.sin(((hour - 9) / 24) * Math.PI * 2);
  if (v === "temperature_2m") return Math.round(t2 * 10) / 10;
  if (v === "dew_point_2m") return Math.round((t2 - 3) * 10) / 10;
  if (v === "relative_humidity_2m") return 65;
  if (v === "wind_speed_10m") return 8 + (hour % 5);
  if (v === "wind_direction_10m") return 225;
  if (v === "wind_gusts_10m") return 18;
  if (v === "cape") return 120;
  if (v === "precipitation") return hour === 15 ? 0.4 : 0;
  if (v === "cloud_cover_low") return 15;
  if (v === "cloud_cover_mid") return 25;
  if (v === "cloud_cover_high") return 35;
  if (v === "surface_pressure") return 1013;
  const agl = /^temperature_(\d+)m$/.exec(v);
  if (agl) return Math.round((t2 - Number(agl[1]) * 0.0065) * 10) / 10;
  const wgl = /^wind_speed_(\d+)m$/.exec(v);
  if (wgl) return Math.round((8 + Number(wgl[1]) * 0.12) * 10) / 10;
  if (/^wind_direction_\d+m$/.test(v)) return 230;
  const pr = /^temperature_(\d+)hPa$/.exec(v);
  if (pr) return Math.round((15 - (GEO_HEIGHTS[pr[1]] ?? 0) * 0.0065) * 10) / 10;
  if (/^dew_point_\d+hPa$/.test(v)) return -3;
  if (/^relative_humidity_\d+hPa$/.test(v)) return 55;
  if (/^cloud_cover_\d+hPa$/.test(v)) return 10;
  const ws = /^wind_speed_(\d+)hPa$/.exec(v);
  if (ws) return Math.round((12 + (1000 - Number(ws[1])) * 0.02) * 10) / 10;
  if (/^wind_direction_\d+hPa$/.test(v)) return 245;
  const gz = /^geopotential_height_(\d+)hPa$/.exec(v);
  if (gz) return GEO_HEIGHTS[gz[1]] ?? 1000;
  return 0;
}

function buildPayload(q: URLSearchParams, elev: number, nullsAfter = Infinity): Record<string, unknown> {
  const days = Math.max(1, Number(q.get("forecast_days") ?? "3") || 3);
  const m15 = (q.get("minutely_15") ?? "").split(",").filter(Boolean);
  const hourlyVars = (q.get("hourly") ?? "").split(",").filter(Boolean);
  if (m15.length > 0) {
    const steps = days * 96;
    const time: string[] = [];
    for (let i = 0; i < steps; i++) {
      time.push(stamp(Math.floor(i / 96), Math.floor((i % 96) / 4), (i % 4) * 15));
    }
    const minutely: Record<string, Array<number | string | null>> = { time };
    for (const v of m15) {
      minutely[v] = time.map((_, i) =>
        i >= nullsAfter * 4 ? null : valueFor(v, Math.floor(i / 4) % 24),
      );
    }
    const hourly: Record<string, Array<number | string | null>> = {
      time: time.filter((t) => t.endsWith(":00")),
    };
    for (const v of hourlyVars) {
      hourly[v] = hourly.time.map((_, i) => (i >= nullsAfter ? null : valueFor(v, i % 24)));
    }
    return {
      latitude: 45.95,
      longitude: 6.7,
      elevation: elev,
      hourly,
      minutely_15: minutely,
      utc_offset_seconds: 7200,
    };
  }
  const hours = days * 24;
  const time: string[] = [];
  for (let i = 0; i < hours; i++) time.push(stamp(Math.floor(i / 24), i % 24));
  const hourly: Record<string, Array<number | string | null>> = { time };
  for (const v of hourlyVars.length > 0 ? hourlyVars : allHourlyVars()) {
    hourly[v] = time.map((_, i) => (i >= nullsAfter ? null : valueFor(v, i % 24)));
  }
  return {
    latitude: 45.95,
    longitude: 6.7,
    elevation: elev,
    hourly,
    utc_offset_seconds: 7200,
  };
}

export type OmMock = {
  calls: () => number;
  urls: () => string[];
};

export async function mockOpenMeteo(
  page: Page,
  opts: {
    status?: number;
    elev?: number;
    /** Respond with Open-Meteo's out-of-domain error for this model id. */
    noDataFor?: string;
    /** Delay each response (ms) to observe transient loading states. */
    delay?: number;
    /** Return null values beyond this hour index (time stamps kept, like
        Open-Meteo does beyond a run's horizon). */
    nullsAfterHours?: number;
  } = {},
): Promise<OmMock> {
  let count = 0;
  const urls: string[] = [];
  await page.route("**/api.open-meteo.com/**", async (route: Route) => {
    const url = route.request().url();
    urls.push(url);
    count += 1;
    if (opts.delay) await new Promise((resolve) => setTimeout(resolve, opts.delay));
    const q = new URL(url).searchParams;
    if (opts.status) {
      return route.fulfill({
        status: opts.status,
        contentType: "application/json",
        body: JSON.stringify({ error: true, reason: "mock failure" }),
      });
    }
    if (opts.noDataFor && q.get("models") === opts.noDataFor) {
      return route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ error: true, reason: "No data is available for this location" }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(buildPayload(q, opts.elev ?? 1696, opts.nullsAfterHours ?? Infinity)),
    });
  });
  return { calls: () => count, urls: () => urls };
}

export async function mockPhoton(page: Page): Promise<void> {
  await page.route("**/photon.komoot.io/**", (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        features: [
          {
            geometry: { coordinates: [6.8692, 45.9231] },
            properties: {
              name: "Chamonix-Mont-Blanc",
              city: "Chamonix-Mont-Blanc",
              state: "Auvergne-Rhône-Alpes",
              country: "France",
            },
          },
          {
            geometry: { coordinates: [6.1294, 45.8992] },
            properties: {
              name: "Annecy",
              city: "Annecy",
              state: "Auvergne-Rhône-Alpes",
              country: "France",
            },
          },
        ],
      }),
    }),
  );
}

export async function blockTiles(page: Page): Promise<void> {
  await page.route("**/tile.openstreetmap.org/**", (route: Route) => route.abort());
}
