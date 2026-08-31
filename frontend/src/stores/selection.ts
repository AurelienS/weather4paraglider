
import { groupByDay } from "../lib/format";
import type { View } from "./types";
import type { SliceCreator } from "./index";

export type SelectionSlice = {
  /** ISO day key (see dayKey) of the selected tab; null = pick after load. */
  day: string | null;
  /** Index into weather data.hours for the selected hour. */
  hourIdx: number;
  view: View;
  /** Altitude currently highlighted in the sounding (px value). */
  activeZ: number | null;

  setView: (view: View) => void;
  setActiveZ: (z: number | null) => void;

  /** Day tab click: also jump to that day's first hour. */
  selectDay: (key: string) => void;
  /** Sounding hour select: resolve a time into data.hours index. */
  selectHourTime: (time: string) => void;
};

export const createSelectionSlice: SliceCreator<SelectionSlice> = (set, get) => ({
  day: null,
  hourIdx: 0,
  view: "windgram",
  activeZ: null,

  setView: (view) => set({ view }),
  setActiveZ: (activeZ) => set({ activeZ }),

  selectDay: (key) => {
    set({ day: key });
    const { data, lang } = get();
    if (!data) return;
    const first = groupByDay(data.hours, lang).find((d) => d.key === key)?.hours[0];
    if (!first) return;
    const idx = data.hours.findIndex((h) => h.time === first.time);
    if (idx >= 0) set({ hourIdx: idx });
  },

  selectHourTime: (time) => {
    const { data } = get();
    if (!data) return;
    const idx = data.hours.findIndex((h) => h.time === time);
    if (idx >= 0) set({ hourIdx: idx });
  },
});
