import { apiVarsFor, type ModelDef } from "./models";

const OM_URLS = {
  meteofrance: "https://api.open-meteo.com/v1/meteofrance",
  forecast: "https://api.open-meteo.com/v1/forecast",
} as const;

export const NO_DATA_REASON = "No data is available for this location";

export type OpenMeteoRaw = {
  latitude?: number;
  longitude?: number;
  elevation?: number;
  hourly?: Record<string, Array<number | string | null>>;
  minutely_15?: Record<string, Array<number | string | null>>;
  error?: boolean;
  reason?: string;
};

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

export function decimateMinutelyToHourly(raw: OpenMeteoRaw): OpenMeteoRaw {  const m15 = raw.minutely_15 ?? {};
  const times = (m15.time ?? []) as string[];
  const kept: number[] = [];
  const time: string[] = [];
  times.forEach((t, i) => {
    if (typeof t === "string" && t.endsWith(":00")) {
      kept.push(i);
      time.push(t);
    }
  });
  const hourly: Record<string, Array<number | string | null>> = { time };
  for (const [key, series] of Object.entries(m15)) {
    if (key === "time") continue;
    hourly[key] = kept.map((i) => series[i] ?? null);
  }
  const extra = raw.hourly ?? {};
  const extraTimes = (extra.time ?? []) as string[];
  const pos = new Map<string, number>();
  extraTimes.forEach((t, i) => {
    if (typeof t === "string") pos.set(t, i);
  });
  for (const [key, series] of Object.entries(extra)) {
    if (key === "time") continue;
    hourly[key] = time.map((t) => {
      const i = pos.get(t);
      return i == null ? null : (series[i] ?? null);
    });
  }
  return { ...raw, hourly };
}

export async function fetchOpenMeteo(
  lat: number,
  lon: number,
  model: ModelDef,
  opts: { signal?: AbortSignal } = {},
): Promise<OpenMeteoRaw> {
  const params = new URLSearchParams({
    latitude: lat.toFixed(5),
    longitude: lon.toFixed(5),
    forecast_days: String(model.days),
    timezone: "Europe/Paris",
    wind_speed_unit: "kmh",
    temperature_unit: "celsius",
    cell_selection: "nearest",
    elevation: "nan",
  });
  if (model.api === "minutely_15") {
    // The models= parameter rejects the 15-min ids; best-match serves them.
    params.set("minutely_15", apiVarsFor(model).join(","));
    if (model.extraHourlyVars?.length) {
      params.set("hourly", model.extraHourlyVars.join(","));
    }
  } else {
    params.set("models", model.id);
    params.set("hourly", apiVarsFor(model).join(","));
  }
  const res = await fetch(`${OM_URLS[model.endpoint]}?${params.toString()}`, {
    signal: opts.signal,
  });
  if (!res.ok) {
    throw new OpenMeteoError(
      `Open-Meteo HTTP ${res.status} : ${(await readReason(res)) || res.statusText}`,
      res.status,
    );
  }
  const text = await res.text();
  let payload: OpenMeteoRaw;
  try {
    payload = JSON.parse(text) as OpenMeteoRaw;
  } catch {
    // Out-of-domain points return 200 with invalid JSON ({"latitude":nan,...}).
    throw new OpenMeteoError(NO_DATA_REASON, 400);
  }
  if (payload.error) {
    throw new OpenMeteoError(
      String(payload.reason ?? "Open-Meteo returned an error response"),
      502,
    );
  }
  if (model.api === "minutely_15") return decimateMinutelyToHourly(payload);
  if (!payload.hourly?.time?.length) {
    throw new OpenMeteoError(NO_DATA_REASON, 400);
  }
  return payload;
}
