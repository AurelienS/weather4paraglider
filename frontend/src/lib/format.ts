import type { Hour } from "../api/types";

import type { Lang } from "./i18n";

// compass letters per UI language (O = Ouest/West in fr/de/es)
const COMPASS: Record<Lang, readonly string[]> = {
  en: ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"],
  fr: ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSO", "SO", "OSO", "O", "ONO", "NO", "NNO"],
  de: ["N", "NNO", "NO", "ONO", "O", "OSO", "SO", "SSO", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"],
  es: ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSO", "SO", "OSO", "O", "ONO", "NO", "NNO"],
};

const LOCALES: Record<Lang, string> = {
  en: "en-GB",
  fr: "fr-FR",
  de: "de-DE",
  es: "es-ES",
};

export const DEMO_POINT = { lat: 45.945, lon: 6.71, label: "Aravis" } as const;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function parseCoord(raw: string): number | null {
  const n = Number(raw.trim().replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function compass(dir: number | null | undefined, lang: Lang = "en"): string {
  if (dir == null || !Number.isFinite(dir)) return "—";
  const deg = ((dir % 360) + 360) % 360;
  const i = Math.round(deg / 22.5) % 16;
  return COMPASS[lang][i] ?? "—";
}

export function fmtT(v: number | null | undefined): string {
  if (v == null) return "—";
  return `${v.toFixed(1)}°`;
}

export function fmtInt(v: number | null | undefined, unit = ""): string {
  if (v == null) return "—";
  return unit ? `${v}\u00a0${unit}` : String(v);
}

export function fmtPrecip(v: number | null | undefined): string {
  if (v == null) return "—";
  if (v === 0) return "0";
  return `${v.toFixed(1)}\u00a0mm`;
}

export function hourLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  });
}

export function hourShort(iso: string): string {  const raw = new Date(iso).toLocaleTimeString("en-GB", {
    hour: "numeric",
    hour12: false,
    timeZone: "Europe/Paris",
  });
  const h = Number.parseInt(raw, 10);
  return `${pad(h)}:00`;
}

export function hourOfDay(iso: string): number {
  const part = new Intl.DateTimeFormat("fr-FR", {
    hour: "numeric",
    hour12: false,
    timeZone: "Europe/Paris",
  })
    .formatToParts(new Date(iso))
    .find((p) => p.type === "hour");
  const h = Number.parseInt(part?.value ?? "0", 10);
  // Some engines report midnight as 24 with hour12: false.
  return h === 24 ? 0 : h;
}

/** Flying day shown unless the user opens a shoulder. 21:00 is after 20:00. */
export const CORE_HOUR_MIN = 8;
export const CORE_HOUR_MAX = 20;

export type HourWindow = { min: number; max: number };

export const CORE_HOUR_WINDOW: HourWindow = { min: CORE_HOUR_MIN, max: CORE_HOUR_MAX };

/** Early opens 00:00–07:00; late opens 21:00–23:00. The two sides are independent. */
export function hourWindow(showEarly: boolean, showLate: boolean): HourWindow {
  return {
    min: showEarly ? 0 : CORE_HOUR_MIN,
    max: showLate ? 23 : CORE_HOUR_MAX,
  };
}

export function isDisplayHour(iso: string, window: HourWindow = CORE_HOUR_WINDOW): boolean {
  const h = hourOfDay(iso);
  return h >= window.min && h <= window.max;
}

function hoursIn(window: HourWindow): number[] {
  const out: number[] = [];
  for (let h = window.min; h <= window.max; h++) out.push(h);
  return out;
}

/** True when this Paris day has at least one fetched hour on that shoulder. */
export function dayHasShoulder(
  hours: readonly { time: string }[],
  day: string,
  side: "early" | "late",
): boolean {
  for (const hour of hours) {
    if (dayKey(hour.time) !== day) continue;
    const h = hourOfDay(hour.time);
    if (side === "early" && h < CORE_HOUR_MIN) return true;
    if (side === "late" && h > CORE_HOUR_MAX) return true;
  }
  return false;
}

export type HourSlot = {
  hour: number;
  label: string;
  data: Hour | null;
};

export function slotsForDay(hours: Hour[], window: HourWindow = CORE_HOUR_WINDOW): HourSlot[] {
  const byHour = new Map<number, Hour>();
  for (const item of hours) {
    if (!isDisplayHour(item.time, window)) continue;
    byHour.set(hourOfDay(item.time), item);
  }
  return hoursIn(window).map((hour) => ({
    hour,
    label: `${pad(hour)}:00`,
    data: byHour.get(hour) ?? null,
  }));
}

