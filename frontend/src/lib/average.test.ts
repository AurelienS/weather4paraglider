import { describe, expect, test } from "vitest";
import { averageHours, averageResponses, meanWind } from "./average";
import type { AromeResponse, Hour } from "../api/types";
import { convectiveTop } from "./windgram";

function hour(
  time: string,
  t2m: number | null,
  wind: number | null,
  dir: number | null,
  z: number[] = [1000, 2000],
  t: number[] = [10, 0],
  surface: Partial<Hour["surface"]> = {},
): Hour {
  return {
    time,
    surface: {
      t2m,
      rh2m: 60,
      wind10: wind,
      dir10: dir,
      gust10: wind == null ? null : wind + 5,
      cape: 100,
      precip: 0,
      cloudLow: 10,
      cloudMid: 20,
      cloudHigh: 30,
      cloudBaseM: 2000,
      psfc: 850,
      sensibleUp: null,
      latentUp: null,
      shortwave: 0,
      ...surface,
    },
    profile: z.map((alt, i) => ({
      z: alt,
      src: "m",
      t: t[i] ?? null,
      rh: 50,
      td: 5,
      wind: 12,
      dir: 270,
      cloud: 0,
    })),
  };
}

function response(model: string, elevation: number, hours: Hour[]): AromeResponse {
  return {
    model,
    grid: "0.1°",
    source: "test",
    lat: 46,
    lon: 7,
    modelElevationM: elevation,
    nearestCell: { lat: 46, lon: 7 },
    runInitUtc: model === "a" ? "2026-08-31T03:00:00Z" : "2026-08-31T15:00:00Z",
    runAvailable: true,
    timezone: "Europe/Paris",
    fetchedAt: "2026-08-31T16:00:00Z",
    hours,
    warnings: [],
    attribution: "test",
  };
}

describe("meanWind", () => {
  test("means wind vectors, not degrees", () => {
    // 10 kt from north (0°) and 10 kt from east (90°) → 7.07 kt from 45°
    const { wind, dir } = meanWind([10, 10], [0, 90]);
    expect(wind).toBeCloseTo(7.07, 2);
    expect(dir).toBeCloseTo(45, 1);
  });

  test("skips nulls and averages the remaining pairs", () => {
    // the (null, 0°) pair is dropped: only (10, 90°) remains
    expect(meanWind([null, 10], [0, 90])).toEqual({ wind: 10, dir: 90 });
    expect(meanWind([null, null], [null, null])).toEqual({ wind: null, dir: null });
  });
});

describe("averageHours", () => {
  test("unions the timelines and averages surface fields", () => {
    const avgs = averageHours([
      [hour("2026-08-31T10:00:00+02:00", 10, 10, 0), hour("2026-08-31T12:00:00+02:00", 12, 20, 90)],
      [hour("2026-08-31T10:00:00+02:00", 14, 10, 90)],
    ]);
    expect(avgs).toHaveLength(2);
    const ten = avgs[0];
    const twelve = avgs[1];
    expect(ten?.time).toBe("2026-08-31T10:00:00+02:00");
    // the 12:00 hour exists in one model only: it still contributes
    expect(ten?.surface.t2m).toBe(12);
    // gust is a scalar mean, integer like every wind speed: (10+5 and 10+5)/2
    expect(ten?.surface.gust10).toBe(15);
    // wind10 is a vector mean rounded to the integer: 10 kt from N and
    // 10 kt from E → 7 km/h from 45°
    expect(ten?.surface.wind10).toBe(7);
    expect(ten?.surface.dir10).toBe(45);
    expect(twelve?.surface.t2m).toBe(12);
    expect(twelve?.surface.wind10).toBe(20);
  });

  test("resamples profiles on a common 100 m grid", () => {
    const sun = { shortwave: 600, sensibleUp: null as number | null, latentUp: 40 };
    const avgs = averageHours([
      // dry adiabat 20 → 10.2, then a cap at 2500. Midpoint 15.1 °C.
      [
        hour(
          "2026-08-31T10:00:00+02:00",
          20,
          10,
          0,
          [1000, 2000, 2500],
          [20, 10.2, 16],
          sun,
        ),
      ],
      // same shape, 2 °C warmer. Midpoint 17.1 °C. Null flux is skipped.
      [
        hour(
          "2026-08-31T10:00:00+02:00",
          22,
          10,
          0,
          [1000, 2000, 2500],
          [22, 12.2, 18],
          { shortwave: 600, sensibleUp: 120, latentUp: 20 },
        ),
      ],
    ]);
    const z1500 = avgs[0]?.profile.find((p) => p.z === 1500);
    // mean of the two interpolated profiles: (15.1+17.1)/2
    expect(z1500?.t).toBeCloseTo(16.1, 5);
    expect(z1500?.src).toBe("avg");
    expect(avgs[0]?.surface.t2m).toBe(21);
    expect(avgs[0]?.surface.shortwave).toBe(600);
    // null sensible flux on one model: the other model's value stands
    expect(avgs[0]?.surface.sensibleUp).toBe(120);
    expect(avgs[0]?.surface.latentUp).toBe(30);
    // the grid starts at the models' lowest level (rounded up): no dead
    // null zone below the terrain, so profile[0] has a real surface Td
    expect(avgs[0]?.profile[0]?.z).toBe(1000);
    expect(avgs[0]?.profile[0]?.td).not.toBeNull();
    // the convective shading depends on convectiveTop finding that mixed
    // layer and its cap after resampling
    const top = convectiveTop(avgs[0]!, 1000);
    expect(top).toBeGreaterThan(1800);
    expect(top).toBeLessThan(2500);
  });
});

describe("averageResponses", () => {
  test("needs at least two models", () => {
    const one = response("a", 1600, []);
    expect(averageResponses([one])).toBeNull();
  });

  test("averages elevation and anchors the run on the newest", () => {
    const avg = averageResponses([
      response("a", 1600, [hour("2026-08-31T10:00:00+02:00", 10, 10, 0)]),
      response("b", 1400, [hour("2026-08-31T10:00:00+02:00", 12, 10, 0)]),
    ]);
    expect(avg?.modelElevationM).toBe(1500);
    expect(avg?.runInitUtc).toBe("2026-08-31T15:00:00Z");
    expect(avg?.hours).toHaveLength(1);
  });
});
