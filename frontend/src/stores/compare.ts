import type { StateCreator } from "zustand";
import { fetchArome } from "../api/client";
import {
  addEntry,
  entryKey,
  isPlaceEntry,
  moveEntry as moveInList,
  removeEntry as removeFromList,
  type CompareEntry,
} from "../lib/compare";
import { recordComparison, parseHistory, HISTORY_KEY, HISTORY_VERSION, type SavedCompare } from "../lib/history";
import { parsePins, pinKey, type Pin } from "../lib/pins";
import { dict } from "../lib/i18n";
import { loadVersioned, storeVersioned } from "../lib/storage";
import type { EntryState } from "./types";
import type { RootState } from "./index";

/** Rehydrate the persisted recent list at store creation; malformed or
 * version-mismatched data yields an empty list. */
function loadHistory(): SavedCompare[] {
  const outcome = loadVersioned<SavedCompare[]>(HISTORY_KEY, {
    current: HISTORY_VERSION,
    parse: parseHistory,
  });
  return outcome.data ?? [];
}

export type CompareSlice = {
  compare: boolean;
  entries: CompareEntry[];
  entryStates: Record<string, EntryState>;
  /** Recently closed comparisons, newest first, persisted. */
  history: SavedCompare[];

  /** Checkbox/button: opening pins the current place on the board; closing
   * discards the board (entries and states) and records it in the history. */
  toggleCompare: (next: boolean) => void;
  /** Explicit "add to compare" from any place source (search, favorites,
   * map); opens compare mode. */
  addPlaceToBoard: (pin: Pin) => void;
  /** Same for a model entry (compares the current place across models). */
  addModelToBoard: (modelId: RootState["modelId"]) => void;
  /** Remove one entry; the last removal closes compare mode. */
  removeEntry: (key: string) => void;
  /** Reorder the board: move an entry one slot up (-1) or down (+1).
   * Pure order change: loaded entry states keep their keys, no refetch. */
  moveEntry: (key: string, delta: number) => void;
  /** Reset the board to the current place. */
  clearBoard: () => void;
  /** Restore a comparison from the history. */
  restoreFromHistory: (id: string) => void;
  /** Popstate: reconcile compare mode with what the URL says. */
  syncCompareFromUrl: (on: boolean, pinsRaw: string | null) => void;
  /** Fetch every entry (place: its coordinates + the selected model;
   * model: the current place + the entry model). Marks entries as loading,
   * so stale data from a previous model is never displayed. */
  loadEntries: (opts?: { force?: boolean }) => void;
};

// one batch at a time: starting a new load aborts the previous one,
// mirroring the effect-cleanup semantics
let batchCtl: AbortController | null = null;

/** The board compares against the current place: whenever compare mode
 * opens, the current place joins it (appended last). */
function withCurrentPlace(
  entries: CompareEntry[],
  point: RootState["point"],
  place: string | null,
): CompareEntry[] {
  const currentKey = `place:${pinKey(point)}`;
  if (entries.some((e) => isPlaceEntry(e) && entryKey(e) === currentKey)) return entries;
  return addEntry(entries, {
    kind: "place",
    lat: point.lat,
    lon: point.lon,
    name: place ?? undefined,
  });
}

export const createCompareSlice: StateCreator<
  RootState,
  [["zustand/devtools", never]],
  [],
  CompareSlice
