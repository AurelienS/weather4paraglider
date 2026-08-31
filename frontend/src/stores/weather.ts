
import { fetchArome } from "../api/client";
import type { AromeResponse } from "../api/types";
import { DEFAULT_MODEL, type ModelId } from "../api/models";
import { activeHourTime, selectionAfterLoad } from "../lib/format";
import { dict } from "../lib/i18n";
import { pinKey } from "../lib/pins";
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
  /** Refresh button: bypass the point cache for the main place and the pins. */
  refresh: () => void;

  /** Load (or reload) the current point. `carry` keeps the selected day/hour
   * when the new data has them; `force` bypasses the point cache. */
  loadMain: (opts?: { carry?: boolean; force?: boolean }) => void;
  /** Refresh the compare board pins; no-op outside compare mode. */
  loadPins: (opts?: { force?: boolean }) => void;
};

// one main fetch and one pin batch at a time: starting a new load aborts the
// previous one, mirroring the effect-cleanup semantics
let mainCtl: AbortController | null = null;
let pinsCtl: AbortController | null = null;

export const createWeatherSlice: SliceCreator<WeatherSlice> = (set, get) => ({
  modelId: DEFAULT_MODEL,
  data: null,
  error: null,
  loading: true,

  selectModel: (next) => {
    if (next === get().modelId) return;
    set({ modelId: next, loading: true, error: null });
    get().loadMain({ carry: true });
    get().loadPins();
  },

  refresh: () => {
    set({ loading: true, error: null });
    get().loadMain({ carry: true, force: true });
    get().loadPins({ force: true });
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

  loadPins: (opts = {}) => {
    const { compare, pins, modelId, lang } = get();
    pinsCtl?.abort();
    if (!compare || pins.length === 0) return;
    const ctl = new AbortController();
    pinsCtl = ctl;
    for (const pin of pins) {
      const key = pinKey(pin);
      fetchArome(pin.lat, pin.lon, modelId, { force: opts.force, signal: ctl.signal, lang })
        .then((payload) => {
          // a shared in-flight call can still resolve after abort
          if (ctl.signal.aborted) return;
          set((s) => ({
            pinStates: { ...s.pinStates, [key]: { status: "ready", data: payload } },
          }));
        })
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === "AbortError") return;
          if (ctl.signal.aborted) return;
          const t = dict(lang);
          const message = err instanceof Error && err.message ? err.message : t.errUnexpected;
          set((s) => ({
            pinStates: { ...s.pinStates, [key]: { status: "error", message } },
          }));
        });
    }
  },
});
