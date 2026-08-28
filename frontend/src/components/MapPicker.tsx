import { useEffect, useRef, useState, type FormEvent } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { placeText, reverseGeocode } from "../lib/geocode";
import { isGlobalDomain, type ModelDef } from "../api/models";

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

type Props = {
  lat: number;
  lon: number;
  model: ModelDef;
  onCancel: () => void;
  onPick: (lat: number, lon: number, label: string | null) => void;
};

export function MapPicker({ lat, lon, model, onCancel, onPick }: Props) {
  const domain = model.domain;
  const inDomain = (la: number, lo: number) =>
    la >= domain.latMin && la <= domain.latMax && lo >= domain.lonMin && lo <= domain.lonMax;
  const holderRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const startPos = useRef({ lat, lon });
  const startDomain = useRef(model.domain);
  const [pos, setPos] = useState({ lat, lon });
  const [near, setNear] = useState<string | null>(null);
  const [latDraft, setLatDraft] = useState<string | null>(null);
  const [lonDraft, setLonDraft] = useState<string | null>(null);
  const latShown = latDraft ?? pos.lat.toFixed(5);
  const lonShown = lonDraft ?? pos.lon.toFixed(5);
  const valid = inDomain(pos.lat, pos.lon);

  useEffect(() => {
    const el = holderRef.current;
    if (!el) return;
    const d = startDomain.current;
    const global = isGlobalDomain(d);
    const bounds = L.latLngBounds(
      [d.latMin - 2, d.lonMin - 2],
      [d.latMax + 2, d.lonMax + 2],
    );
    const map = L.map(el, {
      center: [startPos.current.lat, startPos.current.lon],
      zoom: 11,
      minZoom: 5,
      maxBounds: global ? undefined : bounds,
      maxBoundsViscosity: 0.8,
    });
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: "&copy; OpenStreetMap",
    }).addTo(map);
    if (!global) {
      L.rectangle(
        [
          [d.latMin, d.lonMin],
          [d.latMax, d.lonMax],
        ],
        { color: "#c4a35a", weight: 1.5, dashArray: "6 6", fill: false },
      ).addTo(map);
    }
    const marker = L.marker(
      [startPos.current.lat, startPos.current.lon],
      { draggable: true },
    ).addTo(map);
    marker.on("dragend", () => {
      const p = marker.getLatLng();
      setPos({ lat: p.lat, lon: p.lng });
    });
    map.on("click", (e: L.LeafletMouseEvent) => {
      marker.setLatLng(e.latlng);
      setPos({ lat: e.latlng.lat, lon: e.latlng.lng });
    });
    mapRef.current = map;
    markerRef.current = marker;
    window.setTimeout(() => map.invalidateSize(), 0);
    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    const timer = window.setTimeout(() => {
      reverseGeocode(pos.lat, pos.lon, ac.signal)
        .then((place) => {
          if (ac.signal.aborted) return;
          setNear(place ? placeText(place) : null);
        })
        .catch(() => {
          if (!ac.signal.aborted) setNear(null);
        });
    }, 400);
    return () => {
      window.clearTimeout(timer);
      ac.abort();
    };
  }, [pos.lat, pos.lon]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  function commitCoords() {
    const nextLat = Number(latShown.trim().replace(",", "."));
    const nextLon = Number(lonShown.trim().replace(",", "."));
    setLatDraft(null);
    setLonDraft(null);
    if (!Number.isFinite(nextLat) || !Number.isFinite(nextLon) || !inDomain(nextLat, nextLon)) {
      return;
    }
    setPos({ lat: nextLat, lon: nextLon });
    const p = L.latLng(nextLat, nextLon);
    markerRef.current?.setLatLng(p);
    mapRef.current?.panTo(p);
  }

  return (
    <div
      className="map-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Pick a point on the map"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="map-panel">
        <div className="map-panel-head">
          <strong>Pick a point</strong>
          <span className="map-hint">Click or drag on the map — Esc to close</span>
          <button type="button" className="btn" onClick={onCancel}>
            Close
          </button>
        </div>
        <div className="map-holder" ref={holderRef} />
        <div className="map-panel-foot">
          <span className="map-near">{near ?? "…"}</span>
          <form
            className="map-coords"
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              commitCoords();
            }}
          >
            <input
              aria-label="Latitude"
              inputMode="decimal"
              spellCheck={false}
              value={latShown}
              onChange={(e) => setLatDraft(e.target.value)}
              onBlur={commitCoords}
            />
            <input
              aria-label="Longitude"
              inputMode="decimal"
              spellCheck={false}
              value={lonShown}
              onChange={(e) => setLonDraft(e.target.value)}
              onBlur={commitCoords}
            />
            <button type="submit" className="btn" aria-label="Apply coordinates">
              OK
            </button>
          </form>
          <span className="map-spacer" />
          {!valid ? (
            <span className="map-domain-warn">Out of {model.short} domain</span>
          ) : null}
          <button
            type="button"
            className="btn primary"
            disabled={!valid}
            onClick={() => onPick(pos.lat, pos.lon, near)}
          >
            Use this point
          </button>
        </div>
      </div>
    </div>
  );
}
