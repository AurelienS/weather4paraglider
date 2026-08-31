
import { addPin, pinKey, type Pin } from "../lib/pins";
import type { PinState } from "./types";
import type { SliceCreator } from "./index";

export type CompareSlice = {
  compare: boolean;
  pins: Pin[];
  pinStates: Record<string, PinState>;

  /** Entering compare mode pins the current place on the board. */
  toggleCompare: (next: boolean) => void;
  addPinToBoard: (pin: Pin) => void;
  /** Removing the current place ends the comparison; others just leave. */
  removePin: (key: string) => void;
  /** Clear all: the current place stays pinned. */
  clearBoard: () => void;
};

export const createCompareSlice: SliceCreator<CompareSlice> = (set, get) => ({
  compare: false,
  pins: [],
  pinStates: {},

  toggleCompare: (next) => {
    if (next === get().compare) return;
    set({ compare: next });
    if (!next) {
      get().loadPins(); // aborts any in-flight pin fetch, as the old cleanup did
      return;
    }
    const { point, place, pins } = get();
    const mainKey = pinKey(point);
    if (pins.some((p) => pinKey(p) === mainKey)) {
      get().loadPins();
      return;
    }
    // entering compare mode: the current place joins the board
    get().addPinToBoard({ lat: point.lat, lon: point.lon, name: place ?? undefined });
  },

  addPinToBoard: (pin) => {
    set({ pins: addPin(get().pins, pin) });
    get().loadPins();
  },

  removePin: (key) => {
    const isCurrent = key === pinKey(get().point);
    set({
      pins: get().pins.filter((p) => pinKey(p) !== key),
      ...(isCurrent ? { compare: false } : null),
    });
  },

  clearBoard: () => {
    const { point, place } = get();
    set({ pins: [{ lat: point.lat, lon: point.lon, name: place ?? undefined }] });
    get().loadPins();
  },
});
