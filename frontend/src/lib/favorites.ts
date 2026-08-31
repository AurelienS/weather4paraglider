import { loadVersioned, storeVersioned } from "./storage";

export type Favorite = {
  lat: number;
  lon: number;
  label: string;
};

const KEY = "w4p.favorites.v1";
const VERSION = 1;

function parseList(data: unknown): Favorite[] | null {
  if (!Array.isArray(data)) return null;
  const list: Favorite[] = [];
  for (const item of data) {
    if (item == null || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    if (typeof rec.lat !== "number" || typeof rec.lon !== "number") continue;
    list.push({
      lat: rec.lat,
      lon: rec.lon,
      label:
        typeof rec.label === "string" && rec.label.trim()
          ? rec.label
          : `${rec.lat.toFixed(4)}, ${rec.lon.toFixed(4)}`,
    });
  }
  return list;
}

export function loadFavorites(): Favorite[] {
  const outcome = loadVersioned<Favorite[]>(KEY, {
    current: VERSION,
    parse: parseList,
  });
  return outcome.data ?? [];
}

export function storeFavorites(list: Favorite[]): void {
  storeVersioned(KEY, list, VERSION);
}

/** Recently visited places, shown on the main page: same shape as
 * favorites, recorded on every place selection, most recent first. */
export const RECENT_KEY = "w4p.recentPlaces.v1";
export const RECENT_VERSION = 1;
export const MAX_RECENT_PLACES = 10;

export function loadRecentPlaces(): Favorite[] {
  const outcome = loadVersioned<Favorite[]>(RECENT_KEY, {
    current: RECENT_VERSION,
    parse: parseList,
  });
  return outcome.data ?? [];
}

export function storeRecentPlaces(list: Favorite[]): void {
  storeVersioned(RECENT_KEY, list, RECENT_VERSION);
}

/** Record a place visit: same coordinates move to the front with the fresh
 * label, the list is capped. */
export function recordRecentPlace(list: Favorite[], pin: Favorite): Favorite[] {
  const key = (p: { lat: number; lon: number }) => `${p.lat.toFixed(4)},${p.lon.toFixed(4)}`;
  const filtered = list.filter((p) => key(p) !== key(pin));
  return [{ ...pin }, ...filtered].slice(0, MAX_RECENT_PLACES);
}
