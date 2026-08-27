import { useState, type FormEvent } from "react";
import { DEMO_POINT, parseCoord } from "../lib/format";

type Props = {
  lat: number;
  lon: number;
  loading: boolean;
  onSubmit: (lat: number, lon: number) => void;
  onRefresh: () => void;
};

export function SiteForm({ lat, lon, loading, onSubmit, onRefresh }: Props) {
  const [latText, setLatText] = useState(String(lat));
  const [lonText, setLonText] = useState(String(lon));
  const [hint, setHint] = useState<string | null>(null);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const nextLat = parseCoord(latText);
    const nextLon = parseCoord(lonText);
    if (nextLat == null || nextLon == null) {
      setHint("Latitude / longitude numériques (virgule acceptée).");
      return;
    }
    if (nextLat < 37.5 || nextLat > 55.4 || nextLon < -12 || nextLon > 16) {
      setHint("Hors domaine AROME (37,5–55,4 N, 12 W–16 E).");
      return;
    }
    setHint(null);
    onSubmit(nextLat, nextLon);
  }

  function useDemo() {
    setHint(null);
    onSubmit(DEMO_POINT.lat, DEMO_POINT.lon);
  }

  return (
    <form className="site-form" onSubmit={handleSubmit}>
      <label>
        Latitude
        <input
          id="lat"
          name="lat"
          inputMode="decimal"
          autoComplete="off"
          spellCheck={false}
          value={latText}
          disabled={loading}
          onChange={(e) => setLatText(e.target.value)}
        />
      </label>
      <label>
        Longitude
        <input
          id="lon"
          name="lon"
          inputMode="decimal"
          autoComplete="off"
          spellCheck={false}
          value={lonText}
          disabled={loading}
          onChange={(e) => setLonText(e.target.value)}
        />
      </label>
      <div className="site-form-actions">
        <button type="submit" className="btn primary" disabled={loading}>
          {loading ? "Chargement…" : "Charger"}
        </button>
        <button type="button" className="btn" disabled={loading} onClick={onRefresh}>
          Actualiser
        </button>
        <button type="button" className="btn ghost" disabled={loading} onClick={useDemo}>
          {DEMO_POINT.label}
        </button>
      </div>
      {hint ? <p className="form-hint">{hint}</p> : null}
    </form>
  );
}
