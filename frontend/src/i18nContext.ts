import { createContext, useContext } from "react";
import type { Dict, Lang } from "./lib/i18n";

export type I18n = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: Dict;
};

export const I18nContext = createContext<I18n | null>(null);

export function useI18n(): I18n {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}
