import { describe, expect, it } from "vitest";
import { readEnvelope, storeVersioned } from "./storage";

type Shape = { name: string };

const opts = {
  current: 2,
  parse: (data: unknown): Shape | null => {
    if (data && typeof data === "object" && typeof (data as Shape).name === "string") {
      return data as Shape;
    }
    return null;
  },
  migrate: (data: unknown): Shape | null => {
    if (data && typeof data === "object" && typeof (data as Shape).name === "string") {
      return { name: (data as Shape).name };
    }
    return null;
  },
};

describe("readEnvelope", () => {
  it("returns empty for null input", () => {
    expect(readEnvelope<Shape>(null, opts)).toEqual({ data: null, action: "empty" });
  });

  it("reads a current-version payload", () => {
    const raw = JSON.stringify({ v: 2, data: { name: "a" } });
    expect(readEnvelope(raw, opts)).toEqual({ data: { name: "a" }, action: "ok" });
  });

  it("migrates an older payload", () => {
    const raw = JSON.stringify({ v: 1, data: { name: "old" } });
    expect(readEnvelope(raw, opts)).toEqual({ data: { name: "old" }, action: "migrated" });
  });

  it("discards older payloads without a migration", () => {
    const raw = JSON.stringify({ v: 1, data: { name: "old" } });
    expect(readEnvelope(raw, { ...opts, migrate: undefined })).toEqual({
      data: null,
      action: "discarded",
    });
  });

  it("discards newer payloads (written by a newer build)", () => {
    const raw = JSON.stringify({ v: 3, data: { name: "future" } });
    expect(readEnvelope(raw, opts)).toEqual({ data: null, action: "discarded" });
  });

  it("discards malformed json and unknown shapes", () => {
    expect(readEnvelope("{not json", opts).action).toBe("discarded");
    expect(readEnvelope(JSON.stringify({ data: { name: "x" } }), opts).action).toBe("discarded");
    expect(readEnvelope(JSON.stringify({ v: "2", data: {} }), opts).action).toBe("discarded");
    expect(readEnvelope(JSON.stringify({ v: 2, data: { name: 42 } }), opts).action).toBe(
      "discarded",
    );
    expect(readEnvelope("[1,2]", opts).action).toBe("discarded");
  });
});

describe("storeVersioned", () => {
  it("writes the versioned envelope", () => {
    const data = new Map<string, string>();
    const store = {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => {
        data.set(k, v);
      },
      removeItem: (k: string) => {
        data.delete(k);
      },
    };
    storeVersioned("w4p.test.v1", { name: "x" }, 2, store);
    expect(data.get("w4p.test.v1")).toBe(JSON.stringify({ v: 2, data: { name: "x" } }));
  });

  it("swallows storage failures", () => {
    expect(() =>
      storeVersioned("k", 1, 1, {
        getItem: () => null,
        setItem: () => {
          throw new Error("quota");
        },
        removeItem: () => {},
      }),
    ).not.toThrow();
  });
});
