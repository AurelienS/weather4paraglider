import { describe, expect, it } from "vitest";
import { THEME_KEY, loadTheme, otherTheme, storeTheme } from "./theme";

function fakeStorage(initial: Record<string, string> = {}): Pick<Storage, "getItem" | "setItem"> {
  const data = { ...initial };
  return {
    getItem: (k: string) => (k in data ? (data[k] ?? null) : null),
    setItem: (k: string, v: string) => {
      data[k] = v;
    },
  };
}

describe("loadTheme", () => {
  it("defaults to light without stored value", () => {
    expect(loadTheme(fakeStorage())).toBe("light");
    expect(loadTheme(undefined)).toBe("light");
  });

  it("reads a stored dark theme", () => {
    const store = fakeStorage({ [THEME_KEY]: "dark" });
    expect(loadTheme(store)).toBe("dark");
    storeTheme("dark", store);
    expect(store.getItem(THEME_KEY)).toBe("dark");
  });

  it("falls back to light on unknown values", () => {
    expect(loadTheme(fakeStorage({ [THEME_KEY]: "solarized" }))).toBe("light");
  });
});

describe("storeTheme", () => {
  it("persists the theme under the versioned key", () => {
    const store = fakeStorage({ [THEME_KEY]: "dark" });
    storeTheme("light", store);
    expect(store.getItem(THEME_KEY)).toBe("light");
  });

  it("swallows storage failures", () => {
    expect(() =>
      storeTheme("light", {
        getItem: () => null,
        setItem: () => {
          throw new Error("quota");
        },
      }),
    ).not.toThrow();
  });
});

describe("otherTheme", () => {
  it("flips between dark and light", () => {
    expect(otherTheme("dark")).toBe("light");
    expect(otherTheme("light")).toBe("dark");
  });
});
