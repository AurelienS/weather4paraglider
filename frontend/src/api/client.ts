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
      "Limite d'Open-Meteo atteinte pour ta connexion. " +
      "L'appli interroge directement ce service gratuit, dont le quota est " +
      "compté par utilisateur et se renouvelle avec le temps. " +
      "Le cache local limite déjà les appels : réessaie dans quelques minutes."
    );
  }
  if (err instanceof OpenMeteoError && err.status >= 500) {
    return (
      "Open-Meteo est momentanément indisponible. " +
      "Réessaie dans un instant, les données devraient revenir."
    );
  }
  if (err instanceof OpenMeteoError) {
    return err.message;
  }
  if (err instanceof Error && err.message.includes("fetch")) {
    return "Impossible de joindre Open-Meteo — vérifier ta connexion internet.";
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
