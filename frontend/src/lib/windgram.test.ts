import { describe, expect, it } from "vitest";
import { iso0CellZ, thermalRgb } from "./windgram";

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
