import { loadFavorites, loadRecentPlaces, type Favorite } from "./favorites";
import { pinKey } from "./pins";
import { loadVersioned, storeVersioned } from "./storage";

/** Last place the desk showed, so a reload does not wait on reverse geocoding. */
export const PLACE_NAME_KEY = "w4p.placeName.v1";
const PLACE_NAME_VERSION = 1;

type Memory = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

type SavedPlace = { lat: number; lon: number; label: string };

/** True for the coordinate strings the desk uses when it has no name. */
export function isCoordinateLabel(label: string): boolean {
  return /^-?\d+(?:\.\d+)?\s*(?:°\s*)?[NS]?(?:\s+|,\s*)-?\d+(?:\.\d+)?\s*(?:°\s*)?[EW]?$/i.test(
    label.trim(),
  );
}

function parseSaved(data: unknown): SavedPlace | null {
  if (data == null || typeof data !== "object") return null;
  const rec = data as Record<string, unknown>;
  if (typeof rec.lat !== "number" || typeof rec.lon !== "number") return null;
  if (typeof rec.label !== "string") return null;
  const label = rec.label.trim();
  if (!label || isCoordinateLabel(label)) return null;
  return { lat: rec.lat, lon: rec.lon, label };
}

function named(label: string | null | undefined): string | null {
  const text = label?.trim() ?? "";
  if (!text || isCoordinateLabel(text)) return null;
  return text;
}

/** First real name for this point in a saved list. Coordinate stubs are skipped. */
export function knownPlaceLabel(
  lat: number,
  lon: number,
  lists: readonly Favorite[],
): string | null {
  const key = pinKey({ lat, lon });
  for (const item of lists) {
    if (pinKey(item) !== key) continue;
    const label = named(item.label);
    if (label) return label;
  }
  return null;
}

export function rememberPlaceName(
  lat: number,
  lon: number,
  label: string | null | undefined,
  store?: Memory,
): void {
  const text = named(label);
  if (!text) return;
  storeVersioned(PLACE_NAME_KEY, { lat, lon, label: text }, PLACE_NAME_VERSION, store);
}

export function loadRememberedPlaceName(
  lat: number,
  lon: number,
  store?: Memory,
): string | null {
  const saved = loadVersioned(PLACE_NAME_KEY, {
    current: PLACE_NAME_VERSION,
    parse: parseSaved,
  }, store).data;
  if (!saved || pinKey(saved) !== pinKey({ lat, lon })) return null;
  return saved.label;
}

/** Name to show for a point before any network call: the last label we
 * showed, then a favorite, then a recent place. */
export function placeNameForPoint(
  lat: number,
  lon: number,
  favs: readonly Favorite[] = loadFavorites(),
  recents: readonly Favorite[] = loadRecentPlaces(),
  store?: Memory,
): string | null {
  return (
    loadRememberedPlaceName(lat, lon, store) ??
    knownPlaceLabel(lat, lon, favs) ??
    knownPlaceLabel(lat, lon, recents)
  );
}
