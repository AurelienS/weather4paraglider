import { describe, expect, test } from "vitest";
import { DEFAULT_MODEL } from "../api/models";
import { DEMO_POINT } from "../lib/format";
import { parseBootstrap } from "./url";

describe("parseBootstrap", () => {
  test("no params falls back to the demo point and default model", () => {
    const boot = parseBootstrap("");
    expect(boot.point).toEqual({ lat: DEMO_POINT.lat, lon: DEMO_POINT.lon });
    expect(boot.modelId).toBe(DEFAULT_MODEL);
    expect(boot.compare).toBe(false);
    expect(boot.pins).toEqual([]);
  });

  test("coordinates and model are read from the query", () => {
    const boot = parseBootstrap("?lat=45.8992&lon=6.1294&model=arome_france_15min");
    expect(boot.point).toEqual({ lat: 45.8992, lon: 6.1294 });
    expect(boot.modelId).toBe("arome_france_15min");
    expect(boot.compare).toBe(false);
    expect(boot.pins).toEqual([]);
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

  test("compare mode guarantees the current place sits on the board", () => {
    const boot = parseBootstrap("?lat=45.8992&lon=6.1294&compare=1");
    expect(boot.compare).toBe(true);
    expect(boot.pins).toEqual([{ lat: 45.8992, lon: 6.1294 }]);
  });

  test("compare mode with explicit pins keeps them and appends the place", () => {
    const boot = parseBootstrap(
      "?lat=45.8992&lon=6.1294&compare=1&pins=46.0000,7.0000/Annecy",
    );
    expect(boot.compare).toBe(true);
    expect(boot.pins).toEqual([
      { lat: 46, lon: 7, name: "Annecy" },
      { lat: 45.8992, lon: 6.1294 },
    ]);
  });

  test("compare=0 disables compare even with pins", () => {
    const boot = parseBootstrap("?lat=45.9&lon=6.7&compare=0&pins=46,7");
    expect(boot.compare).toBe(false);
    expect(boot.pins).toEqual([{ lat: 46, lon: 7 }]);
  });
});
