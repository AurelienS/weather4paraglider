import { describe, expect, it } from "vitest";
import {
  arrowEdge,
  arrowInk,
  cellBackground,
  colorDistance,
  groundTintZ,
  iso0CellZ,
  thermalRgb,
  windRgb,
} from "./windgram";

const LEVELS = [3000, 2750, 2500, 2250, 2000];

describe("iso0CellZ", () => {
  it("marks the row below the lowest sub-zero cell", () => {
    const z = iso0CellZ(LEVELS, [-5, -2, 0.4, 3, 6], 12, 1500);
    expect(z).toBe(2500);
  });

  it("marks the row two steps below when the neighbour is sub-zero too", () => {
    const z = iso0CellZ(LEVELS, [-5, -3, -0.5, 2, 5], 12, 1500);
    expect(z).toBe(2250);
  });

  it("falls back to the ground row when freezing reaches the lowest grid row", () => {
    const z = iso0CellZ(LEVELS, [-5, -2, -1, 0.4, -3], 12, 1500);
    expect(z).toBe(1500);
  });

  it("returns null when the ground is freezing too", () => {
    const z = iso0CellZ(LEVELS, [-5, -2, -1, -0.4, -3], -2, 1500);
    expect(z).toBeNull();
  });

  it("marks the ground row when only the ground is freezing", () => {
    const z = iso0CellZ(LEVELS, [6, 5, 4, 3, 2], -2, 1500);
    expect(z).toBe(1500);
  });

  it("returns null when nothing is freezing", () => {
    const z = iso0CellZ(LEVELS, [5, 4, 3, 2, 1], 12, 1500);
    expect(z).toBeNull();
  });

  it("skips rows without temperature data", () => {
    const z = iso0CellZ(LEVELS, [-5, null, 0.4, 3, 6], 12, 1500);
    expect(z).toBe(2750);
  });

  it("colors a weak climb green and a rough one violet", () => {
    const weak = thermalRgb(0.5);
    const good = thermalRgb(2);
    const rough = thermalRgb(6);
    expect(weak[1]).toBeGreaterThan(weak[0]);
    expect(weak[1]).toBeGreaterThan(weak[2]);
    expect(good[0]).toBeGreaterThan(good[2] + 80);
    expect(rough[2]).toBeGreaterThan(rough[1]);
    expect(thermalRgb(9)).toEqual(rough);
  });

  it("handles an empty grid", () => {
    const z = iso0CellZ([], [], 12, 1500);
    expect(z).toBeNull();
  });
});

describe("groundTintZ", () => {
  it("sits halfway between the ground and the next altitude line", () => {
    expect(groundTintZ(1696)).toBe(1723);
    expect(groundTintZ(1500)).toBe(1625);
    expect(groundTintZ(1740)).toBe(1870);
  });

  it("stays strictly above the ground and below the grid line", () => {
    for (const elev of [320, 1000, 1696, 2480, 3512]) {
      const z = groundTintZ(elev);
      expect(z).toBeGreaterThan(elev);
      expect(z - elev).toBeLessThan(250);
    }
  });
});

describe("arrowInk", () => {
  const winds = [0, 8, 12, 22, 32, 42, 55, 80];
  const lifts = [0, 0.5, 1, 1.5, 2, 2.5, 3.5, 4.5, 6];
  const clouds = [0, 40, 100];

  it("measures black and white a full step apart", () => {
    expect(colorDistance([255, 255, 255], [255, 255, 255])).toBe(0);
    expect(colorDistance([255, 255, 255], [0, 0, 0])).toBeGreaterThan(0.9);
  });

  it("stands off every thermal tint, including the cloud veil", () => {
    for (const kmh of winds) {
      for (const w of lifts) {
        for (const cloud of clouds) {
          const bg = cellBackground(w, cloud);
          const wind = windRgb(kmh);
          const ink = arrowInk(wind, bg);
          expect(colorDistance(ink, bg), `${kmh} km/h on ${w} m/s, cloud ${cloud}`).toBeGreaterThanOrEqual(
            0.16,
          );
          if (colorDistance(wind, bg) >= 0.16) expect(ink).toEqual(wind);
        }
      }
    }
  });

  it("darkens an orange arrow on an orange thermal and stays orange", () => {
    const wind = windRgb(32);
    const bg = cellBackground(2.5, 0);
    expect(colorDistance(wind, bg)).toBeLessThan(0.16);
    const ink = arrowInk(wind, bg);
    expect(ink).not.toEqual(wind);
    expect(ink[0]).toBeGreaterThan(ink[1]);
    expect(ink[1]).toBeGreaterThan(ink[2]);
    expect(ink[0]).toBeLessThan(wind[0]);
    expect(ink[1]).toBeLessThan(wind[1]);
    expect(ink[2]).toBeLessThanOrEqual(wind[2]);
  });

  it("keeps a light-wind arrow green when the thermal is green", () => {
    const wind = windRgb(12);
    const ink = arrowInk(wind, cellBackground(1, 0));
    expect(ink).not.toEqual(wind);
    expect(ink[1]).toBeGreaterThan(ink[0]);
    expect(ink[1]).toBeGreaterThan(ink[2]);
  });

  it("keeps the legend yellow on a white cell", () => {
    const wind = windRgb(22);
    const white: [number, number, number] = [255, 255, 255];
    expect(colorDistance(wind, white)).toBeGreaterThanOrEqual(0.16);
    expect(arrowInk(wind, white)).toEqual(wind);
  });

  it("rims a light cell in a dark edge and a dark cell in a light one", () => {
    expect(arrowEdge([255, 255, 255])[0]).toBeLessThan(80);
    expect(arrowEdge([20, 22, 28])[0]).toBeGreaterThan(200);
  });
});
