import type { AromeResponse } from "./types";

const KEY = "w4p.arome.cache.v2";
const MAX_ENTRIES = 6;

type Entry = {
  slot: string;
  from: string;
  to: string;
  at: number;
  payload: AromeResponse;
};

type Store = Record<string, Entry>;

function loadStore(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (parsed == null || typeof parsed !== "object") return {};
    return parsed as Store;
  } catch {
    return {};
  }
}

function persist(store: Store): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    const keys = Object.keys(store).sort((a, b) => (store[a]?.at ?? 0) - (store[b]?.at ?? 0));
    for (const k of keys.slice(0, Math.ceil(keys.length / 2))) delete store[k];
    try {
      localStorage.setItem(KEY, JSON.stringify(store));
    } catch {
      return;
    }
  }
}

export function readPointCache(
  key: string,
  slot: string,
  fromISO: string,
  toISO: string,
): AromeResponse | null {
  const entry = loadStore()[key];
  if (!entry) return null;
  if (entry.slot !== slot || entry.from !== fromISO || entry.to !== toISO) return null;
  return entry.payload;
}

export function writePointCache(
  key: string,
  slot: string,
  fromISO: string,
  toISO: string,
  payload: AromeResponse,
): void {
  const store = loadStore();
  for (const k of Object.keys(store)) {
    if (store[k]?.slot !== slot) delete store[k];
  }
  store[key] = { slot, from: fromISO, to: toISO, at: Date.now(), payload };
  const entries = Object.entries(store);
  if (entries.length > MAX_ENTRIES) {
    entries.sort((a, b) => (a[1]?.at ?? 0) - (b[1]?.at ?? 0));
    for (const [k] of entries.slice(0, entries.length - MAX_ENTRIES)) delete store[k];
  }
  persist(store);
}
