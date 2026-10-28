import { describe, expect, test } from "vitest";
import { hourWindow } from "./format";
import { shiftHourSelection } from "./hours";

const hours = [
  { time: "2030-01-01T08:00:00+01:00" },
  { time: "2030-01-01T09:00:00+01:00" },
  { time: "2030-01-01T10:00:00+01:00" },
  { time: "2030-01-02T08:00:00+01:00" },
  { time: "2030-01-02T09:00:00+01:00" },
];

describe("shiftHourSelection", () => {
  test("steps inside the day", () => {
    expect(shiftHourSelection(hours, "2030-01-01", 0, 1)).toEqual({
      day: "2030-01-01",
      hourIdx: 1,
    });
    expect(shiftHourSelection(hours, "2030-01-01", 1, -1)).toEqual({
      day: "2030-01-01",
      hourIdx: 0,
    });
  });

  test("crosses into the next and previous day", () => {
    expect(shiftHourSelection(hours, "2030-01-01", 2, 1)).toEqual({
      day: "2030-01-02",
      hourIdx: 3,
    });
    expect(shiftHourSelection(hours, "2030-01-02", 3, -1)).toEqual({
      day: "2030-01-01",
      hourIdx: 2,
    });
  });

  test("stops at the ends of the forecast", () => {
    expect(shiftHourSelection(hours, "2030-01-01", 0, -1)).toBeNull();
    expect(shiftHourSelection(hours, "2030-01-02", 4, 1)).toBeNull();
  });

  test("steps into a shoulder only while that side is open", () => {
    const full: { time: string }[] = [];
    for (const day of ["2030-01-01", "2030-01-02"]) {
      for (let h = 0; h <= 23; h++) {
        full.push({ time: `${day}T${String(h).padStart(2, "0")}:00:00+01:00` });
      }
    }
    expect(shiftHourSelection(full, "2030-01-01", 20, 1)).toEqual({
      day: "2030-01-02",
      hourIdx: 24 + 8,
    });
    expect(shiftHourSelection(full, "2030-01-01", 20, 1, "en", hourWindow(false, true))).toEqual({
      day: "2030-01-01",
      hourIdx: 21,
    });
    expect(shiftHourSelection(full, "2030-01-01", 8, -1, "en", hourWindow(true, false))).toEqual({
      day: "2030-01-01",
      hourIdx: 7,
    });
    expect(shiftHourSelection(full, "2030-01-01", 23, 1, "en", hourWindow(true, true))).toEqual({
      day: "2030-01-02",
      hourIdx: 24,
    });
  });
});
