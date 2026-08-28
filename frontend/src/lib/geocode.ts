import type { ModelDomain } from "../api/models";

export type Place = {
  lat: number;
  lon: number;
  label: string;
  detail: string;
};

type PhotonFeature = {
  geometry?: { coordinates?: [number, number] };
  properties?: {
    name?: string;
    housenumber?: string;
    street?: string;
    postcode?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    county?: string;
    state?: string;
    country?: string;
  };
};

function toPlace(f: PhotonFeature, preferLocality = false): Place | null {
  const lon = f.geometry?.coordinates?.[0];
  const lat = f.geometry?.coordinates?.[1];
  if (typeof lat !== "number" || typeof lon !== "number") return null;
  const p = f.properties ?? {};
  const locality = p.city ?? p.town ?? p.village ?? p.municipality ?? p.county;
  const label = (preferLocality && locality) || p.name || locality || p.state || p.country || "Point";
  const detail = [...new Set([locality, p.state, p.country])]
    .filter((v): v is string => Boolean(v) && v !== label)
    .join(", ");
  return { lat, lon, label, detail };
}

const PHOTON = "https://photon.komoot.io";

export async function searchPlaces(
  query: string,
  signal?: AbortSignal,
  domain?: ModelDomain,
): Promise<Place[]> {
  const url = new URL(`${PHOTON}/api/`);
  url.searchParams.set("q", query);
  url.searchParams.set("limit", "6");
  url.searchParams.set("lang", "fr");
  if (domain && domain.lonMax - domain.lonMin < 350) {
    url.searchParams.set(
      "bbox",
      `${domain.lonMin},${domain.latMin},${domain.lonMax},${domain.latMax}`,
    );
  }
  const res = await fetch(url.toString(), { signal });
  if (!res.ok) throw new Error(`Search unavailable (${res.status}).`);
  const payload = (await res.json()) as { features?: PhotonFeature[] };
  const places: Place[] = [];
  for (const f of payload.features ?? []) {
    const place = toPlace(f);
    if (place) places.push(place);
  }
  return places;
}

export async function reverseGeocode(
  lat: number,
  lon: number,
  signal?: AbortSignal,
): Promise<Place | null> {
  const url = new URL(`${PHOTON}/reverse`);
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lon));
  url.searchParams.set("limit", "1");
  url.searchParams.set("lang", "fr");
  try {
    const res = await fetch(url.toString(), { signal });
    if (!res.ok) return null;
    const payload = (await res.json()) as { features?: PhotonFeature[] };
    const f = payload.features?.[0];
    return f ? toPlace(f, true) : null;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    return null;
  }
}

export function placeText(p: Place): string {
  return [p.label, p.detail].filter(Boolean).join(", ");
}
