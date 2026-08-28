import { useEffect, useRef, useState } from "react";
import type { Favorite } from "../lib/favorites";

type Props = {
  list: Favorite[];
  currentKey: string;
  disabledKeys?: string[];
  onPick: (fav: Favorite) => void;
  onRemove?: (fav: Favorite) => void;
};

function pointKey(lat: number, lon: number): string {
  return `${lat.toFixed(4)},${lon.toFixed(4)}`;
}

export function FavoritesMenu({
  list,
  currentKey,
  disabledKeys,
  onPick,
  onRemove,
}: Props) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  function pick(fav: Favorite) {
    setOpen(false);
    onPick(fav);
  }

  return (
    <div className="fav-menu" ref={boxRef}>
      <button
        type="button"
        className="btn"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((o) => !o)}
      >
        Favorites ({list.length})
      </button>
      {open ? (
        <ul className="fav-list" role="menu">
          {list.map((fav) => {
            const key = pointKey(fav.lat, fav.lon);
            const disabled = disabledKeys?.includes(key) ?? false;
            return (
              <li
                key={key}
                role="none"
                className={
                  key === currentKey ? "is-current" : undefined
                }
              >
                <button
                  type="button"
                  role="menuitem"
                  className="fav-item"
                  disabled={disabled}
                  title={disabled ? "Already in the comparison" : undefined}
                  onClick={() => pick(fav)}
                >
                  <span className="fav-label">{fav.label}</span>
                  <span className="fav-coords">
                    {fav.lat.toFixed(4)}, {fav.lon.toFixed(4)}
                  </span>
                </button>
                {onRemove ? (
                  <button
                    type="button"
                    className="fav-remove"
                    aria-label={`Remove ${fav.label} from favorites`}
                    onClick={() => onRemove(fav)}
                  >
                    ×
                  </button>
                ) : null}
              </li>
            );
          })}
          {list.length === 0 ? (
            <li className="fav-empty">No favorites saved.</li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
