import { useState } from "react";
import type { Favorite } from "../lib/favorites";
import type { Place } from "../lib/geocode";
import { modelById } from "../api/models";
import { useI18n } from "../i18nContext";
import { useStore } from "../stores";
import { FavoritesMenu } from "./FavoritesMenu";
import { HistoryMenu } from "./HistoryMenu";
import { MapPicker } from "./MapPicker";
import { PlaceSearch } from "./PlaceSearch";

/** The header form, wired directly to the store: place search, map picking,
 * favorites, refresh and the entry to the compare page. */
export function SiteForm() {
  const { t } = useI18n();
  const lat = useStore((s) => s.point.lat);
  const lon = useStore((s) => s.point.lon);
  const modelId = useStore((s) => s.modelId);
  const loading = useStore((s) => s.loading);
  const favs = useStore((s) => s.favs);
  const submitPlace = useStore((s) => s.submitPlace);
  const toggleCompare = useStore((s) => s.toggleCompare);
  const addPlaceToBoard = useStore((s) => s.addPlaceToBoard);
  const removeFavorite = useStore((s) => s.removeFavorite);
  const refresh = useStore((s) => s.refresh);
  const [mapOpen, setMapOpen] = useState(false);

  function pickPlace(place: Place) {
    submitPlace(place.lat, place.lon, `${place.label}, ${place.detail}`);
  }

  function pickFavorite(fav: Favorite) {
    submitPlace(fav.lat, fav.lon, fav.label);
  }

  return (
    <div className="site-form">
      <div className="site-form-place-row">
        <PlaceSearch
          disabled={loading}
          model={modelById(modelId)}
          onPick={pickPlace}
          onCompare={addPlaceToBoard}
        />
        <button
          type="button"
          className="btn"
          disabled={loading}
          onClick={() => setMapOpen(true)}
        >
          {t.mapOpen}
        </button>
      </div>
      <div className="site-form-actions">
        <FavoritesMenu
          list={favs}
          currentKey={`${lat.toFixed(4)},${lon.toFixed(4)}`}
          onPick={pickFavorite}
          onRemove={removeFavorite}
        />
        {/* restoring a comparison from the home page opens the compare page */}
        <HistoryMenu />
        <button
          type="button"
          className="btn"
          disabled={loading}
          onClick={refresh}
        >
          {t.refresh}
        </button>
        <button
          type="button"
          className="btn"
          title={t.compareHint}
          onClick={() => toggleCompare(true)}
        >
          {t.compareCheck}
        </button>
      </div>
      {mapOpen ? (
        <MapPicker
          lat={lat}
          lon={lon}
          model={modelById(modelId)}
          onCancel={() => setMapOpen(false)}
          onPick={(nextLat, nextLon, label) => {
            setMapOpen(false);
            submitPlace(nextLat, nextLon, label);
          }}
        />
      ) : null}
    </div>
  );
}
