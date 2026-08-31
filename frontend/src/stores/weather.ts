
import { fetchArome } from "../api/client";
import type { AromeResponse } from "../api/types";
import { DEFAULT_MODEL, type ModelId } from "../api/models";
import { activeHourTime, selectionAfterLoad } from "../lib/format";
import { dict } from "../lib/i18n";
import type { SliceCreator } from "./index";

export type WeatherSlice = {
  modelId: ModelId;
  data: AromeResponse | null;
  /** User-facing error message; null = no error. Kept until the next
   * user-triggered action replaces it, so a failed refresh keeps old data. */
  error: string | null;
  loading: boolean;

  /** Model select: keeps the selected day/hour when the new model has it. */
  selectModel: (next: ModelId) => void;
  /** Refresh button: bypass the point cache for the main place and the board. */
  refresh: () => void;

  /** Load (or reload) the current point. `carry` keeps the selected day/hour
   * when the new data has them; `force` bypasses the point cache. */
  loadMain: (opts?: { carry?: boolean; force?: boolean }) => void;
};

// one main fetch at a time: starting a new load aborts the previous one
let mainCtl: AbortController | null = null;

export const createWeatherSlice: SliceCreator<WeatherSlice> = (set, get) => ({
  modelId: DEFAULT_MODEL,
  data: null,
  error: null,
  loading: true,

  selectModel: (next) => {
    if (next === get().modelId) return;
    set({ modelId: next, loading: true, error: null });
    get().loadMain({ carry: true });
    get().loadEntries();
  },

  refresh: () => {
    set({ loading: true, error: null });
    get().loadMain({ carry: true, force: true });
    get().loadEntries({ force: true });
  },

  loadMain: (opts = {}) => {
    const { point, modelId, lang } = get();
    mainCtl?.abort();
    const ctl = new AbortController();
    mainCtl = ctl;
    const carry = opts.carry ?? false;
    const prevDay = carry ? get().day : null;
    const prevHourTime = carry
      ? activeHourTime(get().data, get().day, get().hourIdx, lang)
      : null;

    fetchArome(point.lat, point.lon, modelId, {
      force: opts.force,
      signal: ctl.signal,
      lang,
    })
      .then((payload) => {
        if (ctl.signal.aborted) return;
        const next = selectionAfterLoad(payload.hours, prevDay, prevHourTime);
        set({ data: payload, hourIdx: next.hourIdx, day: next.day, activeZ: null });
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        const t = dict(lang);
        const message = err instanceof Error && err.message ? err.message : t.errUnexpected;
        set({ error: message });
      })
      .finally(() => {
        if (!ctl.signal.aborted) set({ loading: false });
      });
  },
});
