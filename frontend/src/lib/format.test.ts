import { describe, expect, it } from "vitest";
import {
  dayHasShoulder,
  groupByDay,
  hourOfDay,
  hourWindow,
  selectionAfterLoad,
  snapHourIdx,
  CORE_HOUR_WINDOW,
} from "./format";

// fixed dates in the past so pickDefaultHour is deterministic
// (every slot is "before now", so the default is the last slot)
const DAY = (n: number) => `2024-07-${String(10 + n).padStart(2, "0")}`;
const slot = (day: number, hour: number): { time: string } => ({
  time: `${DAY(day)}T${String(hour).padStart(2, "0")}:00:00+02:00`,
});

function hourly(dayCount: number): { time: string }[] {
  const out: { time: string }[] = [];
  for (let d = 0; d < dayCount; d++) {
    for (let h = 8; h <= 20; h++) out.push(slot(d, h));
  }
  return out;
}

function fullDay(): { time: string }[] {
  const out: { time: string }[] = [];
  for (let h = 0; h <= 23; h++) out.push(slot(0, h));
  return out;
}

function threeHourly(dayCount: number): { time: string }[] {
  const out: { time: string }[] = [];
  for (let d = 0; d < dayCount; d++) {
    for (const h of [10, 13, 16, 19]) out.push(slot(d, h));
  }
  return out;
}

describe("selectionAfterLoad", () => {
  it("keeps the selected day and hour when both exist in the new data", () => {
    const next = selectionAfterLoad(
      hourly(3),
      DAY(1),
      `${DAY(1)}T14:00:00+02:00`,
    );
    expect(next.day).toBe(DAY(1));
    expect(next.hourIdx).toBe(13 + 6); // day 1, 14:00 is the 7th slot of the day
  });

  it("keeps the day and falls back to the closest earlier hour when the step is coarser", () => {
    const next = selectionAfterLoad(
      threeHourly(3),
      DAY(1),
      `${DAY(1)}T14:00:00+02:00`,
    );
    expect(next.day).toBe(DAY(1));
    expect(next.hourIdx).toBe(4 + 1); // day 1, 13:00
  });

  it("keeps the day and picks its first hour when no hour was selected", () => {
    const next = selectionAfterLoad(hourly(3), DAY(1), null);
    expect(next.day).toBe(DAY(1));
    expect(next.hourIdx).toBe(13);
  });

  it("keeps the day and picks its first hour when the selected hour precedes it", () => {
    const next = selectionAfterLoad(hourly(3), DAY(1), `${DAY(1)}T03:00:00+02:00`);
    expect(next.day).toBe(DAY(1));
    expect(next.hourIdx).toBe(13);
  });

  it("skips 07:00 and 21:00 when choosing the default flying hour", () => {
    const hours = [slot(0, 7), slot(0, 8), slot(0, 20), slot(0, 21), slot(0, 22)];
    const next = selectionAfterLoad(hours, null, null);
    expect(next.day).toBe(DAY(0));
    expect(next.hourIdx).toBe(2);
  });

  it("clamps a carried 22:00 selection back to 20:00", () => {
    const hours = [slot(0, 7), slot(0, 8), slot(0, 20), slot(0, 21), slot(0, 22)];
    const next = selectionAfterLoad(hours, DAY(0), `${DAY(0)}T22:00:00+02:00`);
    expect(next.day).toBe(DAY(0));
    expect(next.hourIdx).toBe(2);
  });

  it("keeps 06:00 while the morning is open and 22:00 while the evening is open", () => {
    const hours = fullDay();
    const early = selectionAfterLoad(
      hours,
      DAY(0),
      `${DAY(0)}T06:00:00+02:00`,
      hourWindow(true, false),
    );
    expect(early.hourIdx).toBe(6);
    const late = selectionAfterLoad(
      hours,
      DAY(0),
      `${DAY(0)}T22:00:00+02:00`,
      hourWindow(false, true),
    );
    expect(late.hourIdx).toBe(22);
  });

  it("falls back to the default slot when the selected day is gone", () => {
    const hours = hourly(2);
    const next = selectionAfterLoad(hours, DAY(2), `${DAY(2)}T14:00:00+02:00`);
    expect(next.day).toBe(DAY(1));
    expect(next.hourIdx).toBe(hours.length - 1);
  });

  it("falls back to the default slot when no day was selected", () => {
    const hours = hourly(2);
    const next = selectionAfterLoad(hours, null, null);
    expect(next.day).toBe(DAY(1));
    expect(next.hourIdx).toBe(hours.length - 1);
  });

  it("returns no day for empty hours", () => {
    expect(selectionAfterLoad([], DAY(0), null)).toEqual({ day: null, hourIdx: 0 });
  });
});

describe("hour shoulders", () => {
  it("reads midnight as 0", () => {
    expect(hourOfDay("2026-08-28T00:00:00+02:00")).toBe(0);
    expect(hourOfDay("2026-01-15T00:00:00+01:00")).toBe(0);
  });

  it("opens each side of 08:00–20:00 on its own", () => {
    expect(hourWindow(false, false)).toEqual(CORE_HOUR_WINDOW);
    expect(hourWindow(true, false)).toEqual({ min: 0, max: 20 });
    expect(hourWindow(false, true)).toEqual({ min: 8, max: 23 });
    expect(hourWindow(true, true)).toEqual({ min: 0, max: 23 });
  });

  it("groups 08:00–20:00 unless a shoulder is open", () => {
    const hours = fullDay();
    const core = groupByDay(hours)[0]?.hours.map((h) => hourOfDay(h.time));
    expect(core?.[0]).toBe(8);
    expect(core?.at(-1)).toBe(20);
    expect(core).toHaveLength(13);
    const early = groupByDay(hours, "en", hourWindow(true, false))[0]?.hours;
    expect(early?.map((h) => hourOfDay(h.time))[0]).toBe(0);
    expect(early).toHaveLength(21);
    const both = groupByDay(hours, "en", hourWindow(true, true))[0]?.hours;
    expect(both).toHaveLength(24);
  });

  it("notices a shoulder only when that day has an hour on it", () => {
    const hours = fullDay();
    expect(dayHasShoulder(hours, DAY(0), "early")).toBe(true);
    expect(dayHasShoulder(hours, DAY(0), "late")).toBe(true);
    expect(dayHasShoulder(hourly(1), DAY(0), "early")).toBe(false);
    expect(dayHasShoulder([slot(0, 8), slot(0, 20)], DAY(0), "late")).toBe(false);
    expect(dayHasShoulder([slot(0, 21)], DAY(0), "late")).toBe(true);
  });

  it("snaps an hour back inside 08:00–20:00 when its shoulder closes", () => {
    const hours = fullDay();
    expect(snapHourIdx(hours, 5, CORE_HOUR_WINDOW)).toEqual({ day: DAY(0), hourIdx: 8 });
    expect(snapHourIdx(hours, 22, CORE_HOUR_WINDOW)).toEqual({ day: DAY(0), hourIdx: 20 });
    expect(snapHourIdx(hours, 14, CORE_HOUR_WINDOW)).toBeNull();
    expect(snapHourIdx(hours, 22, hourWindow(false, true))).toBeNull();
    expect(snapHourIdx(hours, 5, hourWindow(true, false))).toBeNull();
  });
});
