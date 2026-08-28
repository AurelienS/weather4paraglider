import { readPointCache, writePointCache } from "./cache";
import { assembleResponse, cacheSlotUtc, resolveWindow, roundPoint } from "./pipeline";
import { fetchOpenMeteo } from "./openmeteo";
import type { AromeResponse } from "./types";
import { inAromeDomain } from "../lib/geocode";

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export type FetchAromeOpts = {
  force?: boolean;
  signal?: AbortSignal;
};

export async function fetchArome(
  lat: number,
  lon: number,
  opts: FetchAromeOpts = {},
): Promise<AromeResponse> {
  if (!inAromeDomain(lat, lon)) {
    throw new ApiError(
      "Point hors domaine AROME (lat 37.5–55.4 N, lon 12 W–16 E).",
      400,
    );
  }
  const slot = cacheSlotUtc();
  const window = resolveWindow();
  const [rlat, rlon] = roundPoint(lat, lon);
  const key = `${rlat.toFixed(2)}_${rlon.toFixed(2)}|${slot}|${window.fromISO}|${window.toISO}`;

  if (!opts.force) {
    const cached = readPointCache(key, slot, window.fromISO, window.toISO);
    if (cached) return cached;
  }

  let raw;
  try {
    raw = await fetchOpenMeteo(lat, lon, { signal: opts.signal });
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw err instanceof ApiError
      ? err
      : new ApiError(
          err instanceof Error ? err.message : "Appel Open-Meteo impossible",
          502,
        );
  }

  const payload = assembleResponse(lat, lon, raw, slot, window);
  writePointCache(key, slot, window.fromISO, window.toISO, payload);
  return payload;
}
