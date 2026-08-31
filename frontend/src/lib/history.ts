import { modelById } from "../api/models";
import { entryKey, isPlaceEntry, type CompareEntry } from "./compare";
import { pinKey, type Pin } from "./pins";

/** Kind of comparison: places against one model, or one place across
 * models. A board never mixes both. */
export type CompareMode = "place" | "model";

/** A comparison board worth remembering: entries with their names frozen,
 * so restoring never needs a geocoder. */
export type SavedCompare = {
  id: string;
  /** Save time, ms epoch. */
  at: number;
  label: string;
  mode: CompareMode;
  /** Model boards only make sense with the place they were opened at. */
  point?: Pin;
  entries: CompareEntry[];
};

export const HISTORY_KEY = "w4p.compareHistory.v1";
export const HISTORY_VERSION = 2;
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

/** Model boards are labelled after their place: "Chamonix · ICON D2 +1". */
export function modelBoardLabel(
  place: string | null | undefined,
  point: Pin | undefined,
  entries: CompareEntry[],
): string {
  const at = place ?? (point ? pinKey(point) : "Compare");
  const first = entries[0];
  const model = first && first.kind === "model" ? modelById(first.modelId).short : "models";
  return entries.length > 1
    ? `${at} · ${model} +${entries.length - 1}`
    : `${at} · ${model}`;
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
      ((h as SavedCompare).mode === "place" || (h as SavedCompare).mode === "model") &&
      Array.isArray((h as SavedCompare).entries),
  );
  return saved.length === data.length ? saved : null;
}

/** v1 payloads had no mode: they were all place comparisons. */
export function migrateHistoryV1(data: unknown): SavedCompare[] | null {
  const parsed = parseHistory(
    Array.isArray(data)
      ? data.map((h) => (typeof h === "object" && h !== null ? { ...h, mode: "place" } : h))
      : data,
  );
  return parsed;
}

type RecordContext = {
  mode: CompareMode;
  point?: Pin;
  place?: string | null;
};

/** Record a board snapshot: only boards with at least two entries count as
 * comparisons, an identical board moves to the front instead of
 * duplicating, and the list is capped. */
export function recordComparison(
  list: SavedCompare[],
  entries: CompareEntry[],
  now = Date.now(),
  ctx: RecordContext = { mode: "place" },
): SavedCompare[] {
  if (entries.length < 2) return list;
  const filtered = list.filter((h) => !sameBoard(h.entries, entries));
  const saved: SavedCompare = {
    id: typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${now}-${Math.random().toString(36).slice(2)}`,
    at: now,
    label: ctx.mode === "model"
      ? modelBoardLabel(ctx.place, ctx.point, entries)
      : boardLabel(entries),
    mode: ctx.mode,
    ...(ctx.mode === "model" && ctx.point ? { point: { ...ctx.point } } : {}),
    entries: entries.map((e) => ({ ...e })),
  };
  return [saved, ...filtered].slice(0, MAX_HISTORY);
}
