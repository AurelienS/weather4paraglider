import { useI18n } from "../i18nContext";

/** The pages of the app; the compare board has two exclusive flavors. */
export type Page = "place" | "compare-places" | "compare-models" | "guide";

type Props = {
  page: Page;
  onNavigate: (page: Page) => void;
};

/** Top navigation: switches between the pages and marks the active one. */
export function PageNav({ page, onNavigate }: Props) {
  const { t } = useI18n();
  const tabs: { id: Page; label: string }[] = [
    { id: "place", label: t.tabPlace },
    { id: "compare-places", label: t.compareCheck },
    { id: "compare-models", label: t.compareModels },
    { id: "guide", label: t.tabGuide },
  ];
  return (
    <nav className="page-nav" aria-label={t.navAria}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          aria-current={page === tab.id ? "page" : undefined}
          onClick={() => onNavigate(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
