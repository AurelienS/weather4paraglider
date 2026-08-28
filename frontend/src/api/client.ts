import { readPointCache, writePointCache } from "./cache";
import { assembleResponse, cacheSlotUtc, resolveWindow, roundPoint } from "./pipeline";
import { fetchOpenMeteo, NO_DATA_REASON, OpenMeteoError } from "./openmeteo";
import type { AromeResponse } from "./types";
import { inModelDomain, modelById, type ModelDef, type ModelId } from "./models";
import { dict, type Lang } from "../lib/i18n";

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function noDataMessage(model: ModelDef, lang: Lang): string {
  return dict(lang).errNoData.replace("{model}", model.label);
}

function friendlyMessage(err: unknown, lang: Lang): string {
  const t = dict(lang);
  if (err instanceof OpenMeteoError && err.status === 429) {
    return t.errRateLimit;
  }
  if (err instanceof OpenMeteoError && err.status >= 500) {
    return t.errServer;
  }
  if (err instanceof OpenMeteoError) {
    return err.message;
  }
  if (err instanceof Error && err.message.includes("fetch")) {
    return t.errNetwork;
  }
  return err instanceof Error && err.message ? err.message : t.errUnexpected;
}

export type FetchAromeOpts = {
  force?: boolean;
  signal?: AbortSignal;
  /** Language for the user-facing error messages. */
  lang?: Lang;
};

// identical concurrent requests share one in-flight Open-Meteo call; the call
// is only cancelled once every caller has aborted
type Inflight = {
  aborted: boolean;
  join(signal: AbortSignal | undefined): Promise<AromeResponse>;
};

const inflight = new Map<string, Inflight>();

function makeInflight(
  run: (signal: AbortSignal) => Promise<AromeResponse>,
): Inflight {
  const controller = new AbortController();
  const listeners = new Map<AbortSignal, () => void>();
  const promise = run(controller.signal).finally(() => {
    for (const [signal, fn] of listeners) signal.removeEventListener("abort", fn);
    listeners.clear();
  });
  return {
    get aborted() {
      return controller.signal.aborted;
    },
    join(signal) {
      if (signal && !signal.aborted) {
        const onAbort = () => {
          listeners.delete(signal);
          signal.removeEventListener("abort", onAbort);
          if (listeners.size === 0) controller.abort();
        };
        listeners.set(signal, onAbort);
        signal.addEventListener("abort", onAbort);
      }
      return promise;
    },
  };
}

export async function fetchArome(
  lat: number,
  lon: number,
  modelId: ModelId,
  opts: FetchAromeOpts = {},
): Promise<AromeResponse> {
  const lang = opts.lang ?? "en";
  const model = modelById(modelId);
  if (!inModelDomain(lat, lon, model.domain)) {
    throw new ApiError(noDataMessage(model, lang), 400);
  }
  const slot = cacheSlotUtc(Date.now(), model.slotHours);
  const window = resolveWindow(Date.now(), model.days);
  const [rlat, rlon] = roundPoint(lat, lon);
  const key = `${model.id}|${rlat.toFixed(3)}_${rlon.toFixed(3)}|${slot}|${window.fromISO}|${window.toISO}`;

  if (!opts.force) {
    const cached = readPointCache(key, slot, window.fromISO, window.toISO);
    if (cached) return cached;
  }

  const inflightKey = `${opts.force ? "force" : "cached"}|${key}`;
  const existing = inflight.get(inflightKey);
  if (existing && !existing.aborted) {
    return existing.join(opts.signal);
  }
  if (existing) inflight.delete(inflightKey);

  const request = (signal: AbortSignal): Promise<AromeResponse> =>
    (async () => {
      try {
        let raw;
        try {
          raw = await fetchOpenMeteo(lat, lon, model, { signal });
        } catch (err: unknown) {
          if (err instanceof DOMException && err.name === "AbortError") throw err;
          if (
            err instanceof OpenMeteoError &&
            err.message.includes(NO_DATA_REASON)
          ) {
            throw new ApiError(noDataMessage(model, lang), 400);
          }
          throw err instanceof ApiError ? err : new ApiError(friendlyMessage(err, lang), 502);
        }

        const payload = assembleResponse(lat, lon, model, raw, slot, window);
        writePointCache(key, slot, window.fromISO, window.toISO, payload);
        return payload;
      } finally {
        inflight.delete(inflightKey);
      }
    })();

  const entry = makeInflight(request);
  inflight.set(inflightKey, entry);
  return entry.join(opts.signal);
}
