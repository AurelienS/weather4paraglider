import { entryKey, isPlaceEntry, type CompareEntry } from "./compare";
import { pinKey } from "./pins";

/** A comparison board worth remembering: entries with their names frozen,
 * so restoring never needs a geocoder. */
export type SavedCompare = {
  id: string;
  /** Save time, ms epoch. */
  at: number;
  label: string;
  entries: CompareEntry[];
};

export const HISTORY_KEY = "w4p.compareHistory.v1";
export const HISTORY_VERSION = 1;
export const MAX_HISTORY = 10;

/** Same entry key sets → same board. */
export function sameBoard(a: CompareEntry[], b: CompareEntry[]): boolean {
  if (a.length !== b.length) return false;
  const keys = new Set(a.map(entryKey));
  return b.every((e) => keys.has(entryKey(e)));
}

/** "Plaine Joux +2" style label from the first place on the board. */
export function boardLabel(entries: CompareEntry[]): string {
  const first = entries.find(isPlaceEntry);
  const name = first ? (first.name ?? pinKey(first)) : "Compare";
  return entries.length > 1 ? `${name} +${entries.length - 1}` : name;
}

/** Validate the envelope payload of a persisted history; anything malformed
 * is dropped so a bad write can never break the menu. */
export function parseHistory(data: unknown): SavedCompare[] | null {
  if (!Array.isArray(data)) return null;
  const saved = data.filter(
    (h): h is SavedCompare =>
      typeof h === "object" &&
      h !== null &&
      typeof (h as SavedCompare).id === "string" &&
      typeof (h as SavedCompare).at === "number" &&
      typeof (h as SavedCompare).label === "string" &&
      Array.isArray((h as SavedCompare).entries),
  );
  return saved.length === data.length ? saved : null;
}

/** Record a board snapshot: only boards with at least two entries count as
 * comparisons, an identical board moves to the front instead of
 * duplicating, and the list is capped. */
export function recordComparison(
  list: SavedCompare[],
  entries: CompareEntry[],
  now = Date.now(),
): SavedCompare[] {
  if (entries.length < 2) return list;
  const filtered = list.filter((h) => !sameBoard(h.entries, entries));
  const saved: SavedCompare = {
    id: typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${now}-${Math.random().toString(36).slice(2)}`,
    at: now,
    label: boardLabel(entries),
    entries: entries.map((e) => (isPlaceEntry(e) ? { ...e } : { ...e })),
  };
  return [saved, ...filtered].slice(0, MAX_HISTORY);
}
