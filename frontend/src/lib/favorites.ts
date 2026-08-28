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
