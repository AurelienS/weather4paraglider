
import { DEMO_POINT } from "../lib/format";
import { placeText, reverseGeocode } from "../lib/geocode";
import { DEFAULT_MODEL } from "../api/models";
import type { Point } from "./types";
import type { SliceCreator } from "./index";

export type LocationSlice = {
  point: Point;
  /** Human-readable place label; null until known (reverse geocoding). */
  place: string | null;

  /** Reverse geocode the current point once, so the header shows a place
   * name instead of bare coordinates. No-op when a label is already known. */
  ensurePlace: () => void;

  /** Submit handler shared by the place search, the favorites and the map:
   * loads the new place and, in compare mode, pins it on the board. */
  submitPlace: (lat: number, lon: number, label?: string | null) => void;

  /** Logo click: back to the demo point with a clean state. */
  goHome: () => void;
};

let placeCtl: AbortController | null = null;

export const createLocationSlice: SliceCreator<LocationSlice> = (set, get) => ({
  point: { lat: DEMO_POINT.lat, lon: DEMO_POINT.lon },
  place: null,

  ensurePlace: () => {
    if (get().place != null) return;
    placeCtl?.abort();
    placeCtl = new AbortController();
    const ctl = placeCtl;
    const { lat, lon } = get().point;
    reverseGeocode(lat, lon, ctl.signal)
      .then((p) => {
        if (ctl.signal.aborted) return;
        if (p) set({ place: placeText(p) });
      })
      .catch(() => {
        // offline or Photon down: keep the coordinate fallback
      });
  },

  submitPlace: (lat, lon, label) => {
    const { point } = get();
    const same = lat === point.lat && lon === point.lon;
    set({ loading: true, error: null, place: label ?? null });
    if (!same) {
      set({ point: { lat, lon } });
      get().ensurePlace();
    }
    get().loadMain();
  },

  goHome: () => {
    set({
      point: { lat: DEMO_POINT.lat, lon: DEMO_POINT.lon },
      place: null,
      modelId: DEFAULT_MODEL,
      day: null,
      hourIdx: 0,
      view: "windgram",
    });
    // leaving compare discards the board and aborts its batch
    if (get().compare) get().toggleCompare(false);
    get().ensurePlace();
    get().loadMain();
  },
});
