import { useState } from "react";
import type { Favorite } from "../lib/favorites";
import type { Place } from "../lib/geocode";
import { type ModelDef } from "../api/models";
import { useI18n } from "../i18nContext";
import { FavoritesMenu } from "./FavoritesMenu";
import { MapPicker } from "./MapPicker";
import { PlaceSearch } from "./PlaceSearch";

type Props = {
  lat: number;
  lon: number;
  model: ModelDef;
  loading: boolean;
  compare: boolean;
  favs: Favorite[];
  onFavoriteRemove: (fav: Favorite) => void;
  onCompareChange: (next: boolean) => void;
  onSubmit: (lat: number, lon: number, label?: string | null) => void;
  onRefresh: () => void;
};

export function SiteForm({
  lat,
  lon,
  model,
  loading,
  compare,
  favs,
  onFavoriteRemove,
  onCompareChange,
  onSubmit,
  onRefresh,
}: Props) {
  const { t } = useI18n();
  const [mapOpen, setMapOpen] = useState(false);

  function pickPlace(place: Place) {
    onSubmit(place.lat, place.lon, `${place.label}, ${place.detail}`);
  }

  function pickFavorite(fav: Favorite) {
    onSubmit(fav.lat, fav.lon, fav.label);
  }

  return (
    <div className="site-form">
      <div className="site-form-place-row">
        <PlaceSearch disabled={loading} model={model} onPick={pickPlace} />
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
          onRemove={onFavoriteRemove}
        />
        <button type="button" className="btn" disabled={loading} onClick={onRefresh}>
          {t.refresh}
        </button>
        <label className="pick pick-check" title={t.compareHint}>
          <input
            type="checkbox"
            checked={compare}
            onChange={(e) => onCompareChange(e.target.checked)}
          />
          {t.compareCheck}
        </label>
      </div>
      {mapOpen ? (
        <MapPicker
          lat={lat}
          lon={lon}
          model={model}
          onCancel={() => setMapOpen(false)}
          onPick={(nextLat, nextLon, label) => {
            setMapOpen(false);
            onSubmit(nextLat, nextLon, label);
          }}
        />
      ) : null}
    </div>
  );
}
