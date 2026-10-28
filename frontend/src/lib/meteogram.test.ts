import { describe, expect, test } from "vitest";
import type { Hour } from "../api/types";
import { CLOUD_VEIL_PCT, sampleCell } from "./windgram";
import {
  cblSeries,
  cloudBands,
  cloudGray,
  cloudShade,
  cloudShadeStops,
  cloudSpans,
  METEO_Z_MAX_M,
  meteoHoursForDay,
  meteoHourTicks,
  niceCeil,
  smoothClosedPath,
  spreadLabels,
  tempRange,
  windMax,
} from "./meteogram";

function hour(
  time: string,
  surface: Partial<Hour["surface"]> = {},
  profile: Array<{ z: number; t: number; td: number; cloud?: number }> = [
    { z: 1000, t: 14, td: 8 },
  ],
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
      sensibleUp: null,
      latentUp: null,
      shortwave: 0,
      ...surface,
    },
    profile: profile.map((p) => ({
      z: p.z,
      src: "m" as const,
      t: p.t,
      rh: 50,
      td: p.td,
      cloud: p.cloud ?? 0,
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

  test("tempRange spans the air temperature, padded by 1°", () => {
    const hours = [
      hour("2026-08-31T06:00:00+02:00", { t2m: 8.4 }, [{ z: 1000, t: 10, td: 0 }]),
      hour("2026-08-31T15:00:00+02:00", { t2m: 21.6 }),
    ];
    const range = tempRange(hours);
    expect(range.min).toBe(7); // 8.4, the dew point of 0 stays off this axis
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

  test("the altitude axis is always 10 km", () => {
    expect(METEO_Z_MAX_M).toBe(10_000);
  });
});

/** A stable profile: cloud sits on the levels, with no convective clearing. */
function veiledProfile(cloudAt: Array<[number, number]>) {
  return cloudAt.map(([z, cloud]) => ({ z, t: 10 - z / 1000, td: -5, cloud }));
}

function redOf(color: string): number {
  return Number(color.match(/\d+/)?.[0]);
}

describe("cloudShadeStops", () => {
  test("eases the gray across the whole gap between two hours", () => {
    const stops = cloudShadeStops(
      [
        { x: 0, cover: 10 },
        { x: 100, cover: 100 },
      ],
      0,
      100,
    );
    expect(stops[0]).toEqual({ offset: 0, color: cloudGray(10) });
    expect(stops.at(-1)).toEqual({ offset: 1, color: cloudGray(100) });
    const mid = stops.find((stop) => Math.abs(stop.offset - 0.5) < 0.02);
    expect(mid?.color).not.toBe(cloudGray(10));
    expect(mid?.color).not.toBe(cloudGray(100));
    const early = stops.find((stop) => stop.offset > 0.15 && stop.offset < 0.35);
    expect(early?.color).not.toBe(cloudGray(10));
  });

  test("stays one gray when the cover does not change", () => {
    const stops = cloudShadeStops(
      [
        { x: 10, cover: 60 },
        { x: 30, cover: 60 },
      ],
      0,
      40,
    );
    expect(stops.every((stop) => stop.color === cloudGray(60))).toBe(true);
    expect(stops.some((stop) => stop.offset > 0.3 && stop.offset < 0.7)).toBe(true);
  });
});

describe("cloudShade", () => {
  test("a thin cover stays pale and overcast goes dark", () => {
    expect(cloudShade(10)).toBe(0);
    expect(cloudShade(100)).toBe(1);
    expect(cloudShade(40)).toBeGreaterThan(cloudShade(10));
    expect(cloudShade(40)).toBeLessThan(cloudShade(100));
    expect(cloudShade(0)).toBe(cloudShade(10));
  });

  test("the gray runs from a pale veil to a dense cloud", () => {
    expect(redOf(cloudGray(100, "light"))).toBeLessThan(redOf(cloudGray(40, "light")));
    expect(redOf(cloudGray(40, "light"))).toBeLessThan(redOf(cloudGray(10, "light")));
    expect(redOf(cloudGray(100, "dark"))).toBeGreaterThan(redOf(cloudGray(10, "dark")));
  });
});

describe("cloudSpans", () => {
  test("follows the windgram veil even when the strict cloud base is missing", () => {
    // Cover stays under 50 % and RH under 90 %, so the old deck rule drew
    // nothing. The windgram still veils from 10 %.
    const h = hour(
      "2026-08-31T12:00:00+02:00",
      { cloudBaseM: null, cloudLow: 0, cloudMid: 0, cloudHigh: 0, shortwave: 0 },
      veiledProfile([
        [1500, 0],
        [2500, 40],
        [3500, 40],
        [5000, 0],
      ]),
    );
    const spans = cloudSpans(h, 1000);
    expect(spans).toHaveLength(1);
    expect(spans[0]!.baseM).toBeGreaterThan(1500);
    expect(spans[0]!.baseM).toBeLessThanOrEqual(2500);
    expect(spans[0]!.topM).toBeGreaterThanOrEqual(3500);
    expect(spans[0]!.topM).toBeLessThan(5000);
    expect(spans[0]!.cover).toBe(40);

    for (let z = 1500; z <= 5000; z += 250) {
      const veiled = (sampleCell(h, z, 1000, null).cloud ?? 0) >= CLOUD_VEIL_PCT;
      const inside = spans.some((s) => z >= s.baseM && z <= s.topM);
      if (veiled) expect(inside).toBe(true);
    }
  });

  test("a cover under the veil draws no slice", () => {
    const h = hour(
      "2026-08-31T12:00:00+02:00",
      { cloudBaseM: null, cloudLow: 0, cloudMid: 0, cloudHigh: 0, shortwave: 0 },
      veiledProfile([
        [1500, 0],
        [3000, 5],
        [5000, 0],
      ]),
    );
    expect(cloudSpans(h, 1000)).toEqual([]);
  });

  test("two separated layers stay two slices", () => {
    const h = hour(
      "2026-08-31T12:00:00+02:00",
      { cloudBaseM: null, cloudLow: 0, cloudMid: 0, cloudHigh: 0, shortwave: 0 },
      veiledProfile([
        [1500, 0],
        [2000, 50],
        [3000, 0],
        [4500, 0],
        [5500, 50],
        [6500, 50],
        [8000, 0],
      ]),
    );
    const spans = cloudSpans(h, 1000);
    expect(spans).toHaveLength(2);
    expect(spans[0]!.topM).toBeLessThan(spans[1]!.baseM);
  });
});

describe("cloudBands", () => {
  const cloudy = (hh: number) =>
    hour(
      `2026-08-31T${String(hh).padStart(2, "0")}:00:00+02:00`,
      { cloudBaseM: null, cloudLow: 0, cloudMid: 0, cloudHigh: 0, shortwave: 0 },
      veiledProfile([
        [1500, 0],
        [2500, 30],
        [3500, 30],
        [5000, 0],
      ]),
    );
  const clear = (hh: number) =>
    hour(
      `2026-08-31T${String(hh).padStart(2, "0")}:00:00+02:00`,
      { cloudBaseM: null, cloudLow: 0, cloudMid: 0, cloudHigh: 0, shortwave: 0 },
      veiledProfile([
        [1500, 0],
        [2500, 0],
        [3500, 0],
        [5000, 0],
      ]),
    );

  test("a day the windgram veils all day is one band", () => {
    const bands = cloudBands([cloudy(10), cloudy(11), cloudy(12)], 1000);
    expect(bands).toHaveLength(1);
    expect(bands[0]!.map((p) => p.hour)).toEqual([10, 11, 12]);
  });

  test("a clear hour splits the band, and a missing hour does too", () => {
    const split = cloudBands([cloudy(10), cloudy(11), clear(12), cloudy(13)], 1000);
    expect(split.map((b) => b.map((p) => p.hour))).toEqual([[10, 11], [13]]);

    const gap = cloudBands([cloudy(10), cloudy(12)], 1000);
    expect(gap).toHaveLength(2);
  });
});

describe("cblSeries", () => {
  test("keeps only the hours where the convective layer exists", () => {
    // mixed to 1800 m (dry adiabat from 20 °C), then a cap
    const unstable = hour("2026-08-31T14:00:00+02:00", { t2m: 20, shortwave: 500 }, [
      { z: 1000, t: 20, td: 5 },
      { z: 1400, t: 16.1, td: 5 },
      { z: 1800, t: 12.2, td: 5 },
      { z: 2100, t: 16, td: 0 },
      { z: 2600, t: 12, td: -2 },
    ]);
    // night: surface inversion, no sun
    const stable = hour("2026-08-31T20:00:00+02:00", { t2m: 4, shortwave: 0 }, [
      { z: 1000, t: 4, td: 0 },
      { z: 1150, t: 10, td: 0 },
      { z: 1800, t: 8, td: 0 },
      { z: 2600, t: 4, td: -2 },
    ]);
    const series = cblSeries([unstable, stable], 1000);
    expect(series).toHaveLength(1);
    expect(series[0]?.hour).toBe(14);
    expect(series[0]?.zM).toBeGreaterThan(1700);
    expect(series[0]?.zM).toBeLessThan(2100);
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
