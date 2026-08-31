export type Pin = { lat: number; lon: number; name?: string };

export const MAX_PINS = 6;

export function pinKey(pin: { lat: number; lon: number }): string {
  return `${pin.lat.toFixed(4)},${pin.lon.toFixed(4)}`;
}

/** Parse one `pins` segment: "lat,lon/Name" (name optional). */
export function parsePinSegment(part: string): Pin | null {
  if (!part) return null;
  const slash = part.indexOf("/");
  const coord = slash === -1 ? part : part.slice(0, slash);
  const namePart = slash === -1 ? "" : part.slice(slash + 1);
  const comma = coord.indexOf(",");
  if (comma === -1) return null;
  const lat = Number(coord.slice(0, comma));
  const lon = Number(coord.slice(comma + 1));
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  let name: string | undefined;
  try {
    name = decodeURIComponent(namePart) || undefined;
  } catch {
    name = namePart || undefined;
  }
  return { lat, lon, name };
}

/** Encode one pin as a `pins` segment (4-decimal coordinates). */
export function encodePin(pin: Pin): string {
  const coord = `${pin.lat.toFixed(4)},${pin.lon.toFixed(4)}`;
  return pin.name ? `${coord}/${encodeURIComponent(pin.name)}` : coord;
}

/** Parse the `pins` URL parameter: "lat,lon/Name;lat,lon" (name optional). */
export function parsePins(raw: string | null): Pin[] {
  if (!raw) return [];
  const out: Pin[] = [];
  for (const part of raw.split(";")) {
    const pin = parsePinSegment(part);
    if (pin && out.length < MAX_PINS) out.push(pin);
  }
  return out;
}

/** Encode pins for the `pins` URL parameter (4-decimal coordinates). */
export function encodePins(pins: Pin[]): string {
  return pins.map(encodePin).join(";");
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
