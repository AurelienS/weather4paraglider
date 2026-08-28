import type { Page, Route } from "@playwright/test";
import { hourlyVars } from "../src/api/openmeteo";

const GEO_HEIGHTS: Record<string, number> = {
  "1000": 140,
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

function stamp(dayOffset: number, hour: number): string {
  const now = new Date();
  const d = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + dayOffset, hour),
  );
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(d);
  return `${date}T${pad(hour)}:00`;
}

function valueFor(v: string, i: number): number {
  const hour = i % 24;
  const t2 = 9 + 6 * Math.sin(((hour - 9) / 24) * Math.PI * 2);
  if (v === "temperature_2m") return Math.round(t2 * 10) / 10;
  if (v === "dew_point_2m") return Math.round((t2 - 3) * 10) / 10;
  if (v === "relative_humidity_2m") return 65;
  if (v === "wind_speed_10m") return 8 + (i % 5);
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
  if (pr) return Math.round((15 - (1000 - Number(pr[1])) * 0.007) * 10) / 10;
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

function buildPayload(elev: number): Record<string, unknown> {
  const time: string[] = [];
  for (let i = 0; i < 72; i++) time.push(stamp(Math.floor(i / 24), i % 24));
  const hourly: Record<string, Array<number | string | null>> = { time };
  for (const v of hourlyVars()) {
    if (v === "time") continue;
    hourly[v] = time.map((_, i) => valueFor(v, i));
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
};

export async function mockOpenMeteo(
  page: Page,
  opts: { status?: number; elev?: number } = {},
): Promise<OmMock> {
  let count = 0;
  await page.route("**/api.open-meteo.com/**", (route: Route) => {
    count += 1;
    if (opts.status) {
      return route.fulfill({
        status: opts.status,
        contentType: "application/json",
        body: JSON.stringify({ error: true, reason: "mock failure" }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(buildPayload(opts.elev ?? 1696)),
    });
  });
  return { calls: () => count };
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
