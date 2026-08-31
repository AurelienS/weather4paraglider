import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { StateCreator } from "zustand";
import { createCompareSlice, type CompareSlice } from "./compare";
import { createLocationSlice, type LocationSlice } from "./location";
import { createPrefsSlice, type PrefsSlice } from "./prefs";
import { createSelectionSlice, type SelectionSlice } from "./selection";
import { createWeatherSlice, type WeatherSlice } from "./weather";
import { BOOTSTRAP } from "./url";

export type RootState = PrefsSlice &
  LocationSlice &
  SelectionSlice &
  CompareSlice &
  WeatherSlice;

/** Shared creator type so every slice is written against the same store,
 * devtools included. */
export type SliceCreator<T> = StateCreator<
  RootState,
  [["zustand/devtools", never]],
  [],
  T
>;

export const useStore = create<RootState>()(
  devtools(
    (...a) => ({
      ...createPrefsSlice(...a),
      ...createLocationSlice(...a),
      ...createSelectionSlice(...a),
      ...createCompareSlice(...a),
      ...createWeatherSlice(...a),

      // boot state read once from the URL (shared links) or the compare store
      point: BOOTSTRAP.point,
      modelId: BOOTSTRAP.modelId,
      compare: BOOTSTRAP.compare,
      pins: BOOTSTRAP.pins,
    }),
    { name: "w4p", enabled: import.meta.env.DEV },
  ),
);
