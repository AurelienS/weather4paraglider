import { useState } from "react";
import { DEMO_POINT } from "../lib/format";
import type { Favorite } from "../lib/favorites";
import type { Place } from "../lib/geocode";
import { FavoritesMenu } from "./FavoritesMenu";
import { MapPicker } from "./MapPicker";
import { PlaceSearch } from "./PlaceSearch";

type Props = {
  lat: number;
  lon: number;
  placeLabel: string | null;
  loading: boolean;
  onSubmit: (lat: number, lon: number, label?: string | null) => void;
  onRefresh: () => void;
};

export function SiteForm({ lat, lon, placeLabel, loading, onSubmit, onRefresh }: Props) {
  const [mapOpen, setMapOpen] = useState(false);

  function pickPlace(place: Place) {
    onSubmit(place.lat, place.lon, `${place.label}, ${place.detail}`);
  }

  function pickFavorite(fav: Favorite) {
    onSubmit(fav.lat, fav.lon, fav.label);
  }

  return (
    <div className="site-form">
      <PlaceSearch disabled={loading} onPick={pickPlace} />
      <div className="site-form-actions">
        <FavoritesMenu lat={lat} lon={lon} label={placeLabel} onPick={pickFavorite} />
        <button
          type="button"
          className="btn"
          disabled={loading}
          onClick={() => setMapOpen(true)}
        >
          Carte…
        </button>
        <button type="button" className="btn" disabled={loading} onClick={onRefresh}>
          Actualiser
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
      <p className="place-chip">
        {placeLabel ? <strong>{placeLabel}</strong> : null}
        <span>
          {lat.toFixed(4)}°N {lon.toFixed(4)}°E
        </span>
      </p>
      {mapOpen ? (
        <MapPicker
          lat={lat}
          lon={lon}
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
