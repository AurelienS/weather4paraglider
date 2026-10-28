
import { DEMO_POINT } from "../lib/format";
import { placeText, reverseGeocode } from "../lib/geocode";
import { placeNameForPoint, rememberPlaceName, isCoordinateLabel } from "../lib/placeLabel";
import { DEFAULT_MODEL } from "../api/models";
import type { Point } from "./types";
import { BOOTSTRAP } from "./url";
import type { SliceCreator } from "./index";

export type LocationSlice = {
  point: Point;
  /** Human-readable place label. Restored from the last visit, a favorite
   * or a recent place; otherwise filled by reverse geocoding. */
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
  place: placeNameForPoint(BOOTSTRAP.point.lat, BOOTSTRAP.point.lon),

  ensurePlace: () => {
    if (get().place != null) return;
    placeCtl?.abort();
    placeCtl = new AbortController();
    const ctl = placeCtl;
    const { lat, lon } = get().point;
    reverseGeocode(lat, lon, ctl.signal)
      .then((p) => {
        if (ctl.signal.aborted || !p) return;
        const current = get().point;
        if (current.lat !== lat || current.lon !== lon || get().place != null) return;
        const label = placeText(p);
        rememberPlaceName(lat, lon, label);
        set({ place: label });
      })
      .catch(() => {
        // offline or Photon down: keep the coordinate fallback
      });
  },

  submitPlace: (lat, lon, label) => {
    const { point } = get();
    const same = lat === point.lat && lon === point.lon;
    const text = label?.trim() ?? "";
    const name = text && !isCoordinateLabel(text) ? text : null;
    if (name) placeCtl?.abort();
    set({ loading: true, error: null, place: name });
    if (name) rememberPlaceName(lat, lon, name);
    if (!same) set({ point: { lat, lon } });
    if (name == null) get().ensurePlace();
    // every explicit place selection feeds the main page recent list
    get().addRecentPlace({
      lat,
      lon,
      label: name ?? `${lat.toFixed(4)}, ${lon.toFixed(4)}`,
    });
    get().loadMain();
  },

  goHome: () => {
    set({
      point: { lat: DEMO_POINT.lat, lon: DEMO_POINT.lon },
      place: placeNameForPoint(DEMO_POINT.lat, DEMO_POINT.lon),
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
