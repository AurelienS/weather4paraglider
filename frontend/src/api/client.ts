import { readPointCache, writePointCache } from "./cache";
import { assembleResponse, cacheSlotUtc, resolveWindow, roundPoint } from "./pipeline";
import { fetchOpenMeteo, NO_DATA_REASON, OpenMeteoError } from "./openmeteo";
import type { AromeResponse } from "./types";
import { inModelDomain, modelById, type ModelDef, type ModelId } from "./models";

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function noDataMessage(model: ModelDef): string {
  return (
    `${model.label} has no data for this location: this model covers a smaller area. ` +
    "Pick another model in the toolbar (AROME covers all of France)."
  );
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
    : "An unexpected error occurred.";
}

export type FetchAromeOpts = {
  force?: boolean;
  signal?: AbortSignal;
};

export async function fetchArome(
  lat: number,
  lon: number,
  modelId: ModelId,
  opts: FetchAromeOpts = {},
): Promise<AromeResponse> {
  const model = modelById(modelId);
  if (!inModelDomain(lat, lon, model.domain)) {
    throw new ApiError(noDataMessage(model), 400);
  }
  const slot = cacheSlotUtc(Date.now(), model.slotHours);
  const window = resolveWindow(Date.now(), model.days);
  const [rlat, rlon] = roundPoint(lat, lon);
  const key = `${model.id}|${rlat.toFixed(2)}_${rlon.toFixed(2)}|${slot}|${window.fromISO}|${window.toISO}`;

  if (!opts.force) {
    const cached = readPointCache(key, slot, window.fromISO, window.toISO);
    if (cached) return cached;
  }

  let raw;
  try {
    raw = await fetchOpenMeteo(lat, lon, model, { signal: opts.signal });
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    if (
      err instanceof OpenMeteoError &&
      err.message.includes(NO_DATA_REASON)
    ) {
      throw new ApiError(noDataMessage(model), 400);
    }
    throw err instanceof ApiError ? err : new ApiError(friendlyMessage(err), 502);
  }

  const payload = assembleResponse(lat, lon, model, raw, slot, window);
  writePointCache(key, slot, window.fromISO, window.toISO, payload);
  return payload;
}
