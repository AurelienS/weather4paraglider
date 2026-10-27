import { groupByDay } from "./format";
import type { Lang } from "./i18n";

export type HourStep = { day: string; hourIdx: number };

/** Move one display hour forward or back, crossing into the next or previous
 * day. Returns null at either end of the forecast, or when the step would
 * not change the selection. */
export function shiftHourSelection(
  hours: readonly { time: string }[],
  day: string | null,
  hourIdx: number,
  delta: -1 | 1,
  lang: Lang = "en",
): HourStep | null {
  const days = groupByDay(hours, lang);
  if (days.length === 0) return null;
  const activeKey = day && days.some((d) => d.key === day) ? day : days[0]!.key;
  const dayIndex = days.findIndex((d) => d.key === activeKey);
  if (dayIndex < 0) return null;
  const list = days[dayIndex]!.hours;
  const current = hours[hourIdx];
  let hIndex = list.findIndex((h) => h.time === current?.time);
  if (hIndex < 0) hIndex = 0;

  let nextDay = dayIndex;
  let nextH = hIndex + delta;
  if (nextH >= list.length) {
    nextDay += 1;
    nextH = 0;
  } else if (nextH < 0) {
    nextDay -= 1;
    if (nextDay < 0) return null;
    nextH = days[nextDay]!.hours.length - 1;
  }
  if (nextDay >= days.length) return null;
  const target = days[nextDay]!.hours[nextH];
  if (!target) return null;
  const idx = hours.findIndex((h) => h.time === target.time);
  if (idx < 0) return null;
  if (idx === hourIdx && days[nextDay]!.key === activeKey) return null;
  return { day: days[nextDay]!.key, hourIdx: idx };
}
