import { findPlaceEntry } from "../lib/compare";
import { interpolate } from "../lib/i18n";
import { pinKey } from "../lib/pins";
import { useI18n } from "../i18nContext";
import { useStore } from "../stores";

/** Place name, favorite star and refresh. Search, models and saved places
 * live in the side column. */
export function SiteForm() {
  const { t } = useI18n();
  const lat = useStore((s) => s.point.lat);
  const lon = useStore((s) => s.point.lon);
  const loading = useStore((s) => s.loading);
  const place = useStore((s) => s.place);
  const entries = useStore((s) => s.entries);
  const favs = useStore((s) => s.favs);
  const addFavorite = useStore((s) => s.addFavorite);
  const removeFavorite = useStore((s) => s.removeFavorite);
  const refresh = useStore((s) => s.refresh);

  const placeSaved = favs.some(
    (f) => f.lat.toFixed(4) === lat.toFixed(4) && f.lon.toFixed(4) === lon.toFixed(4),
  );
  const savedFav = favs.find(
    (f) => f.lat.toFixed(4) === lat.toFixed(4) && f.lon.toFixed(4) === lon.toFixed(4),
  );
  const pinnedName = findPlaceEntry(entries, pinKey({ lat, lon }))?.name;
  const shownPlace =
    place ?? pinnedName ?? `${lat.toFixed(4)}°N ${lon.toFixed(4)}°E`;

  return (
    <div className="site-form stage-head">
      <div className="place-line">
        <strong key={shownPlace} className="place-name">
          {shownPlace}
        </strong>
        <button
          type="button"
          className={placeSaved ? "fav-add is-on" : "fav-add"}
          aria-pressed={placeSaved}
          aria-label={
            placeSaved
              ? interpolate(t.removeFavoriteAria, { label: shownPlace })
              : t.addFavoriteAria
          }
          onClick={() =>
            placeSaved && savedFav ? removeFavorite(savedFav) : addFavorite()
          }
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 2.6l2.94 5.96 6.58.96-4.76 4.64 1.12 6.56L12 17.67l-5.88 3.05 1.12-6.56-4.76-4.64 6.58-.96L12 2.6z" />
          </svg>
        </button>
        <button
          type="button"
          className="btn refresh-btn"
          disabled={loading}
          onClick={refresh}
        >
          {t.refresh}
        </button>
      </div>
    </div>
  );
}
