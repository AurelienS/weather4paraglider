import { describe, expect, it } from "vitest";
import { decimateMinutelyToHourly } from "./openmeteo";

describe("decimateMinutelyToHourly", () => {
  it("keeps only the on-the-hour steps of the 15-minutely series", () => {
    const out = decimateMinutelyToHourly({
      minutely_15: {
        time: [
          "2026-08-28T07:00",
          "2026-08-28T07:15",
          "2026-08-28T07:30",
          "2026-08-28T07:45",
          "2026-08-28T08:00",
        ],
        temperature_2m: [10, 10.1, 10.2, 10.3, 11],
        wind_speed_100m: [20, 21, 22, 23, 24],
      },
    });
    expect(out.hourly?.time).toEqual(["2026-08-28T07:00", "2026-08-28T08:00"]);
    expect(out.hourly?.temperature_2m).toEqual([10, 11]);
    expect(out.hourly?.wind_speed_100m).toEqual([20, 24]);
    expect(out.minutely_15).toBeDefined();
  });

  it("merges the extra hourly block aligned on wall time", () => {
    const out = decimateMinutelyToHourly({
      minutely_15: {
        time: ["2026-08-28T07:00", "2026-08-28T08:00"],
        temperature_2m: [10, 11],
      },
      hourly: {
        time: ["2026-08-28T07:00", "2026-08-28T08:00"],
        cloud_cover_mid: [30, 40],
        cloud_cover_high: [5, 6],
      },
    });
    expect(out.hourly?.cloud_cover_mid).toEqual([30, 40]);
    expect(out.hourly?.cloud_cover_high).toEqual([5, 6]);
    expect(out.hourly?.temperature_2m).toEqual([10, 11]);
  });

  it("fills nulls when the extra hourly block misses a time stamp", () => {
    const out = decimateMinutelyToHourly({
      minutely_15: {
        time: ["2026-08-28T07:00", "2026-08-28T08:00"],
        temperature_2m: [10, 11],
      },
      hourly: { time: ["2026-08-28T09:00"], cloud_cover_high: [55] },
    });
    expect(out.hourly?.cloud_cover_high).toEqual([null, null]);
    expect(out.hourly?.temperature_2m).toEqual([10, 11]);
  });

  it("returns an empty hourly block for empty input", () => {
    const out = decimateMinutelyToHourly({});
    expect(out.hourly?.time).toEqual([]);
  });
});
