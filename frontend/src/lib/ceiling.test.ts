import { describe, expect, it } from "vitest";
import type { Hour, ProfilePoint, Surface } from "../api/types";
import {
  altitudeCeiling,
  canSeeHigher,
  cloudTopM,
  CLOUD_INFLUENCE_Z_MAX_M,
  FLYING_Z_MAX_M,
} from "./ceiling";

const surface = {
  t2m: null,
  rh2m: null,
  wind10: null,
  dir10: null,
  gust10: null,
  cape: null,
  precip: null,
  cloudLow: null,
  cloudMid: null,
  cloudHigh: null,
  cloudBaseM: null,
  psfc: null,
  sensibleUp: null,
  latentUp: null,
  shortwave: null,
} satisfies Surface;

function hour(clouds: Array<[number, number | null]>, time = "2026-08-28T12:00:00+02:00"): Hour {
  const profile: ProfilePoint[] = clouds.map(([z, cloud]) => ({
    z,
    src: "p",
    t: null,
    rh: null,
    td: null,
    wind: null,
    dir: null,
    cloud,
  }));
  return { time, surface, profile };
}

describe("cloud ceiling", () => {
  it("ignores a clear sky and a veil too thin to paint", () => {
    const hours = [hour([[3000, 80], [5600, 0], [9000, 9], [11000, null]])];
    expect(cloudTopM(hours)).toBe(3000);
    expect(canSeeHigher(hours)).toBe(false);
    expect(altitudeCeiling(hours, true)).toBe(FLYING_Z_MAX_M);
  });

  it("opens to 10 km instead of stopping on the highest cloud", () => {
    const hours = [hour([[4200, 40], [7200, 55], [8100, 0], [12000, 0]])];
    expect(cloudTopM(hours)).toBe(7200);
    expect(canSeeHigher(hours)).toBe(true);
    expect(altitudeCeiling(hours, false)).toBe(5000);
    expect(altitudeCeiling(hours, true)).toBe(CLOUD_INFLUENCE_Z_MAX_M);
  });

  it("does not follow cloud above 10 km", () => {
    const hours = [hour([[6000, 20], [12500, 80]])];
    expect(cloudTopM(hours)).toBe(12500);
    expect(altitudeCeiling(hours, true)).toBe(CLOUD_INFLUENCE_Z_MAX_M);
  });

  it("does not pass the last measured level", () => {
    expect(altitudeCeiling([hour([[8000, 10]])], true)).toBe(8000);
    expect(altitudeCeiling([hour([[7200, 40], [8100, 0]])], true)).toBe(8100);
  });

  it("uses 10 km when any displayed hour has cloud above 5 km", () => {
    const hours = [
      hour([[6000, 0]], "2026-08-28T09:00:00+02:00"),
      hour([[6000, 0], [9300, 30], [13000, 0]], "2026-08-28T15:00:00+02:00"),
    ];
    expect(cloudTopM(hours)).toBe(9300);
    expect(altitudeCeiling(hours, true)).toBe(CLOUD_INFLUENCE_Z_MAX_M);
  });
});
