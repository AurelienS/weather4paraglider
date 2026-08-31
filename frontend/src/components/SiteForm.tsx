import type { Favorite } from "../lib/favorites";
import { findPlaceEntry } from "../lib/compare";
import { placeText, type Place } from "../lib/geocode";
import { interpolate } from "../lib/i18n";
import { pinKey } from "../lib/pins";
import { modelById } from "../api/models";
import { useI18n } from "../i18nContext";
import { useStore } from "../stores";
import { FavoritesMenu } from "./FavoritesMenu";
import { PageHeader } from "./PageHeader";
import { PlaceSearch } from "./PlaceSearch";
import { RecentMenu } from "./RecentMenu";

/** The header of the place page, wired directly to the store: the place
 * name (same title slot as the compare boards), place search with map
 * picking, favorites and refresh. The compare pages live behind the nav. */
export function SiteForm() {
  const { t } = useI18n();
  const lat = useStore((s) => s.point.lat);
  const lon = useStore((s) => s.point.lon);
  const modelId = useStore((s) => s.modelId);
  const loading = useStore((s) => s.loading);
  const place = useStore((s) => s.place);
  const entries = useStore((s) => s.entries);
  const favs = useStore((s) => s.favs);
  const submitPlace = useStore((s) => s.submitPlace);
  const addPlaceToBoard = useStore((s) => s.addPlaceToBoard);
  const addFavorite = useStore((s) => s.addFavorite);
  const removeFavorite = useStore((s) => s.removeFavorite);
  const refresh = useStore((s) => s.refresh);

  const placeSaved = favs.some(
    (f) => f.lat.toFixed(4) === lat.toFixed(4) && f.lon.toFixed(4) === lon.toFixed(4),
  );
  const savedFav = favs.find(
    (f) => f.lat.toFixed(4) === lat.toFixed(4) && f.lon.toFixed(4) === lon.toFixed(4),
  );
  // a pinned name survives reloads without a geocoder call
  const pinnedName = findPlaceEntry(entries, pinKey({ lat, lon }))?.name;
  const shownPlace =
    place ?? pinnedName ?? `${lat.toFixed(4)}°N ${lon.toFixed(4)}°E`;

  function pickPlace(p: Place) {
    submitPlace(p.lat, p.lon, placeText(p));
  }

  function pickFavorite(fav: Favorite) {
    submitPlace(fav.lat, fav.lon, fav.label);
  }

  return (
    <div className="site-form">
      <PageHeader
        title={
          <span className="board-title place-line">
            <strong>{shownPlace}</strong>
            {/* classic star toggle: outline when not saved, filled when it is */}
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
                placeSaved && savedFav
                  ? removeFavorite(savedFav)
                  : addFavorite()
              }
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 2.6l2.94 5.96 6.58.96-4.76 4.64 1.12 6.56L12 17.67l-5.88 3.05 1.12-6.56-4.76-4.64 6.58-.96L12 2.6z" />
              </svg>
            </button>
          </span>
        }
        select={
          <PlaceSearch
            disabled={loading}
            model={modelById(modelId)}
            onPick={pickPlace}
            onCompare={addPlaceToBoard}
            center={{ lat, lon }}
            ariaLabel={t.placeLabel}
          />
        }
        menus={
          <>
            <FavoritesMenu
              list={favs}
              currentKey={`${lat.toFixed(4)},${lon.toFixed(4)}`}
              onPick={pickFavorite}
              onRemove={removeFavorite}
            />
            {/* the main page recents are places, not comparisons */}
            <RecentMenu />
          </>
        }
        onRefresh={refresh}
        refreshDisabled={loading}
      />
    </div>
  );
}
