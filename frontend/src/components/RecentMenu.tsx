import { useEffect, useRef, useState } from "react";
import { useI18n } from "../i18nContext";
import { useStore } from "../stores";

/** Recently visited places, shown on the main page only. Picking one loads
 * it again. Hidden while there is nothing to show. */
export function RecentMenu() {
  const { t } = useI18n();
  const recentPlaces = useStore((s) => s.recentPlaces);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  if (recentPlaces.length === 0) return null;

  return (
    <div className="fav-menu recent-menu" ref={boxRef}>
      <button
        type="button"
        className="btn"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((o) => !o)}
      >
        {t.recentPlaces}
      </button>
      {open ? (
        <ul className="fav-list" role="menu">
          {recentPlaces.map((pin) => (
            <li key={`${pin.lat.toFixed(4)},${pin.lon.toFixed(4)}`} role="none">
              <button
                type="button"
                role="menuitem"
                className="fav-item"
                onClick={() => {
                  setOpen(false);
                  useStore.getState().submitPlace(pin.lat, pin.lon, pin.label);
                }}
              >
                <span className="fav-label">{pin.label}</span>
                <span className="fav-coords">
                  {pin.lat.toFixed(4)}, {pin.lon.toFixed(4)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
