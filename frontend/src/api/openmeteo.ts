const OM_URL = "https://api.open-meteo.com/v1/meteofrance";

export const OM_MODEL = "arome_france";
export const OM_GRID = "0.025";

export const HEIGHT_AGL_M: readonly number[] = [20, 50, 100, 150, 200];

export const PRESSURE_HPA: readonly number[] = [
  1000, 950, 925, 900, 850, 800, 750, 700, 650, 600, 550, 500,
];

export type OpenMeteoRaw = {
  latitude?: number;
  longitude?: number;
  elevation?: number;
  hourly?: Record<string, Array<number | string | null>>;
  error?: boolean;
  reason?: string;
};

export function hourlyVars(): string[] {
  const vars: string[] = [
    "temperature_2m",
    "relative_humidity_2m",
    "dew_point_2m",
    "wind_speed_10m",
    "wind_direction_10m",
    "wind_gusts_10m",
    "cape",
    "precipitation",
    "cloud_cover_low",
    "cloud_cover_mid",
    "cloud_cover_high",
    "surface_pressure",
  ];
  for (const h of HEIGHT_AGL_M) {
    vars.push(`temperature_${h}m`, `wind_speed_${h}m`, `wind_direction_${h}m`);
  }
  for (const p of PRESSURE_HPA) {
    vars.push(
      `temperature_${p}hPa`,
      `dew_point_${p}hPa`,
      `relative_humidity_${p}hPa`,
      `cloud_cover_${p}hPa`,
      `wind_speed_${p}hPa`,
      `wind_direction_${p}hPa`,
      `geopotential_height_${p}hPa`,
    );
  }
  return vars;
}

export class OpenMeteoError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "OpenMeteoError";
    this.status = status;
  }
}

async function readReason(res: Response): Promise<string> {
  const text = await res.text().catch(() => "");
  try {
    const body = JSON.parse(text) as { reason?: unknown };
    if (body && typeof body.reason === "string" && body.reason.trim()) {
      return body.reason.trim();
    }
  } catch {
    return text.slice(0, 200);
  }
  return text.slice(0, 200);
}

export async function fetchOpenMeteo(
  lat: number,
  lon: number,
  opts: { signal?: AbortSignal; forecastDays?: number } = {},
): Promise<OpenMeteoRaw> {
  const params = new URLSearchParams({
    latitude: lat.toFixed(5),
    longitude: lon.toFixed(5),
    hourly: hourlyVars().join(","),
    models: OM_MODEL,
    forecast_days: String(opts.forecastDays ?? 3),
    timezone: "Europe/Paris",
    wind_speed_unit: "kmh",
    temperature_unit: "celsius",
    cell_selection: "nearest",
    elevation: "nan",
  });
  const res = await fetch(`${OM_URL}?${params.toString()}`, { signal: opts.signal });
  if (!res.ok) {
    throw new OpenMeteoError(
      `Open-Meteo HTTP ${res.status} : ${(await readReason(res)) || res.statusText}`,
      res.status,
    );
  }
  const payload = (await res.json()) as OpenMeteoRaw;
  if (payload.error) {
    throw new OpenMeteoError(
      String(payload.reason ?? "Réponse Open-Meteo en erreur"),
      502,
    );
  }
  return payload;
}
