import { describe, expect, it } from "vitest";
import { selectionAfterLoad } from "./format";

// fixed dates in the past so pickDefaultHour is deterministic
// (every slot is "before now", so the default is the last slot)
const DAY = (n: number) => `2024-07-${String(10 + n).padStart(2, "0")}`;
const slot = (day: number, hour: number): { time: string } => ({
  time: `${DAY(day)}T${String(hour).padStart(2, "0")}:00:00+02:00`,
});

function hourly(dayCount: number): { time: string }[] {
  const out: { time: string }[] = [];
  for (let d = 0; d < dayCount; d++) {
    for (let h = 7; h <= 22; h++) out.push(slot(d, h));
  }
  return out;
}

function threeHourly(dayCount: number): { time: string }[] {
  const out: { time: string }[] = [];
  for (let d = 0; d < dayCount; d++) {
    for (const h of [7, 10, 13, 16, 19, 22]) out.push(slot(d, h));
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
    expect(next.hourIdx).toBe(16 + 7); // day 1, 14:00 is the 8th slot of the day
  });

  it("keeps the day and falls back to the closest earlier hour when the step is coarser", () => {
    const next = selectionAfterLoad(
      threeHourly(3),
      DAY(1),
      `${DAY(1)}T14:00:00+02:00`,
    );
    expect(next.day).toBe(DAY(1));
    expect(next.hourIdx).toBe(6 + 2); // day 1, 13:00
  });

  it("keeps the day and picks its first hour when no hour was selected", () => {
    const next = selectionAfterLoad(hourly(3), DAY(1), null);
    expect(next.day).toBe(DAY(1));
    expect(next.hourIdx).toBe(16);
  });

  it("keeps the day and picks its first hour when the selected hour precedes it", () => {
    const next = selectionAfterLoad(hourly(3), DAY(1), `${DAY(1)}T03:00:00+02:00`);
    expect(next.day).toBe(DAY(1));
    expect(next.hourIdx).toBe(16);
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
