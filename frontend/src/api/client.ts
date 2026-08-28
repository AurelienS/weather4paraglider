import { readPointCache, writePointCache } from "./cache";
import { assembleResponse, cacheSlotUtc, resolveWindow, roundPoint } from "./pipeline";
import { fetchOpenMeteo, OpenMeteoError } from "./openmeteo";
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

function friendlyMessage(err: unknown): string {
  if (err instanceof OpenMeteoError && err.status === 429) {
    return (
      "Open-Meteo rate limit reached for your connection. " +
      "The app queries this free service directly; its quota is counted " +
      "per user and renews over time. The local cache already limits " +
      "calls — try again in a few minutes."
    );
  }
  if (err instanceof OpenMeteoError && err.status >= 500) {
    return (
      "Open-Meteo is temporarily unavailable. " +
      "Try again in a moment — the data should come back."
    );
  }
  if (err instanceof OpenMeteoError) {
    return err.message;
  }
  if (err instanceof Error && err.message.includes("fetch")) {
    return "Could not reach Open-Meteo — check your internet connection.";
  }
  return err instanceof Error && err.message
    ? err.message
    : "Une erreur inattendue est survenue.";
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
    throw err instanceof ApiError ? err : new ApiError(friendlyMessage(err), 502);
  }

  const payload = assembleResponse(lat, lon, raw, slot, window);
  writePointCache(key, slot, window.fromISO, window.toISO, payload);
  return payload;
}
