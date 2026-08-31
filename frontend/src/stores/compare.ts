import type { StateCreator } from "zustand";
import { fetchArome } from "../api/client";
import {
  addEntry,
  entryKey,
  isPlaceEntry,
  moveEntry as moveInList,
  parseBoard,
  removeEntry as removeFromList,
  type CompareEntry,
} from "../lib/compare";
import {
  recordComparison,
  parseHistory,
  migrateHistoryV1,
  HISTORY_KEY,
  HISTORY_VERSION,
  type CompareMode,
  type SavedCompare,
} from "../lib/history";
import { pinKey, type Pin } from "../lib/pins";
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
    migrate: migrateHistoryV1,
  });
  return outcome.data ?? [];
}

export type CompareSlice = {
  compare: boolean;
  /** Either places against one model, or one place across models. A board
   * never mixes both. */
  compareMode: CompareMode;
  entries: CompareEntry[];
  entryStates: Record<string, EntryState>;
  /** Model board only: prepend a card averaging every loaded model. */
  showAverage: boolean;
  /** Recently closed comparisons, newest first, persisted. */
  history: SavedCompare[];

  /** Opening pins the current place on the board (places) or seeds it with
   * the selected model (models); closing discards the board (entries and
   * states) and records it in the history. */
  toggleCompare: (next: boolean, mode?: CompareMode) => void;
  /** Explicit "add to compare" from any place source (search, favorites,
   * map); opens the place comparison. Ignored on the model board. */
  addPlaceToBoard: (pin: Pin) => void;
  /** Add a model to the model board (compares the current place across
   * models). Ignored on the place board. */
  addModelToBoard: (modelId: RootState["modelId"]) => void;
  /** Move the model board to another place: the cards keep their models,
   * the data is refetched at the new coordinates. */
  setModelBoardPlace: (pin: Pin) => void;
  /** Remove one entry; the last removal closes compare mode. */
  removeEntry: (key: string) => void;
  /** Reorder the board: move an entry one slot up (-1) or down (+1).
   * Pure order change: loaded entry states keep their keys, no refetch. */
  moveEntry: (key: string, delta: number) => void;
  /** Model board only: toggle the averaged "all models" card (always the
   * first one when on). */
  toggleAverage: () => void;
  /** Empty the whole board: closes the compare page. */
  clearBoard: () => void;
  /** Restore a comparison from the history. */
  restoreFromHistory: (id: string) => void;
  /** Popstate: reconcile compare mode with what the URL says. */
  syncCompareFromUrl: (on: boolean, pinsRaw: string | null, mode: CompareMode) => void;
  /** Fetch every entry (place: its coordinates + the selected model;
   * model: the current place + the entry model). Missing entries are
   * marked loading; already-displayed data stays until replaced, like
   * the main view during an "Updating…" refresh, so the board does not
   * collapse while reloading. */
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
  /** Persist the current board in the recents (only real comparisons with
   * two entries or more are kept). */
  function recordBoard() {
    const { entries, history, compareMode, point, place } = get();
    const nextHistory = recordComparison(history, entries, Date.now(), {
      mode: compareMode,
      point,
      place,
    });
    if (nextHistory !== history) {
      storeVersioned(HISTORY_KEY, nextHistory, HISTORY_VERSION);
      set({ history: nextHistory });
    }
  }

  /** Leaving compare: remember the board (>= 2 entries) then throw it away,
   * so no stale state survives a reopen. */
  function discardBoard() {
    recordBoard();
    batchCtl?.abort();
    set({ compare: false, entries: [], entryStates: {}, showAverage: false });
  }

  return {
    compare: false,
    compareMode: "place",
    entries: [],
    entryStates: {},
    showAverage: false,
    history: loadHistory(),

    toggleCompare: (next, mode = "place") => {
      if (!next) {
        if (get().compare) discardBoard();
        return;
      }
      if (get().compare) {
        if (get().compareMode === mode) return; // already there
        // switching flavors: the current board is recorded, then replaced
        discardBoard();
      }
      if (mode === "model") {
        // the model board starts with the currently selected model; the
        // place itself is the page context, not a card
        set({
          compare: true,
          compareMode: "model",
          entries: [{ kind: "model", modelId: get().modelId }],
        });
      } else {
        const { point, place, entries } = get();
        set({
          compare: true,
          compareMode: "place",
          entries: withCurrentPlace(entries, point, place),
        });
      }
      get().loadEntries();
    },

    addPlaceToBoard: (pin) => {
      if (get().compareMode === "model") return;
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
      set({ compare: true, compareMode: "place", entries });
      get().loadEntries();
    },

    addModelToBoard: (modelId) => {
      if (get().compareMode === "place") return;
      const wasOff = !get().compare;
      let entries = addEntry(get().entries, { kind: "model", modelId });
      if (wasOff) {
        set({ compare: true, compareMode: "model" });
      }
      set({ entries });
      get().loadEntries();
    },

    setModelBoardPlace: (pin) => {
      if (get().compareMode !== "model" || !get().compare) return;
      set({ point: { lat: pin.lat, lon: pin.lon }, place: pin.name ?? null });
      // a place visit like any other: it feeds the main page recents
      get().addRecentPlace({
        lat: pin.lat,
        lon: pin.lon,
        label: pin.name ?? `${pin.lat.toFixed(4)}, ${pin.lon.toFixed(4)}`,
      });
      get().ensurePlace();
      // keep the main context warm for when the user leaves the board
      get().loadMain();
      get().loadEntries();
    },

    removeEntry: (key) => {
      const current = get().entries;
      const entries = removeFromList(current, key);
      // an empty board is a valid state: the page stays open with its
      // placeholder, only leaving it (nav) closes compare
      if (entries.length === 0) {
        // dropping an entry also drops its state, so a re-add starts fresh
        batchCtl?.abort();
        set({ entries, entryStates: {} });
        return;
      }
      // dismantling a real comparison below two entries keeps it in the
      // recents, like leaving the page would
      if (current.length >= 2 && entries.length <= 1) recordBoard();
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

    toggleAverage: () => {
      if (get().compareMode !== "model") return;
      set({ showAverage: !get().showAverage });
    },

    clearBoard: () => {
      // "Clear all" empties the board but the page stays open on its
      // placeholder (the board is recorded in the history first when it
      // had two entries or more)
      recordBoard();
      batchCtl?.abort();
      set({ entries: [], entryStates: {}, showAverage: false });
    },

    restoreFromHistory: (id) => {
      const saved = get().history.find((h) => h.id === id);
      if (!saved) return;
      if (saved.mode === "model" && saved.point) {
        // a model board is tied to its place: switching there too
        set({
          compare: true,
          compareMode: "model",
          point: { ...saved.point },
          place: null,
          entries: saved.entries.map((e) => ({ ...e })),
        });
        get().ensurePlace();
        get().loadMain();
      } else {
        set({
          compare: true,
          compareMode: "place",
          entries: saved.entries.map((e) => ({ ...e })),
        });
      }
      get().loadEntries();
    },

    syncCompareFromUrl: (on, pinsRaw, mode) => {
      if (!on) {
        if (get().compare) discardBoard();
        return;
      }
      // the URL is the source of truth: a bare compare URL boots the empty
      // board (placeholder); an explicit pins list always carries the
      // current place, the board compares against it
      const parsed =
        mode === "model"
          ? parseBoard(pinsRaw).filter((e) => e.kind === "model")
          : parseBoard(pinsRaw).filter(isPlaceEntry);
      const entries =
        mode === "place" && pinsRaw != null
          ? withCurrentPlace(parsed, get().point, get().place)
          : parsed;
      // same mode and same order: nothing to reconcile (redundant popstate)
      const prev = get();
      const prevKeys = prev.entries.map(entryKey);
      const nextKeys = entries.map(entryKey);
      const sameBoard =
        prev.compare &&
        prev.compareMode === mode &&
        prevKeys.length === nextKeys.length &&
        prevKeys.every((k, i) => k === nextKeys[i]);
      if (sameBoard) {
        return;
      }
      // drop the states of entries the new URL does not carry
      const keys = new Set(entries.map(entryKey));
      const states = Object.fromEntries(
        Object.entries(prev.entryStates).filter(([k]) => keys.has(k)),
      );
      set({ compare: true, compareMode: mode, entries, entryStates: states });
      get().loadEntries();
    },

    loadEntries: (opts = {}) => {
      const { compare, entries, point, modelId, lang } = get();
      batchCtl?.abort();
      if (!compare || entries.length === 0) return;
      const ctl = new AbortController();
      batchCtl = ctl;
      // stale-while-revalidate: cards keep what is on screen (previous
      // model, previous place) until the fresh data lands; only entries
      // with nothing to show get the loading note
      const states: Record<string, EntryState> = {};
      for (const entry of entries) {
        const key = entryKey(entry);
        const prev = get().entryStates[key];
        states[key] = prev ?? { status: "loading" };
      }
      set({ entryStates: states });

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
