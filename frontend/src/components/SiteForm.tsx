import { useState } from "react";
import { DEMO_POINT } from "../lib/format";
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
  placeLabel: string | null;
  loading: boolean;
  onSubmit: (lat: number, lon: number, label?: string | null) => void;
  onRefresh: () => void;
};

export function SiteForm({ lat, lon, model, placeLabel, loading, onSubmit, onRefresh }: Props) {
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
      <p className="place-chip">
        {placeLabel ? <strong>{placeLabel}</strong> : null}
        <span>
          {lat.toFixed(4)}°N {lon.toFixed(4)}°E
        </span>
      </p>
      <div className="site-form-actions">
        <FavoritesMenu lat={lat} lon={lon} label={placeLabel} onPick={pickFavorite} />
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
        <button
          type="button"
          className="btn ghost"
          disabled={loading}
          onClick={() => onSubmit(DEMO_POINT.lat, DEMO_POINT.lon, DEMO_POINT.label)}
        >
          {DEMO_POINT.label}
        </button>
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
