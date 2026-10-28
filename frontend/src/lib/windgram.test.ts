import { describe, expect, it } from "vitest";
import {
  altitudeLevels,
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

function contrastRatio(a: [number, number, number], b: [number, number, number]): number {
  const linear = (channel: number) => {
    const s = channel / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const lum = (rgb: [number, number, number]) =>
    0.2126 * linear(rgb[0]) + 0.7152 * linear(rgb[1]) + 0.0722 * linear(rgb[2]);
  const hi = Math.max(lum(a), lum(b));
  const lo = Math.min(lum(a), lum(b));
  return (hi + 0.05) / (lo + 0.05);
}

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

  it("steps through teal, gold, vermilion and violet without blending them", () => {
    const scratch = thermalRgb(0.8);
    const climb = thermalRgb(1.8);
    const strong = thermalRgb(3);
    const rough = thermalRgb(6);
    expect(scratch[1]).toBeGreaterThan(scratch[0] + 20);
    expect(scratch[2]).toBeGreaterThan(scratch[0] + 15);
    expect(climb[0]).toBeGreaterThan(climb[2] + 40);
    expect(climb[1]).toBeGreaterThan(climb[2] + 40);
    expect(strong[0]).toBeGreaterThan(strong[1] + 20);
    expect(strong[1]).toBeGreaterThan(strong[2]);
    expect(rough[2]).toBeGreaterThan(rough[1]);
    expect(rough[0]).toBeGreaterThan(rough[1]);
    expect(thermalRgb(9)).toEqual(rough);
    const before = thermalRgb(1.19);
    const after = thermalRgb(1.2);
    expect(before[2]).toBeGreaterThan(before[0]);
    expect(after[0]).toBeGreaterThan(after[2] + 30);
  });

  it("keeps the four hues apart on a dark chart", () => {
    const teal = thermalRgb(0.8, "dark");
    const gold = thermalRgb(1.8, "dark");
    const red = thermalRgb(3, "dark");
    const violet = thermalRgb(6, "dark");
    expect(teal[1]).toBeGreaterThan(teal[0]);
    expect(gold[0]).toBeGreaterThan(gold[2] + 20);
    expect(red[0]).toBeGreaterThan(red[1] + 20);
    expect(violet[2]).toBeGreaterThan(violet[1]);
  });

  it("keeps dark figures readable on every light cell", () => {
    const ink: [number, number, number] = [28, 25, 21];
    for (const w of [0, 0.5, 1, 1.5, 2, 2.5, 3.2, 4.5, 6]) {
      const bg = cellBackground(w, 0);
      expect(contrastRatio(ink, bg), `ink ${w} ${bg.join(",")}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("keeps light figures readable on every dark cell", () => {
    const ink: [number, number, number] = [244, 239, 230];
    const gust: [number, number, number] = [255, 208, 198];
    for (const w of [0, 0.1, 0.5, 1, 1.5, 2, 2.5, 3.2, 4.5, 6]) {
      for (const cloud of [0, 40, 100]) {
        const bg = cellBackground(w, cloud, "dark");
        expect(contrastRatio(ink, bg), `ink ${w} cloud ${cloud} ${bg.join(",")}`).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(gust, bg), `gust ${w} cloud ${cloud} ${bg.join(",")}`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it("starts a climb in a hue you can see", () => {
    const teal = thermalRgb(0.5);
    const gold = thermalRgb(1.2);
    expect(Math.max(...teal) - Math.min(...teal)).toBeGreaterThan(40);
    expect(teal[1]).toBeLessThan(215);
    expect(Math.max(...gold) - Math.min(...gold)).toBeGreaterThan(80);
    const dark = thermalRgb(0.5, "dark");
    expect(Math.max(...dark) - Math.min(...dark)).toBeGreaterThan(40);
  });

  it("keeps a trace of lift almost white", () => {
    expect(cellBackground(0, 0)).toEqual([255, 255, 255]);
    const trace = cellBackground(0.1, 0);
    const solid = cellBackground(0.5, 0);
    for (const channel of trace) expect(channel).toBeGreaterThanOrEqual(248);
    const span = (rgb: [number, number, number]) => Math.max(...rgb) - Math.min(...rgb);
    expect(span(solid)).toBeGreaterThan(span(trace) + 8);
    expect(trace[1]).toBeGreaterThan(trace[0]);
  });

  it("handles an empty grid", () => {
    const z = iso0CellZ([], [], 12, 1500);
    expect(z).toBeNull();
  });
});

describe("altitudeLevels", () => {
  it("keeps a 250 m step up to 5000 m", () => {
    const levels = altitudeLevels(1696, 5000);
    expect(levels[0]).toBe(1750);
    expect(levels.at(-1)).toBe(5000);
    expect(levels).toContain(4750);
    expect(levels).not.toContain(5250);
    const steps = levels.slice(1).map((z, i) => z - (levels[i] ?? z));
    expect(steps.every((step) => step === 250)).toBe(true);
  });

  it("steps 500 m above 5000 m", () => {
    const levels = altitudeLevels(1696, 10000);
    expect(levels.filter((z) => z > 5000)).toEqual([
      5500, 6000, 6500, 7000, 7500, 8000, 8500, 9000, 9500, 10000,
    ]);
    expect(levels).toContain(5000);
    expect(levels).toContain(4750);
    expect(levels).not.toContain(5250);
  });

  it("stops on the last 500 m line that still fits under the cap", () => {
    expect(altitudeLevels(1696, 8100).filter((z) => z > 5000)).toEqual([
      5500, 6000, 6500, 7000, 7500, 8000,
    ]);
  });

  it("still starts just above a site higher than 5000 m", () => {
    expect(altitudeLevels(5200, 10000).slice(0, 4)).toEqual([5250, 5500, 6000, 6500]);
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

  it("stands off every dark thermal tint, including the cloud veil", () => {
    for (const kmh of winds) {
      for (const w of lifts) {
        for (const cloud of clouds) {
          const bg = cellBackground(w, cloud, "dark");
          const ink = arrowInk(windRgb(kmh), bg);
          expect(colorDistance(ink, bg), `${kmh} km/h on ${w} m/s, cloud ${cloud}`).toBeGreaterThanOrEqual(
            0.16,
          );
        }
      }
    }
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

  it("darkens an orange arrow on a vermilion thermal and stays orange", () => {
    const wind = windRgb(32);
    const bg = cellBackground(3.2, 0);
    const ink = arrowInk(wind, bg);
    expect(colorDistance(ink, bg)).toBeGreaterThanOrEqual(0.16);
    expect(ink[0]).toBeGreaterThan(ink[1]);
    expect(ink[1]).toBeGreaterThan(ink[2]);
    if (colorDistance(wind, bg) < 0.16) {
      expect(ink[0]).toBeLessThan(wind[0]);
      expect(ink[1]).toBeLessThan(wind[1]);
    }
  });

  it("keeps a light-wind arrow green on a teal thermal", () => {
    const wind = windRgb(12);
    const ink = arrowInk(wind, cellBackground(1, 0));
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
