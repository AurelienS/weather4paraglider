export type Theme = "dark" | "light";

export const THEME_KEY = "w4p.theme.v1";

type StorageLike = Pick<Storage, "getItem" | "setItem">;

function storage(): StorageLike | undefined {
  return typeof window === "undefined" ? undefined : window.localStorage;
}

export function loadTheme(store: StorageLike | undefined = storage()): Theme {
  try {
    return store?.getItem(THEME_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function storeTheme(theme: Theme, store: StorageLike | undefined = storage()): void {
  try {
    store?.setItem(THEME_KEY, theme);
  } catch {
    // storage unavailable (private mode): the theme stays per-session
  }
}

export function applyTheme(theme: Theme, doc: Document = window.document): void {
  doc.documentElement.dataset.theme = theme;
}

export function otherTheme(theme: Theme): Theme {
  return theme === "dark" ? "light" : "dark";
}
