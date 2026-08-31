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
  return Number.parseInt(part?.value ?? "0", 10);
}

export const DISPLAY_HOURS = [
  7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22,
] as const;

export function isDisplayHour(iso: string): boolean {
  const h = hourOfDay(iso);
  return h >= 7 && h <= 22;
}

export type HourSlot = {
  hour: number;
  label: string;
  data: Hour | null;
};

export function slotsForDay(hours: Hour[]): HourSlot[] {
  const byHour = new Map<number, Hour>();
  for (const item of hours) {
    if (!isDisplayHour(item.time)) continue;
    byHour.set(hourOfDay(item.time), item);
  }
  return DISPLAY_HOURS.map((hour) => ({
    hour,
    label: `${pad(hour)}:00`,
    data: byHour.get(hour) ?? null,
  }));
}

export function groupByDay<T extends { time: string }>(
  hours: readonly T[],
  lang: Lang = "en",
): { key: string; label: string; hours: T[] }[] {
  const map = new Map<string, T[]>();
  for (const hour of hours) {
    if (!isDisplayHour(hour.time)) continue;
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

export function selectionAfterLoad(
  hours: readonly { time: string }[],
  prevDay: string | null,
  prevHourTime: string | null,
): DaySelection {
  if (hours.length === 0) return { day: null, hourIdx: 0 };
  const kept =
    prevDay == null ? undefined : groupByDay(hours).find((d) => d.key === prevDay);
  if (!kept) {
    const idx = pickDefaultHour(hours);
    const chosen = hours[idx];
    return { day: chosen ? dayKey(chosen.time) : null, hourIdx: idx };
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
