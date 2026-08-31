import { DEMO_POINT } from "../lib/format";
import { DEFAULT_MODEL, isModelId, type ModelId } from "../api/models";
import { addPin, encodePins, parsePins, pinKey, type Pin } from "../lib/pins";
import { loadVersioned, storeVersioned } from "../lib/storage";

export type Point = { lat: number; lon: number };

export type CompareStore = { on: boolean; pins: Pin[] };

export const COMPARE_KEY = "w4p.compare.v1";
export const COMPARE_VERSION = 1;

function parseCompare(data: unknown): CompareStore | null {
  if (data == null || typeof data !== "object") return null;
  const rec = data as Record<string, unknown>;
  const pins = Array.isArray(rec.pins)
    ? (rec.pins as Pin[]).filter(
        (p) => p && typeof p.lat === "number" && typeof p.lon === "number",
      )
    : [];
  return { on: rec.on === true, pins };
}

function readCompareStore(): CompareStore {
  const outcome = loadVersioned<CompareStore>(COMPARE_KEY, {
    current: COMPARE_VERSION,
    parse: parseCompare,
  });
  return outcome.data ?? { on: false, pins: [] };
}

/** Parse a query string into the app boot state. Shared URLs carry bare
 * coordinates; compare mode guarantees the current place sits on the board. */
export function parseBootstrap(search: string): {
  point: Point;
  modelId: ModelId;
  compare: boolean;
  pins: Pin[];
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
  let pins = q.get("pins") != null ? parsePins(q.get("pins")) : readCompareStore().pins;
  if (compare && !pins.some((p) => pinKey(p) === pinKey(point))) {
    pins = addPin(pins, { lat: point.lat, lon: point.lon });
  }
  return { point, modelId, compare, pins };
}

/** The boot state, evaluated once at startup from the current URL. */
function computeBootstrap():
  | ReturnType<typeof parseBootstrap>
  | { point: Point; modelId: ModelId; compare: boolean; pins: Pin[] } {
  if (typeof window === "undefined") {
    return {
      point: { lat: DEMO_POINT.lat, lon: DEMO_POINT.lon },
      modelId: DEFAULT_MODEL,
      compare: false,
      pins: [],
    };
  }
  return parseBootstrap(window.location.search);
}

export const BOOTSTRAP = computeBootstrap();

/** Mirror the app state into the URL (replaceState): bare coordinates only
 * when the view differs from home. The `pins` payload is already URI-safe and
 * must not be re-encoded by URLSearchParams. */
export function writeStateToUrl(
  point: Point,
  modelId: ModelId,
  compare: boolean,
  pins: Pin[],
) {
  const url = new URL(window.location.href);
  const isHome =
    point.lat === DEMO_POINT.lat &&
    point.lon === DEMO_POINT.lon &&
    modelId === DEFAULT_MODEL &&
    !compare &&
    pins.length === 0;
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
export function storeCompare(on: boolean, pins: Pin[]) {
  storeVersioned(COMPARE_KEY, { on, pins }, COMPARE_VERSION);
}
