import type { ReactNode } from "react";
import { useI18n } from "../i18nContext";

/** The right-hand header zone shared by ALL pages — place, compare-places
 * and compare-models — one skeleton, different options:
 *
 * - row 1 (context): the optional board caption followed by the selection
 *   controls (big search on the place page, compact picker or model menu
 *   on the boards), right-aligned on a fixed-height box;
 * - row 2 (actions): the menus (favorites, recents, history) then the
 *   shared Refresh button and the optional "clear all".
 *
 * The shared skeleton is what keeps the pages aligned: same row boxes,
 * same baselines, and content changes reflow text inside a row, never
 * the layout. */
export function PageHeader({ className, title, select, menus, onRefresh, refreshDisabled, onClear }: {
  /** Extra hook class on the root (e.g. `board-head` for board styles). */
  className?: string;
  /** Caption over the tools (compare boards only). */
  title?: ReactNode;
  /** Selection controls: search, map, picker, model menu. */
  select: ReactNode;
  /** Selection shortcuts: favorites, recents, history. */
  menus: ReactNode;
  onRefresh: () => void;
  refreshDisabled?: boolean;
  /** "Clear all": only rendered when the board has something to clear. */
  onClear?: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className={className ? `page-header ${className}` : "page-header"}>
      <div className="page-header-context">
        {title}
        {select}
      </div>
      <div className="page-header-actions">
        {menus}
        <button type="button" className="btn" disabled={refreshDisabled} onClick={onRefresh}>
          {t.refresh}
        </button>
        {onClear ? (
          <button type="button" className="btn ghost" onClick={onClear}>
            {t.boardClear}
          </button>
        ) : null}
      </div>
    </div>
  );
}
