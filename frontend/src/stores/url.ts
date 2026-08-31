import { DEMO_POINT } from "../lib/format";
import { DEFAULT_MODEL, isModelId, type ModelId } from "../api/models";
import {
  addEntry,
  encodeBoard,
  entryKey,
  parseBoard,
  type CompareEntry,
} from "../lib/compare";
import { pinKey, type Pin } from "../lib/pins";
import { loadVersioned, storeVersioned } from "../lib/storage";

export type Point = { lat: number; lon: number };

/** Versioned envelope persisted in localStorage. v1 stored place pins only;
 * v2 stores typed entries (place | model); v3 adds the model board's
 * average toggle. */
export type CompareStore = {
  on: boolean;
  entries: CompareEntry[];
  showAverage: boolean;
};

export const COMPARE_KEY = "w4p.compare.v1";
export const COMPARE_VERSION = 3;

function parseEntry(data: unknown): CompareEntry | null {
  if (data == null || typeof data !== "object") return null;
  const rec = data as Record<string, unknown>;
  if (rec.kind === "model" && typeof rec.modelId === "string" && isModelId(rec.modelId)) {
    return { kind: "model", modelId: rec.modelId };
  }
  if (typeof rec.lat === "number" && typeof rec.lon === "number") {
    return {
      kind: "place",
      lat: rec.lat,
      lon: rec.lon,
      name: typeof rec.name === "string" && rec.name ? rec.name : undefined,
    };
  }
  return null;
}

export function parseEntries(data: unknown): CompareEntry[] {
  if (!Array.isArray(data)) return [];
  const out: CompareEntry[] = [];
  for (const item of data) {
    const entry = parseEntry(item);
    if (entry) out.push(entry);
  }
  return out;
}

/** v1 payloads carried `pins` (place list only). */
export function migrateCompareV1(data: unknown): CompareStore | null {
  if (data == null || typeof data !== "object") return null;
  const rec = data as Record<string, unknown>;
  const pins = Array.isArray(rec.pins)
    ? (rec.pins as Pin[]).filter(
        (p) => p && typeof p.lat === "number" && typeof p.lon === "number",
      )
    : [];
  return {
    on: rec.on === true,
    entries: pins.map((p) => ({ kind: "place", lat: p.lat, lon: p.lon, name: p.name })),
    showAverage: false,
  };
}

function parseCompare(data: unknown): CompareStore | null {
  if (data == null || typeof data !== "object") return null;
  const rec = data as Record<string, unknown>;
  return {
    on: rec.on === true,
    entries: parseEntries(rec.entries),
    showAverage: rec.showAverage === true,
  };
}

function readCompareStore(): CompareStore {
  const outcome = loadVersioned<CompareStore>(COMPARE_KEY, {
    current: COMPARE_VERSION,
    parse: parseCompare,
    migrate: migrateCompareV1,
  });
  return outcome.data ?? { on: false, entries: [], showAverage: false };
}

/** Parse a query string into the app boot state. Shared URLs carry bare
 * coordinates. `compare=1` opens the place board, `compare=models` the
 * model board; a board never mixes both, so foreign entry kinds are
 * dropped when both kinds are present. */
export function parseBootstrap(search: string): {
  point: Point;
  modelId: ModelId;
  compare: boolean;
  mode: "place" | "model";
  entries: CompareEntry[];
  showAverage: boolean;
} {
  const q = new URLSearchParams(search);
  const lat = q.get("lat") == null ? NaN : Number(q.get("lat"));
  const lon = q.get("lon") == null ? NaN : Number(q.get("lon"));
  const point =
    Number.isFinite(lat) && Number.isFinite(lon)
      ? { lat, lon }
      : { lat: DEMO_POINT.lat, lon: DEMO_POINT.lon };
  const rawModel = q.get("model");
  const modelId = rawModel != null && isModelId(rawModel) ? rawModel : DEFAULT_MODEL;
  const cmp = q.get("compare");
  const fromUrl = cmp === "1" || cmp === "models";
  const compare = cmp != null ? fromUrl : readCompareStore().on;
  const storeEntries = readCompareStore().entries;
  const mode: "place" | "model" =
    cmp === "models"
      ? "model"
      : cmp === "1"
        ? "place"
        : storeEntries.some((e) => e.kind === "model")
          ? "model"
          : "place";
  let entries: CompareEntry[] =
    cmp != null ? parseBoard(q.get("pins")) : storeEntries;
  entries =
    mode === "model"
      ? entries.filter((e) => e.kind === "model")
      : entries.filter((e) => e.kind === "place");
  // an URL without pins boots the empty board (its placeholder invites the
  // user to pick); an explicit pins list always carries the current place,
  // the board compares against it
  if (
    compare &&
    mode === "place" &&
    q.get("pins") != null &&
    !entries.some((e) => e.kind === "place" && entryKey(e) === `place:${pinKey(point)}`)
  ) {
    entries = addEntry(entries, { kind: "place", lat: point.lat, lon: point.lon });
  }
  // the average toggle is a local view preference, the URL does not carry it
  return { point, modelId, compare, mode, entries, showAverage: readCompareStore().showAverage };
}

/** The boot state, evaluated once at startup from the current URL. */
function computeBootstrap(): ReturnType<typeof parseBootstrap> {
  if (typeof window === "undefined") {
    return {
      point: { lat: DEMO_POINT.lat, lon: DEMO_POINT.lon },
      modelId: DEFAULT_MODEL,
      compare: false,
      mode: "place",
      entries: [],
      showAverage: false,
    };
  }
  return parseBootstrap(window.location.search);
}

export const BOOTSTRAP = computeBootstrap();

/** Mirror the app state into the URL (replaceState): bare coordinates only
 * when the view differs from home. The whole board (places and models, in
 * order) travels in the `pins` parameter, which is already URI-safe and
 * must not be re-encoded by URLSearchParams. The compare mode comes from
 * the store, not from the entries: an empty model board must stay
 * `compare=models`, an empty place board `compare=1`. */
export function writeStateToUrl(
  point: Point,
  modelId: ModelId,
  compare: boolean,
  compareMode: "place" | "model",
  entries: CompareEntry[],
) {
  const url = new URL(window.location.href);
  const isHome =
    point.lat === DEMO_POINT.lat &&
    point.lon === DEMO_POINT.lon &&
    modelId === DEFAULT_MODEL &&
    !compare &&
    entries.length === 0;
  const params = new URLSearchParams();
  if (!isHome) {
    params.set("lat", String(point.lat));
    params.set("lon", String(point.lon));
    params.set("model", modelId);
  }
  if (compare) params.set("compare", compareMode === "model" ? "models" : "1");
  let search = params.toString();
  if (compare && entries.length > 0) search += `&pins=${encodeBoard(entries)}`;
  url.search = search;
  window.history.replaceState(null, "", url);
}

/** Persist the compare board so a reload restores it (with the average
 * toggle). */
export function storeCompare(on: boolean, entries: CompareEntry[], showAverage: boolean) {
  storeVersioned(COMPARE_KEY, { on, entries, showAverage }, COMPARE_VERSION);
}

/** Key used by the board state map — re-exported for tests. */
export { entryKey };
