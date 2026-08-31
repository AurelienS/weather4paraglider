import type { ModelId } from "../api/models";
import { isModelId } from "../api/models";
import { encodePin, parsePinSegment, pinKey, type Pin } from "./pins";

/** One row of the compare board. A place compares the same model across
 * locations; a model compares one location across models. */
export type CompareEntry =
  | { kind: "place"; lat: number; lon: number; name?: string }
  | { kind: "model"; modelId: ModelId };

export const MAX_ENTRIES = 6;

/** Stable identity of an entry, used as the board state key. */
export function entryKey(entry: CompareEntry): string {
  return entry.kind === "place"
    ? `place:${pinKey(entry)}`
    : `model:${entry.modelId}`;
}

/** Add an entry: an existing entry (same key) is replaced in place, keeping
 * the board order; beyond the cap the oldest entries fall off. */
export function addEntry(entries: CompareEntry[], entry: CompareEntry): CompareEntry[] {
  const key = entryKey(entry);
  const replaced = entries.some((e) => entryKey(e) === key);
  const next = replaced
    ? entries.map((e) => (entryKey(e) === key ? entry : e))
    : [...entries, entry];
  return next.length > MAX_ENTRIES ? next.slice(next.length - MAX_ENTRIES) : next;
}

export function removeEntry(entries: CompareEntry[], key: string): CompareEntry[] {
  return entries.filter((e) => entryKey(e) !== key);
}

/** Reorder the board: swap the entry one slot up (delta -1) or down
 * (+1). Boundaries and unknown keys leave the board untouched. */
export function moveEntry(
  entries: CompareEntry[],
  key: string,
  delta: number,
): CompareEntry[] {
  const i = entries.findIndex((e) => entryKey(e) === key);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= entries.length) return entries;
  const next = [...entries];
  next[i] = next[j] as CompareEntry;
  next[j] = entries[i] as CompareEntry;
  return next;
}

/** Only place entries travel in the `pins` URL parameter. */
export function placeEntries(entries: CompareEntry[]): Pin[] {
  return entries.filter((e): e is Extract<CompareEntry, { kind: "place" }> => e.kind === "place");
}

/** Ids of the model entries, in board order. */
export function modelEntries(entries: CompareEntry[]): ModelId[] {
  return entries.flatMap((e) => (e.kind === "model" ? [e.modelId] : []));
}

const MODEL_SEGMENT = "model:";

/** Serialize the whole board into the `pins` URL parameter, keeping the
 * order: place segments as before, model segments as `model:<id>`. Plain
 * place-only strings stay parseable, so old shared URLs keep working. */
export function parseBoard(raw: string | null): CompareEntry[] {
  if (!raw) return [];
  const out: CompareEntry[] = [];
  for (const part of raw.split(";")) {
    if (!part) continue;
    if (part.startsWith(MODEL_SEGMENT)) {
      const id = part.slice(MODEL_SEGMENT.length);
      if (isModelId(id) && out.length < MAX_ENTRIES) {
        out.push({ kind: "model", modelId: id });
      }
      continue;
    }
    const pin = parsePinSegment(part);
    if (pin && out.length < MAX_ENTRIES) out.push({ kind: "place", ...pin });
  }
  return out;
}

/** Inverse of parseBoard: the board order travels in one parameter. */
export function encodeBoard(entries: CompareEntry[]): string {
  return entries
    .map((e) => (isPlaceEntry(e) ? encodePin(e) : `${MODEL_SEGMENT}${e.modelId}`))
    .join(";");
}

export function isPlaceEntry(entry: CompareEntry): entry is Extract<CompareEntry, { kind: "place" }> {
  return entry.kind === "place";
}

/** The place entry matching a pin key, if any. */
export function findPlaceEntry(
  entries: CompareEntry[],
  key: string,
): (CompareEntry & { kind: "place" }) | undefined {
  const entry = entries.find((e) => entryKey(e) === `place:${key}`);
  return entry && isPlaceEntry(entry) ? entry : undefined;
}
