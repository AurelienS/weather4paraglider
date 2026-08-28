import { useState } from "react";
import type { Favorite } from "../lib/favorites";
import type { Place } from "../lib/geocode";
import { type ModelDef } from "../api/models";
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
  const [mapOpen, setMapOpen] = useState(false);

  function pickPlace(place: Place) {
    onSubmit(place.lat, place.lon, `${place.label}, ${place.detail}`);
  }

  function pickFavorite(fav: Favorite) {
    onSubmit(fav.lat, fav.lon, fav.label);
  }

  return (
    <div className="site-form">
      <PlaceSearch disabled={loading} model={model} onPick={pickPlace} />
      <div className="site-form-actions">
        <FavoritesMenu
          list={favs}
          currentKey={`${lat.toFixed(4)},${lon.toFixed(4)}`}
          onPick={pickFavorite}
          onRemove={onFavoriteRemove}
        />
        <button
          type="button"
          className="btn"
          disabled={loading}
          onClick={() => setMapOpen(true)}
        >
          Map…
        </button>
        <button type="button" className="btn" disabled={loading} onClick={onRefresh}>
          Refresh
        </button>
      </div>
      <div className="site-form-secondary">
        <label className="pick pick-check" title="Stack several places on one page">
          <input
            type="checkbox"
            checked={compare}
            onChange={(e) => onCompareChange(e.target.checked)}
          />
          Compare places
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
