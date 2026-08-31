
import {
  loadFavorites,
  loadRecentPlaces,
  recordRecentPlace,
  storeFavorites,
  storeRecentPlaces,
  type Favorite,
} from "../lib/favorites";
import { storeLang, loadLang, type Lang } from "../lib/i18n";
import { applyTheme, loadTheme, otherTheme, storeTheme, type Theme } from "../lib/theme";
import { findPlaceEntry } from "../lib/compare";
import { pinKey } from "../lib/pins";
import type { SliceCreator } from "./index";

export type PrefsSlice = {
  theme: Theme;
  favs: Favorite[];
  /** Recently visited places, most recent first, shown on the main page. */
  recentPlaces: Favorite[];
  lang: Lang;

  toggleTheme: () => void;
  /** Persisting setter; re-runs the (cache-served) loads so user-facing
   * error messages come back in the new language. */
  setLang: (next: Lang) => void;

  /** Add the current place, named after the known label, the board pin or
   * the bare coordinates. No-op when already saved. */
  addFavorite: () => void;
  removeFavorite: (fav: Favorite) => void;
  /** Record a place visit (called by submitPlace). */
  addRecentPlace: (pin: Favorite) => void;
};

export const createPrefsSlice: SliceCreator<PrefsSlice> = (set, get) => ({
  theme: loadTheme(),
  favs: loadFavorites(),
  recentPlaces: loadRecentPlaces(),
  lang: loadLang(),

  toggleTheme: () => {
    const next = otherTheme(get().theme);
    storeTheme(next);
    applyTheme(next);
    set({ theme: next });
  },

  setLang: (next) => {
    if (next === get().lang) return;
    storeLang(next);
    set({ lang: next });
    get().loadMain();
    get().loadEntries();
  },

  addFavorite: () => {
    const { point, place, entries, favs } = get();
    const key = `${point.lat.toFixed(4)},${point.lon.toFixed(4)}`;
    if (favs.some((f) => `${f.lat.toFixed(4)},${f.lon.toFixed(4)}` === key)) return;
    // reuse the board's stored name when the place label is not known (reload)
    const mainPinName = findPlaceEntry(entries, pinKey(point))?.name;
    const next: Favorite[] = [
      {
        lat: point.lat,
        lon: point.lon,
        label: place ?? mainPinName ?? `${point.lat.toFixed(4)}, ${point.lon.toFixed(4)}`,
      },
      ...favs,
    ];
    storeFavorites(next);
    set({ favs: next });
  },

  removeFavorite: (fav) => {
    const next = get().favs.filter((f) => f !== fav);
    storeFavorites(next);
    set({ favs: next });
  },

  addRecentPlace: (pin) => {
    const next = recordRecentPlace(get().recentPlaces, pin);
    storeRecentPlaces(next);
    set({ recentPlaces: next });
  },
});
