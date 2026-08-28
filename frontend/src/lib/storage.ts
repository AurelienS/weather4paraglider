/** Versioned localStorage envelope: every structured store persists as
 * `{ v: <version>, data: <payload> }`. On read, the version decides:
 * - same version        → parse as-is
 * - older version       → run the provided migration, or discard
 * - newer version       → discard (data written by a newer app build)
 * Anything malformed is discarded. `null` results mean "no usable data".
 */

export type ReadOutcome<T> = {
  data: T | null;
  action: "empty" | "ok" | "migrated" | "discarded";
};

export type EnvelopeOptions<T> = {
  /** Current store version. */
  current: number;
  /** Validate and convert a payload of the current version. */
  parse: (data: unknown) => T | null;
  /** Convert an older payload to the current shape; null = cannot migrate. */
  migrate?: (data: unknown) => T | null;
};

export function readEnvelope<T>(
  raw: string | null,
  { current, parse, migrate }: EnvelopeOptions<T>,
): ReadOutcome<T> {
  if (raw == null) return { data: null, action: "empty" };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { data: null, action: "discarded" };
  }
  if (parsed == null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { data: null, action: "discarded" };
  }
  const rec = parsed as Record<string, unknown>;
  if (typeof rec.v !== "number" || !Number.isInteger(rec.v)) {
    return { data: null, action: "discarded" };
  }
  if (rec.v === current) {
    const data = parse(rec.data);
    return data === null
      ? { data: null, action: "discarded" }
      : { data, action: "ok" };
  }
  if (rec.v < current && migrate) {
    const data = migrate(rec.data);
    return data === null
      ? { data: null, action: "discarded" }
      : { data, action: "migrated" };
  }
  return { data: null, action: "discarded" };
}

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function storage(): StorageLike | undefined {
  return typeof window === "undefined" ? undefined : window.localStorage;
}

export function loadVersioned<T>(
  key: string,
  opts: EnvelopeOptions<T>,
  store: StorageLike | undefined = storage(),
): ReadOutcome<T> {
  let raw: string | null = null;
  try {
    raw = store?.getItem(key) ?? null;
  } catch {
    return { data: null, action: "empty" };
  }
  return readEnvelope(raw, opts);
}

export function storeVersioned<T>(
  key: string,
  data: T,
  version: number,
  store: StorageLike | undefined = storage(),
): void {
  try {
    store?.setItem(key, JSON.stringify({ v: version, data }));
  } catch {
    // storage unavailable (private mode): keep the per-session value only
  }
}
