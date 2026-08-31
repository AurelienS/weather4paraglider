import { useMemo } from "react";
import { dict, type Dict, type Lang } from "./lib/i18n";
import { useStore } from "./stores";

export type I18n = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: Dict;
};

/** Thin view over the prefs store, kept for the existing call sites. */
export function useI18n(): I18n {
  const lang = useStore((s) => s.lang);
  const setLang = useStore((s) => s.setLang);
  const t = useMemo(() => dict(lang), [lang]);
  return { lang, setLang, t };
}
