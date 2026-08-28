export type Pin = { lat: number; lon: number; name?: string };

export const MAX_PINS = 6;

export function pinKey(pin: { lat: number; lon: number }): string {
  return `${pin.lat.toFixed(4)},${pin.lon.toFixed(4)}`;
}

/** Parse the `pins` URL parameter: "lat,lon/Name;lat,lon" (name optional). */
export function parsePins(raw: string | null): Pin[] {
  if (!raw) return [];
  const out: Pin[] = [];
  for (const part of raw.split(";")) {
    if (!part) continue;
    const slash = part.indexOf("/");
    const coord = slash === -1 ? part : part.slice(0, slash);
    const namePart = slash === -1 ? "" : part.slice(slash + 1);
    const comma = coord.indexOf(",");
    if (comma === -1) continue;
    const lat = Number(coord.slice(0, comma));
    const lon = Number(coord.slice(comma + 1));
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    let name: string | undefined;
    try {
      name = decodeURIComponent(namePart) || undefined;
    } catch {
      name = namePart || undefined;
    }
    if (out.length < MAX_PINS) out.push({ lat, lon, name });
  }
  return out;
}

/** Encode pins for the `pins` URL parameter (4-decimal coordinates). */
export function encodePins(pins: Pin[]): string {
  return pins
    .map((p) => {
      const coord = `${p.lat.toFixed(4)},${p.lon.toFixed(4)}`;
      return p.name ? `${coord}/${encodeURIComponent(p.name)}` : coord;
    })
    .join(";");
}

/** Add a pin: an existing pin (same rounded coordinates) is replaced in place,
 * keeping the board order. */
export function addPin(pins: Pin[], pin: Pin): Pin[] {
  const key = pinKey(pin);
  if (pins.some((p) => pinKey(p) === key)) {
    return pins.map((p) => (pinKey(p) === key ? pin : p));
  }
  const next = [...pins, pin];
  return next.length > MAX_PINS ? next.slice(next.length - MAX_PINS) : next;
}
