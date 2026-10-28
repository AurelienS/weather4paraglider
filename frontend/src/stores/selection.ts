
import { groupByDay, hourWindow, snapHourIdx } from "../lib/format";
import { shiftHourSelection } from "../lib/hours";
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
  /** Sounding: one hour forward (1) or back (-1), across the whole day. */
  stepHour: (delta: -1 | 1) => void;

  /** Open 00:00–07:00 on the windgram. Not in the URL. The sounding lists every hour. */
  showEarly: boolean;
  /** Open 21:00–23:00 on the windgram. Not in the URL. The sounding lists every hour. */
  showLate: boolean;
  setShowEarly: (on: boolean) => void;
  setShowLate: (on: boolean) => void;
};

export const createSelectionSlice: SliceCreator<SelectionSlice> = (set, get) => ({
  day: null,
  hourIdx: 0,
  view: "windgram",
  activeZ: null,
  showEarly: false,
  showLate: false,

  setView: (view) => set({ view }),
  setActiveZ: (activeZ) => set({ activeZ }),

  setShowEarly: (on) => {
    const { data, hourIdx, lang, showLate } = get();
    const next = data
      ? snapHourIdx(data.hours, hourIdx, hourWindow(on, showLate), lang)
      : null;
    set(next ? { showEarly: on, ...next } : { showEarly: on });
  },

  setShowLate: (on) => {
    const { data, hourIdx, lang, showEarly } = get();
    const next = data
      ? snapHourIdx(data.hours, hourIdx, hourWindow(showEarly, on), lang)
      : null;
    set(next ? { showLate: on, ...next } : { showLate: on });
  },

  selectDay: (key) => {
    set({ day: key });
    const { data, lang, showEarly, showLate } = get();
    if (!data) return;
    const first = groupByDay(data.hours, lang, hourWindow(showEarly, showLate))
      .find((d) => d.key === key)?.hours[0];
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

  stepHour: (delta) => {
    const { data, day, hourIdx, lang } = get();
    if (!data) return;
    const next = shiftHourSelection(
      data.hours,
      day,
      hourIdx,
      delta,
      lang,
      hourWindow(true, true),
    );
    if (next) set(next);
  },
});
