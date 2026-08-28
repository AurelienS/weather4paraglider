import { describe, expect, it } from "vitest";
import { cacheSlotUtc, hourHasData } from "./pipeline";
import type { ProfilePoint, Surface } from "./types";

describe("cacheSlotUtc", () => {
  it("floors to the 3-hour slot by default", () => {
    const now = Date.UTC(2026, 7, 28, 14, 37, 12);
    expect(cacheSlotUtc(now)).toBe("2026-08-28T12:00:00Z");
  });

  it("supports a 1-hour slot for the 15-minute nowcast", () => {
    const now = Date.UTC(2026, 7, 28, 14, 37, 12);
    expect(cacheSlotUtc(now, 1)).toBe("2026-08-28T14:00:00Z");
  });

  it("rolls back to 00:00 early in the day", () => {
    const now = Date.UTC(2026, 7, 28, 1, 10, 0);
    expect(cacheSlotUtc(now, 3)).toBe("2026-08-28T00:00:00Z");
  });
});

const emptySurface = {} as Surface;
const emptyPoint: ProfilePoint = {
  z: 1500,
  src: "h2",
  t: null,
  rh: null,
  td: null,
  wind: null,
  dir: null,
  cloud: null,
};

describe("hourHasData", () => {
  it("keeps an hour with any surface value", () => {
    expect(hourHasData({ ...emptySurface, t2m: 12.5 }, [])).toBe(true);
    expect(hourHasData({ ...emptySurface, wind10: 3 }, [emptyPoint])).toBe(true);
    expect(hourHasData({ ...emptySurface, precip: 0 }, [])).toBe(true);
  });

  it("keeps an hour with any profile value", () => {
    expect(hourHasData(emptySurface, [{ ...emptyPoint, wind: 12 }])).toBe(true);
    expect(hourHasData(emptySurface, [{ ...emptyPoint, cloud: 40 }])).toBe(true);
  });

  it("drops an hour that is null everywhere", () => {
    expect(hourHasData(emptySurface, [emptyPoint, { ...emptyPoint, z: 2000 }])).toBe(false);
    expect(hourHasData(emptySurface, [])).toBe(false);
  });
});