export function groupByDay<T extends { time: string }>(
  hours: readonly T[],
  lang: Lang = "en",
  window: HourWindow = CORE_HOUR_WINDOW,
): { key: string; label: string; hours: T[] }[] {
  const map = new Map<string, T[]>();
  for (const hour of hours) {
    if (!isDisplayHour(hour.time, window)) continue;
    const key = dayKey(hour.time);
    const list = map.get(key);
    if (list) list.push(hour);
    else map.set(key, [hour]);
  }
  return [...map.entries()]
    .map(([key, list]) => ({
      key,
      label: dayLabel(list[0]?.time ?? key, lang),
      hours: list,
    }))
    .filter((d) => d.hours.length > 0);
}

export function dayLabel(iso: string, lang: Lang = "en"): string {
  return new Date(iso).toLocaleDateString(LOCALES[lang], {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Europe/Paris",
  });
}

export function dayKey(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: "Europe/Paris" });
}

export function utcSlot(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

export function pickDefaultHour(hours: readonly { time: string }[]): number {
  if (hours.length === 0) return 0;
  const now = Date.now();
  let best = 0;
  for (let i = 0; i < hours.length; i++) {
    const hour = hours[i];
    if (!hour) continue;
    if (new Date(hour.time).getTime() <= now) best = i;
    else break;
  }
  return best;
}

export type DaySelection = { day: string | null; hourIdx: number };

/** Time (ISO) of the hour the UI currently shows for `day`+`hourIdx`:
 * the selected hour when it belongs to the active day, otherwise the active
 * day's first hour. null when there is no data or no day carries data. */
export function activeHourTime(
  data: { hours: readonly { time: string }[] } | null,
  day: string | null,
  hourIdx: number,
  lang: Lang = "en",
  window: HourWindow = CORE_HOUR_WINDOW,
): string | null {
  if (!data) return null;
  const days = groupByDay(data.hours, lang, window);
  const activeDay = day && days.some((d) => d.key === day) ? day : days[0]?.key;
  const dayHours = days.find((d) => d.key === activeDay)?.hours ?? [];
  const hour = dayHours.find((h) => h.time === data.hours[hourIdx]?.time) ?? dayHours[0];
  return hour?.time ?? null;
}

export function selectionAfterLoad(
  hours: readonly { time: string }[],
  prevDay: string | null,
  prevHourTime: string | null,
  window: HourWindow = CORE_HOUR_WINDOW,
): DaySelection {
  if (hours.length === 0) return { day: null, hourIdx: 0 };
  const kept =
    prevDay == null ? undefined : groupByDay(hours, "en", window).find((d) => d.key === prevDay);
  if (!kept) {
    const visible = hours.filter((h) => isDisplayHour(h.time, window));
    const pool = visible.length > 0 ? visible : hours;
    const chosen = pool[pickDefaultHour(pool)];
    const hourIdx = chosen ? hours.findIndex((h) => h.time === chosen.time) : 0;
    return { day: chosen ? dayKey(chosen.time) : null, hourIdx: hourIdx >= 0 ? hourIdx : 0 };
  }
  let target = kept.hours[0];
  if (prevHourTime != null) {
    const at = new Date(prevHourTime).getTime();
    for (const h of kept.hours) {
      if (new Date(h.time).getTime() <= at) target = h;
      else break;
    }
  }
  const hourIdx = target ? hours.findIndex((h) => h.time === target.time) : -1;
  return { day: kept.key, hourIdx: hourIdx >= 0 ? hourIdx : 0 };
}

/** When a shoulder closes, pull an hour that fell outside the window back in.
 * Returns null when the current hour is already inside. */
export function snapHourIdx(
  hours: readonly { time: string }[],
  hourIdx: number,
  window: HourWindow = CORE_HOUR_WINDOW,
  lang: Lang = "en",
): DaySelection | null {
  const current = hours[hourIdx];
  if (!current) return null;
  const h = hourOfDay(current.time);
  if (h >= window.min && h <= window.max) return null;
  const key = dayKey(current.time);
  const list = groupByDay(hours, lang, window).find((d) => d.key === key)?.hours;
  if (!list || list.length === 0) return null;
  const target = h < window.min ? list[0] : list[list.length - 1];
  if (!target) return null;
  const idx = hours.findIndex((item) => item.time === target.time);
  if (idx < 0) return null;
  return { day: key, hourIdx: idx };
}

export function windTone(kmh: number | null | undefined): "calm" | "ok" | "brisk" | "strong" | "hard" {
  if (kmh == null) return "calm";
  if (kmh < 15) return "ok";
  if (kmh < 30) return "brisk";
  if (kmh < 50) return "strong";
  return "hard";
}

export function capeTone(cape: number | null | undefined): "calm" | "ok" | "brisk" | "strong" {
  if (cape == null || cape < 50) return "calm";
  if (cape < 200) return "ok";
  if (cape < 500) return "brisk";
  return "strong";
}

export function srcLabel(src: string): string {
  if (src === "h2") return "2 m";
  if (src.startsWith("h")) return `${src.slice(1)} m AGL`;
  if (src.startsWith("p")) return `${src.slice(1)} hPa`;
  return src;
}
