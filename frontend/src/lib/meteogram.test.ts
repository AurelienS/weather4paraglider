import { describe, expect, test } from "vitest";
import type { Hour } from "../api/types";
import {
  cblSeries,
  cloudDecks,
  cloudMaxM,
  meteoHoursForDay,
  meteoHourTicks,
  niceCeil,
  smoothClosedPath,
  spreadLabels,
  surfaceTd,
  tempRange,
  windMax,
} from "./meteogram";

function hour(
  time: string,
  surface: Partial<Hour["surface"]> = {},
  profile: Array<{ z: number; t: number; td: number }> = [{ z: 1000, t: 14, td: 8 }],
): Hour {
  return {
    time,
    surface: {
      t2m: 14,
      rh2m: 55,
      wind10: 10,
      dir10: 225,
      gust10: 25,
      cape: 300,
      precip: 0,
      cloudLow: 10,
      cloudMid: 20,
      cloudHigh: 30,
      cloudBaseM: 2500,
      psfc: 850,
      ...surface,
    },
    profile: profile.map((p) => ({
      z: p.z,
      src: "m" as const,
      t: p.t,
      rh: 50,
      td: p.td,
      cloud: 0,
      wind: 12,
      dir: 270,
    })),
  };
}

describe("meteoHoursForDay", () => {
  test("keeps the 24 h of the requested day, sorted by time", () => {
    const hours = [
      hour("2026-08-31T18:00:00+02:00"),
      hour("2026-09-01T02:00:00+02:00"),
      hour("2026-08-31T06:00:00+02:00"),
      hour("2026-08-31T22:00:00+02:00"),
      hour("2026-08-31T01:00:00+02:00"),
    ];
    const day = meteoHoursForDay(hours, "2026-08-31");
    expect(day.map((h) => h.time)).toEqual([
      "2026-08-31T01:00:00+02:00",
      "2026-08-31T06:00:00+02:00",
      "2026-08-31T18:00:00+02:00",
      "2026-08-31T22:00:00+02:00",
    ]);
  });

  test("an empty day yields an empty list", () => {
    expect(meteoHoursForDay([hour("2026-08-31T12:00:00+02:00")], "2026-09-02")).toEqual([]);
  });
});

describe("axis ranges", () => {
  test("niceCeil rounds up to the step", () => {
    expect(niceCeil(23, 10)).toBe(30);
    expect(niceCeil(30, 10)).toBe(30);
    expect(niceCeil(1.2, 1)).toBe(2);
  });

  test("tempRange spans t2m and the surface dew point, padded by 1°", () => {
    const hours = [
      hour("2026-08-31T06:00:00+02:00", { t2m: 8.4 }),
      hour("2026-08-31T15:00:00+02:00", { t2m: 21.6 }),
    ];
    const range = tempRange(hours);
    expect(range.min).toBe(7); // td 8 (lowest profile level) - 1
    expect(range.max).toBe(23); // 21.6 + 1, ceiled
  });

  test("tempRange falls back to a default window without values", () => {
    expect(tempRange([])).toEqual({ min: 0, max: 20 });
  });

  test("windMax covers gusts, rounded to the next 10", () => {
    const hours = [
      hour("2026-08-31T12:00:00+02:00", { wind10: 8, gust10: 36 }),
      hour("2026-08-31T13:00:00+02:00", { wind10: 12, gust10: 40 }),
    ];
    expect(windMax(hours)).toBe(40);
  });

  test("cloudMaxM stays in the 3000–5000 m window", () => {
    const low = [hour("2026-08-31T12:00:00+02:00", { cloudBaseM: 1200 })];
    const high = [hour("2026-08-31T12:00:00+02:00", { cloudBaseM: 3800 })];
    expect(cloudMaxM(low)).toBe(5000); // 1200 + 4900 → capped
    expect(cloudMaxM(high)).toBe(5000);
  });
});

describe("cloudDecks", () => {
  test("stacks the three cover layers above the cloud base", () => {
    const decks = cloudDecks(
      hour("2026-08-31T12:00:00+02:00", { cloudBaseM: 800, cloudLow: 80, cloudMid: 40, cloudHigh: 0 }),
    );
    // low: 800 + max(150, 0.8 * 1500) → up to 2000 m
    expect(decks[0]).toEqual({ baseM: 800, topM: 2000, cover: 80 });
    // mid: offset 1700 above the base, 0.4 * 1500 thick
    expect(decks[1]).toEqual({ baseM: 2500, topM: 3100, cover: 40 });
    // high: cover 0 → no band
    expect(decks[2]).toBeNull();
  });

  test("no cloud base → no decks at all", () => {
    const decks = cloudDecks(hour("2026-08-31T12:00:00+02:00", { cloudBaseM: null }));
    expect(decks).toEqual([null, null, null]);
  });
});

describe("cblSeries", () => {
  test("keeps only the hours where the convective layer exists", () => {
    // unstable: surface 14° vs 5° at 2500 m → convection up to ~2500
    const unstable = hour("2026-08-31T14:00:00+02:00", {}, [
      { z: 1000, t: 14, td: 8 },
      { z: 2500, t: 5, td: 0 },
    ]);
    // stable: warmer aloft than the dry parcel from the ground
    const stable = hour("2026-08-31T20:00:00+02:00", { t2m: 4 }, [
      { z: 1000, t: 12, td: 2 },
      { z: 2500, t: 11, td: 0 },
    ]);
    const series = cblSeries([unstable, stable], 1000);
    expect(series).toHaveLength(1);
    expect(series[0]?.hour).toBe(14);
    expect(series[0]?.zM).toBeGreaterThan(1000);
  });

  test("surfaceTd reads the lowest profile level", () => {
    const h = hour("2026-08-31T12:00:00+02:00", {}, [
      { z: 1600, t: 12, td: 4 },
      { z: 2000, t: 10, td: 1 },
    ]);
    expect(surfaceTd(h)).toBe(4);
  });
});

describe("meteoHourTicks", () => {
  test("labels every step hours over the whole day", () => {
    expect(meteoHourTicks(3)).toEqual([0, 3, 6, 9, 12, 15, 18, 21]);
    expect(meteoHourTicks(6)).toEqual([0, 6, 12, 18]);
  });
});

describe("spreadLabels", () => {
  test("keeps a vertical gap between labels that would overlap", () => {
    const ys = spreadLabels(
      [
        { key: "a", y: 100 },
        { key: "b", y: 105 },
        { key: "c", y: 140 },
      ],
      10,
      200,
      13,
    );
    expect(ys.a).toBeLessThanOrEqual(ys.b! - 13);
    expect(ys.c).toBe(140); // already far enough: untouched
  });

  test("clamps the labels into the band", () => {
    const ys = spreadLabels(
      [
        { key: "top", y: -30 },
        { key: "bottom", y: 400 },
      ],
      10,
      200,
      13,
    );
    expect(ys.top).toBeGreaterThanOrEqual(10);
    expect(ys.bottom).toBeLessThanOrEqual(200);
    expect(ys.bottom! - ys.top!).toBeGreaterThanOrEqual(13);
  });
});

describe("smoothClosedPath", () => {
  test("closes the outline with curves and rounded corners", () => {
    const d = smoothClosedPath([
      { x: 0, y: 100 },
      { x: 50, y: 100 },
      { x: 50, y: 80 },
      { x: 0, y: 80 },
    ]);
    expect(d.startsWith("M")).toBe(true);
    expect(d.endsWith("Z")).toBe(true);
    // quadratic curves through the midpoints: corners never appear verbatim
    expect(d).toContain("Q");
    expect(d).not.toContain("L 50,80");
  });
});
