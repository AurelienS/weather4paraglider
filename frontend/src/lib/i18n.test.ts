import { describe, expect, it } from "vitest";
import {
  LANG_KEY,
  detectLang,
  dict,
  interpolate,
  isLang,
  loadLang,
  storeLang,
  type Lang,
} from "./i18n";
import { en } from "./strings/en";
import { fr } from "./strings/fr";
import { de } from "./strings/de";
import { es } from "./strings/es";

function fakeStorage(initial: Record<string, string> = {}) {
  const data = { ...initial };
  return {
    getItem: (k: string) => (k in data ? (data[k] ?? null) : null),
    setItem: (k: string, v: string) => {
      data[k] = v;
    },
  };
}

describe("detectLang", () => {
  it("picks the first supported browser language", () => {
    expect(detectLang(["fr-CA", "fr", "en-US"])).toBe("fr");
    expect(detectLang(["de-DE", "en"])).toBe("de");
    expect(detectLang(["es-419", "es-ES"])).toBe("es");
    expect(detectLang(["en-GB", "en"])).toBe("en");
  });

  it("ignores quality weights and case", () => {
    expect(detectLang(["FR;q=0.9", "en;q=0.8"])).toBe("fr");
  });

  it("falls back to English for unsupported languages", () => {
    expect(detectLang(["ja-JP", "zh-CN"])).toBe("en");
    expect(detectLang([])).toBe("en");
  });
});

describe("loadLang", () => {
  it("prefers the stored language over the browser", () => {
    const store = fakeStorage({ [LANG_KEY]: "de" });
    expect(loadLang(store, ["fr-FR"])).toBe("de");
  });

  it("detects from the browser when nothing is stored", () => {
    expect(loadLang(fakeStorage(), ["fr-FR", "fr"])).toBe("fr");
  });

  it("falls back to English on unknown stored values", () => {
    expect(loadLang(fakeStorage({ [LANG_KEY]: "klingon" }), ["en-GB"])).toBe("en");
  });
});

describe("storeLang", () => {
  it("persists the language under the versioned key", () => {
    const store = fakeStorage();
    storeLang("es", store);
    expect(store.getItem(LANG_KEY)).toBe("es");
  });

  it("swallows storage failures", () => {
    expect(() =>
      storeLang("fr", {
        getItem: () => null,
        setItem: () => {
          throw new Error("quota");
        },
      }),
    ).not.toThrow();
  });
});

describe("dictionaries", () => {
  it("exposes the same keys for every language", () => {
    const keys = Object.keys(en).sort();
    for (const lang of ["fr", "de", "es"] as Lang[]) {
      expect(Object.keys(dict(lang)).sort()).toEqual(keys);
    }
  });

  it("keeps every value non-empty", () => {
    for (const lang of ["en", "fr", "de", "es"] as Lang[]) {
      for (const [key, value] of Object.entries(dict(lang))) {
        expect(value.trim().length, `${lang}.${key}`).toBeGreaterThan(0);
      }
    }
  });

  it("does not leak English into other languages", () => {
    expect(fr.retry).not.toBe(en.retry);
    expect(de.retry).not.toBe(en.retry);
    expect(es.retry).not.toBe(en.retry);
  });

  it("keeps the interpolation placeholders in every language", () => {
    const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      const ref = placeholders(en[key]);
      for (const lang of ["fr", "de", "es"] as Lang[]) {
        expect(placeholders(dict(lang)[key]), `${lang}.${key}`).toEqual(ref);
      }
    }
  });
});

describe("interpolate", () => {
  it("replaces named placeholders", () => {
    expect(interpolate("cell {lat}, {lon}", { lat: "45.1", lon: "6.2" })).toBe(
      "cell 45.1, 6.2",
    );
    expect(interpolate("{n} places", { n: 3 })).toBe("3 places");
  });

  it("leaves unknown placeholders untouched", () => {
    expect(interpolate("hi {n} {other}", { n: 1 })).toBe("hi 1 {other}");
  });
});

describe("isLang", () => {
  it("accepts only supported languages", () => {
    expect(isLang("fr")).toBe(true);
    expect(isLang("it")).toBe(false);
    expect(isLang(null)).toBe(false);
    expect(isLang(undefined)).toBe(false);
  });
});
