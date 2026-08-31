import { DEMO_POINT } from "../lib/format";
import { DEFAULT_MODEL, isModelId, type ModelId } from "../api/models";
import { addEntry, entryKey, isPlaceEntry, placeEntries, type CompareEntry } from "../lib/compare";
import { encodePins, parsePins, pinKey, type Pin } from "../lib/pins";
import { loadVersioned, storeVersioned } from "../lib/storage";

export type Point = { lat: number; lon: number };

/** Versioned envelope persisted in localStorage. v1 stored place pins only;
 * v2 stores typed entries (place | model) so the model board can be added
 * without another migration. */
export type CompareStore = { on: boolean; entries: CompareEntry[] };

export const COMPARE_KEY = "w4p.compare.v1";
export const COMPARE_VERSION = 2;

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
  };
}

function parseCompare(data: unknown): CompareStore | null {
  if (data == null || typeof data !== "object") return null;
  const rec = data as Record<string, unknown>;
  return { on: rec.on === true, entries: parseEntries(rec.entries) };
}

function readCompareStore(): CompareStore {
  const outcome = loadVersioned<CompareStore>(COMPARE_KEY, {
    current: COMPARE_VERSION,
    parse: parseCompare,
    migrate: migrateCompareV1,
  });
  return outcome.data ?? { on: false, entries: [] };
}

/** Parse a query string into the app boot state. Shared URLs carry bare
 * coordinates; compare mode guarantees the current place sits on the board. */
export function parseBootstrap(search: string): {
  point: Point;
  modelId: ModelId;
  compare: boolean;
  entries: CompareEntry[];
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
  const compare = q.get("compare") != null ? q.get("compare") === "1" : readCompareStore().on;
  let entries: CompareEntry[] =
    q.get("pins") != null
      ? parsePins(q.get("pins")).map((p) => ({ kind: "place", ...p }))
      : readCompareStore().entries;
  if (compare && !entries.some((e) => isPlaceEntry(e) && pinKey(e) === pinKey(point))) {
    entries = addEntry(entries, { kind: "place", lat: point.lat, lon: point.lon });
  }
  return { point, modelId, compare, entries };
}

/** The boot state, evaluated once at startup from the current URL. */
function computeBootstrap():
  | ReturnType<typeof parseBootstrap>
  | { point: Point; modelId: ModelId; compare: boolean; entries: CompareEntry[] } {
  if (typeof window === "undefined") {
    return {
      point: { lat: DEMO_POINT.lat, lon: DEMO_POINT.lon },
      modelId: DEFAULT_MODEL,
      compare: false,
      entries: [],
    };
  }
  return parseBootstrap(window.location.search);
}

export const BOOTSTRAP = computeBootstrap();

/** Mirror the app state into the URL (replaceState): bare coordinates only
 * when the view differs from home. Place entries travel in the `pins`
 * parameter, which is already URI-safe and must not be re-encoded by
 * URLSearchParams; model entries are session-local. */
export function writeStateToUrl(
  point: Point,
  modelId: ModelId,
  compare: boolean,
  entries: CompareEntry[],
) {
  const pins = placeEntries(entries);
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
  if (compare) params.set("compare", "1");
  let search = params.toString();
  if (compare && pins.length > 0) search += `&pins=${encodePins(pins)}`;
  url.search = search;
  window.history.replaceState(null, "", url);
}

/** Persist the compare board so a reload restores it. */
export function storeCompare(on: boolean, entries: CompareEntry[]) {
  storeVersioned(COMPARE_KEY, { on, entries }, COMPARE_VERSION);
}

/** Key used by the board state map — re-exported for tests. */
export { entryKey };
