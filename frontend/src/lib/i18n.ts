import { de } from "./strings/de";
import { en, type Dict } from "./strings/en";
import { es } from "./strings/es";
import { fr } from "./strings/fr";

export const LANGS = ["en", "fr", "de", "es"] as const;
export type Lang = (typeof LANGS)[number];

export const LANG_KEY = "w4p.lang.v1";

type StorageLike = Pick<Storage, "getItem" | "setItem">;

function storage(): StorageLike | undefined {
  return typeof window === "undefined" ? undefined : window.localStorage;
}

export function isLang(value: string | null | undefined): value is Lang {
  return value != null && (LANGS as readonly string[]).includes(value);
}

/** Pick the first supported language from browser accept-language tags. */
export function detectLang(accept: readonly string[]): Lang {
  for (const tag of accept) {
    const base = tag.split(";")[0]?.trim().toLowerCase() ?? "";
    const short = base.split("-")[0] ?? "";
    if (isLang(short)) return short;
  }
  return "en";
}

export function loadLang(
  store: StorageLike | undefined = storage(),
  accept: readonly string[] =
    typeof navigator === "undefined" ? [] : [...navigator.languages, navigator.language],
): Lang {
  try {
    const raw = store?.getItem(LANG_KEY);
    if (isLang(raw)) return raw;
  } catch {
    // storage unavailable: fall through to browser detection
  }
  return detectLang(accept);
}

export function storeLang(lang: Lang, store: StorageLike | undefined = storage()): void {
  try {
    store?.setItem(LANG_KEY, lang);
  } catch {
    // storage unavailable (private mode): the language stays per-session
  }
}

/** Replace {placeholders} in a template string. */
export function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match,
  );
}

export type { Dict };

const DICTS: Record<Lang, Dict> = { en, fr, de, es };

export function dict(lang: Lang): Dict {
  return DICTS[lang];
}
