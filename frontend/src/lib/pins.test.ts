import { describe, expect, it } from "vitest";
import { MAX_PINS, addPin, encodePins, parsePins, pinKey, type Pin } from "./pins";

describe("parsePins", () => {
  it("returns an empty list for missing or empty values", () => {
    expect(parsePins(null)).toEqual([]);
    expect(parsePins("")).toEqual([]);
    expect(parsePins(";;")).toEqual([]);
  });

  it("parses coordinates with and without names", () => {
    expect(parsePins("45.92,6.87")).toEqual([{ lat: 45.92, lon: 6.87, name: undefined }]);
    expect(parsePins("45.92,6.87/Plaine%20Joux;44.1,6.2")).toEqual([
      { lat: 45.92, lon: 6.87, name: "Plaine Joux" },
      { lat: 44.1, lon: 6.2, name: undefined },
    ]);
  });

  it("drops malformed parts and caps the list", () => {
    const junk = "abc,def;45.9,6.8;x;1,2;3,4;5,6;7,8;9,10";
    const pins = parsePins(junk);
    expect(pins).toHaveLength(MAX_PINS);
    expect(pins[0]).toEqual({ lat: 45.9, lon: 6.8, name: undefined });
  });

  it("keeps commas inside encoded names", () => {
    expect(parsePins("45.9,6.8/St%2C%20place")).toEqual([
      { lat: 45.9, lon: 6.8, name: "St, place" },
    ]);
  });
});

describe("encodePins", () => {
  it("round-trips through parsePins", () => {
    const pins = [
      { lat: 45.92345, lon: 6.86789, name: "Plaine Joux" },
      { lat: 44.1, lon: 6.2 },
    ];
    expect(parsePins(encodePins(pins))).toEqual([
      { lat: 45.9235, lon: 6.8679, name: "Plaine Joux" },
      { lat: 44.1, lon: 6.2, name: undefined },
    ]);
  });
});

describe("addPin", () => {
  it("dedupes only near-identical points (~10 m)", () => {
    const pins = addPin([], { lat: 45.92311, lon: 6.86921, name: "A" });
    const again = addPin(pins, { lat: 45.92313, lon: 6.86923, name: "A again" });
    expect(again).toEqual([{ lat: 45.92313, lon: 6.86923, name: "A again" }]);
  });

  it("keeps distinct nearby places as separate pins", () => {
    let pins = addPin([], { lat: 45.9231, lon: 6.8692, name: "Chamonix" });
    pins = addPin(pins, { lat: 45.92, lon: 6.87, name: "Les Bossons" });
    expect(pins).toHaveLength(2);
  });

  it("replaces an existing pin in place instead of reordering", () => {
    let pins: Pin[] = [
      { lat: 45.1, lon: 6.1, name: "A" },
      { lat: 45.2, lon: 6.2, name: "B" },
      { lat: 45.3, lon: 6.3, name: "C" },
    ];
    pins = addPin(pins, { lat: 45.1, lon: 6.1, name: "A better label" });
    expect(pins.map((p) => p.name)).toEqual(["A better label", "B", "C"]);
  });

  it("caps the board and drops the oldest pin", () => {
    let pins: Pin[] = [];
    for (let i = 0; i < MAX_PINS; i++) pins = addPin(pins, { lat: 40 + i, lon: 5 });
    expect(pins).toHaveLength(MAX_PINS);
    pins = addPin(pins, { lat: 50, lon: 5, name: "new" });
    expect(pins).toHaveLength(MAX_PINS);
    expect(pins[0]?.lat).toBe(41);
    expect(pins[MAX_PINS - 1]?.name).toBe("new");
  });
});

describe("pinKey", () => {
  it("rounds to four decimals so distinct places stay distinct", () => {
    expect(pinKey({ lat: 45.9231, lon: 6.8692 })).not.toBe(pinKey({ lat: 45.92, lon: 6.87 }));
    expect(pinKey({ lat: 45.92, lon: 6.87 })).toBe("45.9200,6.8700");
  });
});
