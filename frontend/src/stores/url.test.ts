import { describe, expect, test } from "vitest";
import { DEFAULT_MODEL } from "../api/models";
import { DEMO_POINT } from "../lib/format";
import { entryKey } from "../lib/compare";
import { migrateCompareV1, parseBootstrap, parseEntries } from "./url";

describe("parseBootstrap", () => {
  test("no params falls back to the demo point and default model", () => {
    const boot = parseBootstrap("");
    expect(boot.point).toEqual({ lat: DEMO_POINT.lat, lon: DEMO_POINT.lon });
    expect(boot.modelId).toBe(DEFAULT_MODEL);
    expect(boot.compare).toBe(false);
    expect(boot.entries).toEqual([]);
  });

  test("coordinates and model are read from the query", () => {
    const boot = parseBootstrap("?lat=45.8992&lon=6.1294&model=arome_france_15min");
    expect(boot.point).toEqual({ lat: 45.8992, lon: 6.1294 });
    expect(boot.modelId).toBe("arome_france_15min");
    expect(boot.compare).toBe(false);
    expect(boot.entries).toEqual([]);
  });

  test("an unknown model falls back to the default", () => {
    expect(parseBootstrap("?lat=1&lon=2&model=nope").modelId).toBe(DEFAULT_MODEL);
  });

  test("invalid coordinates fall back to the demo point", () => {
    expect(parseBootstrap("?lat=abc&lon=6").point).toEqual({
      lat: DEMO_POINT.lat,
      lon: DEMO_POINT.lon,
    });
  });

  test("a bare compare URL boots the empty board placeholder", () => {
    const boot = parseBootstrap("?lat=45.8992&lon=6.1294&compare=1");
    expect(boot.compare).toBe(true);
    // boards are never seeded from the URL: the user picks what to compare
    expect(boot.entries).toEqual([]);
  });

  test("compare mode with explicit pins keeps them and appends the place", () => {
    const boot = parseBootstrap(
      "?lat=45.8992&lon=6.1294&compare=1&pins=46.0000,7.0000/Annecy",
    );
    expect(boot.compare).toBe(true);
    expect(boot.entries).toEqual([
      { kind: "place", lat: 46, lon: 7, name: "Annecy" },
      { kind: "place", lat: 45.8992, lon: 6.1294 },
    ]);
  });

  test("compare=0 disables compare even with pins", () => {
    const boot = parseBootstrap("?lat=45.9&lon=6.7&compare=0&pins=46,7");
    expect(boot.compare).toBe(false);
    expect(boot.entries).toEqual([{ kind: "place", lat: 46, lon: 7 }]);
  });

  test("compare=models keeps only model entries and never anchors a place", () => {
    const boot = parseBootstrap(
      "?lat=45.9&lon=6.7&compare=models&pins=model:icon_d2;46.0000,7.0000/Annecy",
    );
    expect(boot.compare).toBe(true);
    expect(boot.mode).toBe("model");
    expect(boot.entries).toEqual([{ kind: "model", modelId: "icon_d2" }]);
  });

  test("compare=1 keeps only place entries and appends the place", () => {
    const boot = parseBootstrap(
      "?lat=45.9&lon=6.7&compare=1&pins=46.0000,7.0000/Annecy;model:icon_d2",
    );
    expect(boot.mode).toBe("place");
    expect(boot.entries).toEqual([
      { kind: "place", lat: 46, lon: 7, name: "Annecy" },
      { kind: "place", lat: 45.9, lon: 6.7 },
    ]);
  });

  test("a model URL without models boots the empty board placeholder", () => {
    const boot = parseBootstrap("?lat=45.9&lon=6.7&model=icon_d2&compare=models");
    expect(boot.mode).toBe("model");
    expect(boot.entries).toEqual([]);
  });
});

describe("parseEntries", () => {
  test("keeps valid entries and drops malformed ones", () => {
    const entries = parseEntries([
      { kind: "place", lat: 46, lon: 7, name: "Annecy" },
      { kind: "model", modelId: "arpege_europe" },
      { kind: "model", modelId: "not-a-model" },
      { kind: "place", lat: "x", lon: 7 },
      "garbage",
    ]);
    expect(entries).toEqual([
      { kind: "place", lat: 46, lon: 7, name: "Annecy" },
      { kind: "model", modelId: "arpege_europe" },
    ]);
  });

  test("entries get stable keys per kind", () => {
    expect(entryKey({ kind: "place", lat: 46, lon: 7 })).toBe("place:46.0000,7.0000");
    expect(entryKey({ kind: "model", modelId: "arpege_europe" })).toBe(
      "model:arpege_europe",
    );
  });
});

describe("migrateCompareV1", () => {
  test("v1 pins become place entries and the flag is kept", () => {
    expect(
      migrateCompareV1({
        on: true,
        pins: [{ lat: 45.9231, lon: 6.8692, name: "Chamonix" }],
      }),
    ).toEqual({
      on: true,
      entries: [{ kind: "place", lat: 45.9231, lon: 6.8692, name: "Chamonix" }],
      showAverage: false,
    });
  });

  test("malformed v1 data is discarded", () => {
    expect(migrateCompareV1(null)).toBeNull();
    expect(migrateCompareV1("junk")).toBeNull();
    expect(migrateCompareV1({ pins: "nope" })).toEqual({
      on: false,
      entries: [],
      showAverage: false,
    });
  });
});
