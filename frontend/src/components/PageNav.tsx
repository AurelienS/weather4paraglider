import { useI18n } from "../i18nContext";

/** The pages of the app. Place is the desk; the guide is the only other page. */
export type Page = "place" | "guide";

type Props = {
  page: Page;
  onNavigate: (page: Page) => void;
};

/** Top navigation: switches between the pages and marks the active one. */
export function PageNav({ page, onNavigate }: Props) {
  const { t } = useI18n();
  const tabs: { id: Page; label: string }[] = [
    { id: "place", label: t.tabPlace },
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
