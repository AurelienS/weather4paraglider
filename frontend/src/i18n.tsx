import { useMemo, useState, type ReactNode } from "react";
import { dict, loadLang, storeLang, type Lang } from "./lib/i18n";
import { I18nContext } from "./i18nContext";

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(loadLang);
  const value = useMemo(
    () => ({
      lang,
      setLang: (next: Lang) => {
        storeLang(next);
        setLangState(next);
      },
      t: dict(lang),
    }),
    [lang],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
