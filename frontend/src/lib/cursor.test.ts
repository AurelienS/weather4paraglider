import { describe, expect, it } from "vitest";
import { sampleAt, sampleDir } from "./cursor";

describe("sampleAt", () => {
  const series = [
    { at: 1000, value: 10 },
    { at: 2000, value: null },
    { at: 3000, value: 20 },
  ];

  it("draws a straight line between defined samples", () => {
    expect(sampleAt(series, 2000)).toBe(15);
    expect(sampleAt(series, 1000)).toBe(10);
    expect(sampleAt(series, 3000)).toBe(20);
  });

  it("holds the end values outside the series", () => {
    expect(sampleAt(series, 400)).toBe(10);
    expect(sampleAt(series, 5000)).toBe(20);
  });

  it("stays empty outside a series that must not be extended", () => {
    expect(sampleAt(series, 400, false)).toBeNull();
    expect(sampleAt(series, 5000, false)).toBeNull();
    expect(sampleAt(series, 2000, false)).toBe(15);
  });

  it("returns nothing for an empty series", () => {
    expect(sampleAt([], 10)).toBeNull();
    expect(sampleAt([{ at: 1, value: null }], 1)).toBeNull();
  });
});

describe("sampleDir", () => {
  it("takes the short way across north", () => {
    const series = [
      { at: 0, value: 350 },
      { at: 2, value: 10 },
    ];
    expect(sampleDir(series, 1)).toBe(0);
  });

  it("holds the end heading", () => {
    const series = [
      { at: 0, value: 90 },
      { at: 2, value: 180 },
    ];
    expect(sampleDir(series, -1)).toBe(90);
    expect(sampleDir(series, 4, false)).toBeNull();
  });
});
