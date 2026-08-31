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
// fallback geocoder: the Open-Meteo geocoding API shares the weather
// provider's availability, so the search survives Photon outages
const OPEN_METEO_GEO = "https://geocoding-api.open-meteo.com/v1/search";

type OmGeoResult = {
  name?: string;
  latitude?: number;
  longitude?: number;
  admin1?: string;
  admin2?: string;
  country?: string;
};

/** Map an Open-Meteo geocoding result to a Place. Exported for tests. */
export function omToPlace(r: OmGeoResult): Place | null {
  if (typeof r.latitude !== "number" || typeof r.longitude !== "number") return null;
  const label = r.name ?? r.admin2 ?? r.admin1 ?? r.country ?? "Point";
  const detail = [...new Set([r.admin2, r.admin1, r.country])]
    .filter((v): v is string => Boolean(v) && v !== label)
    .join(", ");
  return { lat: r.latitude, lon: r.longitude, label, detail };
}

/** Open-Meteo geocoding has no bbox filter: results are trimmed to the
 * model domain client-side. */
function inDomain(p: Place, domain?: ModelDomain): boolean {
  if (!domain) return true;
  return (
    p.lat >= domain.latMin &&
    p.lat <= domain.latMax &&
    p.lon >= domain.lonMin &&
    p.lon <= domain.lonMax
  );
}

async function searchPhoton(
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

async function searchOpenMeteo(
  query: string,
  signal?: AbortSignal,
  domain?: ModelDomain,
): Promise<Place[]> {
  const url = new URL(OPEN_METEO_GEO);
  url.searchParams.set("name", query);
  url.searchParams.set("count", "6");
  url.searchParams.set("language", "fr");
  url.searchParams.set("format", "json");
  const res = await fetch(url.toString(), { signal });
  if (!res.ok) throw new Error(`Search unavailable (${res.status}).`);
  const payload = (await res.json()) as { results?: OmGeoResult[] };
  const places: Place[] = [];
  for (const r of payload.results ?? []) {
    const place = omToPlace(r);
    if (place && inDomain(place, domain)) places.push(place);
  }
  return places;
}

export async function searchPlaces(
  query: string,
  signal?: AbortSignal,
  domain?: ModelDomain,
): Promise<Place[]> {
  try {
    return await searchPhoton(query, signal, domain);
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    // Photon unreachable (network, outage, 5xx): fall back to the
    // Open-Meteo geocoder
    return searchOpenMeteo(query, signal, domain);
  }
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
