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
    const avgs = averageHours([
      // z: [1000, 2000], t: [10, 0] → 5 at 1500 m
      [hour("2026-08-31T10:00:00+02:00", 10, 10, 0, [1000, 2000], [10, 0])],
      // z: [1000, 2000], t: [12, 2] → 7 at 1500 m
      [hour("2026-08-31T10:00:00+02:00", 12, 10, 0, [1000, 2000], [12, 2])],
    ]);
    const z1500 = avgs[0]?.profile.find((p) => p.z === 1500);
    // mean of the two interpolated profiles: (5+7)/2
    expect(z1500?.t).toBeCloseTo(6, 6);
    expect(z1500?.src).toBe("avg");
    // the grid starts at the models' lowest level (rounded up): no dead
    // null zone below the terrain, so profile[0] has a real surface Td
    expect(avgs[0]?.profile[0]?.z).toBe(1000);
    expect(avgs[0]?.profile[0]?.td).not.toBeNull();
    // the convective shading (yellow thermal band in the windgram) depends
    // on convectiveTop finding that anchor — it must survive resampling
    expect(convectiveTop(avgs[0]!, 1000)).not.toBeNull();
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