> = (set, get) => {
  /** Leaving compare: remember the board (>= 2 entries) then throw it away,
   * so no stale state survives a reopen. */
  function discardBoard() {    const { entries, history } = get();
    const nextHistory = recordComparison(history, entries);
    if (nextHistory !== history) storeVersioned(HISTORY_KEY, nextHistory, HISTORY_VERSION);
    batchCtl?.abort();
    set({ compare: false, entries: [], entryStates: {}, history: nextHistory });
  }

  return {
    compare: false,
    entries: [],
    entryStates: {},
    history: loadHistory(),

    toggleCompare: (next) => {
      if (next === get().compare) return;
      if (!next) {
        discardBoard();
        return;
      }
      const { point, place, entries } = get();
      set({ compare: true, entries: withCurrentPlace(entries, point, place) });
      get().loadEntries();
    },

    addPlaceToBoard: (pin) => {
      const wasOff = !get().compare;
      let entries = addEntry(get().entries, {
        kind: "place",
        lat: pin.lat,
        lon: pin.lon,
        name: pin.name,
      });
      if (wasOff) {
        // opening the board from anywhere anchors it to the current place
        const { point, place } = get();
        entries = withCurrentPlace(entries, point, place);
      }
      set({ compare: true, entries });
      get().loadEntries();
    },

    addModelToBoard: (modelId) => {
      const wasOff = !get().compare;
      let entries = addEntry(get().entries, { kind: "model", modelId });
      if (wasOff) {
        const { point, place } = get();
        entries = withCurrentPlace(entries, point, place);
      }
      set({ compare: true, entries });
      get().loadEntries();
    },

    removeEntry: (key) => {
      const entries = removeFromList(get().entries, key);
      // an empty board is no longer a comparison
      if (entries.length === 0) {
        discardBoard();
        return;
      }
      // dropping an entry also drops its state, so a re-add starts fresh
      const { [key]: _dropped, ...states } = get().entryStates;
      set({ entries, entryStates: states });
    },

    moveEntry: (key, delta) => {
      const entries = moveInList(get().entries, key, delta);
      // unchanged array (boundary or unknown key): no state churn
      if (entries === get().entries) return;
      set({ entries });
    },

    clearBoard: () => {
      // "Clear all" really clears everything: an empty board closes the
      // compare page (the board is recorded in the history first when it
      // had two entries or more)
      discardBoard();
    },

    restoreFromHistory: (id) => {
      const saved = get().history.find((h) => h.id === id);
      if (!saved) return;
      set({ compare: true, entries: saved.entries.map((e) => ({ ...e })) });
      get().loadEntries();
    },

    syncCompareFromUrl: (on, pinsRaw) => {
      if (on === get().compare) return;
      if (!on) {
        discardBoard();
        return;
      }
      const { point, place } = get();
      let entries: CompareEntry[] =
        pinsRaw != null
          ? parsePins(pinsRaw).map((p) => ({ kind: "place" as const, ...p }))
          : [];
      entries = withCurrentPlace(entries, point, place);
      set({ compare: true, entries });
      get().loadEntries();
    },

    loadEntries: (opts = {}) => {
      const { compare, entries, point, modelId, lang } = get();
      batchCtl?.abort();
      if (!compare || entries.length === 0) return;
      const ctl = new AbortController();
      batchCtl = ctl;
      // every batched entry is marked loading first: stale data from a
      // previous model or a previous session is never shown
      const loading: Record<string, EntryState> = {};
      for (const entry of entries) loading[entryKey(entry)] = { status: "loading" };
      set({ entryStates: loading });

      for (const entry of entries) {
        const key = entryKey(entry);
        const promise =
          entry.kind === "place"
            ? fetchArome(entry.lat, entry.lon, modelId, { force: opts.force, signal: ctl.signal, lang })
            : fetchArome(point.lat, point.lon, entry.modelId, { force: opts.force, signal: ctl.signal, lang });
        promise
          .then((payload) => {
            // a shared in-flight call can still resolve after abort
            if (ctl.signal.aborted) return;
            set((s) => ({
              entryStates: { ...s.entryStates, [key]: { status: "ready", data: payload } },
            }));
          })
          .catch((err: unknown) => {
            if (err instanceof DOMException && err.name === "AbortError") return;
            if (ctl.signal.aborted) return;
            const t = dict(lang);
            const message = err instanceof Error && err.message ? err.message : t.errUnexpected;
            set((s) => ({
              entryStates: { ...s.entryStates, [key]: { status: "error", message } },
            }));
          });
      }
    },
  };
};
