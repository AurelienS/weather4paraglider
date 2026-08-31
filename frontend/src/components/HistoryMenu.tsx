import { useEffect, useRef, useState } from "react";
import { dayLabel, hourShort } from "../lib/format";
import { useI18n } from "../i18nContext";
import { useStore } from "../stores";

/** List of recently closed comparisons; restoring replaces the board.
 * Hidden while there is nothing to restore. */
export function HistoryMenu() {
  const { t, lang } = useI18n();
  const history = useStore((s) => s.history);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  if (history.length === 0) return null;

  function restore(id: string) {
    setOpen(false);
    useStore.getState().restoreFromHistory(id);
  }

  return (
    <div className="fav-menu hist-menu" ref={boxRef}>
      <button
        type="button"
        className="btn"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((o) => !o)}
      >
        {t.historyLabel}
      </button>
      {open ? (
        <ul className="fav-list" role="menu">
          {history.map((saved) => (
            <li key={saved.id} role="none">
              <button
                type="button"
                role="menuitem"
                className="fav-item"
                onClick={() => restore(saved.id)}
              >
                <span className="fav-label">{saved.label}</span>
                <span className="fav-coords">
                  {dayLabel(new Date(saved.at).toISOString(), lang)}{" "}
                  {hourShort(new Date(saved.at).toISOString())}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
