import { useEffect, useRef, useState } from "react";
import { loadFavorites, storeFavorites, type Favorite } from "../lib/favorites";

type Props = {
  lat: number;
  lon: number;
  label: string | null;
  onPick: (fav: Favorite) => void;
};

function pointKey(lat: number, lon: number): string {
  return `${lat.toFixed(4)},${lon.toFixed(4)}`;
}

export function FavoritesMenu({ lat, lon, label, onPick }: Props) {
  const [list, setList] = useState<Favorite[]>(loadFavorites);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  const currentKey = pointKey(lat, lon);
  const alreadySaved = list.some((f) => pointKey(f.lat, f.lon) === currentKey);

  function addCurrent() {
    if (alreadySaved) return;
    const fav: Favorite = {
      lat,
      lon,
      label: label ?? `${lat.toFixed(4)}, ${lon.toFixed(4)}`,
    };
    const next = [fav, ...list];
    setList(next);
    storeFavorites(next);
  }

  function remove(fav: Favorite) {
    const next = list.filter((f) => f !== fav);
    setList(next);
    storeFavorites(next);
  }

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
          <li role="none">
            <button
              type="button"
              role="menuitem"
              className="fav-add"
              disabled={alreadySaved}
              onClick={addCurrent}
            >
              {alreadySaved ? "Current place already saved" : "Add current place"}
            </button>
          </li>
          {list.map((fav) => (
            <li
              key={pointKey(fav.lat, fav.lon)}
              role="none"
              className={pointKey(fav.lat, fav.lon) === currentKey ? "is-current" : undefined}
            >
              <button
                type="button"
                role="menuitem"
                className="fav-item"
                onClick={() => pick(fav)}
              >
                <span className="fav-label">{fav.label}</span>
                <span className="fav-coords">
                  {fav.lat.toFixed(4)}, {fav.lon.toFixed(4)}
                </span>
              </button>
              <button
                type="button"
                className="fav-remove"
                aria-label={`Remove ${fav.label} from favorites`}
                onClick={() => remove(fav)}
              >
                ×
              </button>
            </li>
          ))}
          {list.length === 0 ? (
            <li className="fav-empty">No favorites saved.</li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
