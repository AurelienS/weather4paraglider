/** One sample of a series that rises along `at` (an altitude, or an hour). */
export type CursorPoint = { at: number; value: number | null };

/**
 * Value at `at`. Defined samples are joined by a straight line. Outside the
 * first and last defined sample the series holds its end value when `hold`
 * is set, and is empty otherwise (a convective layer must not be invented
 * before it starts or after it ends).
 */
export function sampleAt(points: readonly CursorPoint[], at: number, hold = true): number | null {
  const pts = points
    .filter((p): p is { at: number; value: number } => p.value != null)
    .sort((a, b) => a.at - b.at);
  const first = pts[0];
  const last = pts[pts.length - 1];
  if (!first || !last) return null;
  if (pts.length === 1) {
    if (!hold && at !== first.at) return null;
    return first.value;
  }
  if (at < first.at) return hold ? first.value : null;
  if (at > last.at) return hold ? last.value : null;
  let i = 0;
  while (i < pts.length - 1 && pts[i + 1]!.at < at) i += 1;
  const a = pts[i]!;
  const b = pts[i + 1] ?? a;
  if (b.at === a.at) return a.value;
  const t = (at - a.at) / (b.at - a.at);
  return a.value + (b.value - a.value) * t;
}

/** Same as `sampleAt`, taking the short way around the compass. */
export function sampleDir(points: readonly CursorPoint[], at: number, hold = true): number | null {
  const pts = points
    .filter((p): p is { at: number; value: number } => p.value != null)
    .sort((a, b) => a.at - b.at);
  const first = pts[0];
  const last = pts[pts.length - 1];
  if (!first || !last) return null;
  if (pts.length === 1) {
    if (!hold && at !== first.at) return null;
    return norm360(first.value);
  }
  if (at < first.at) return hold ? norm360(first.value) : null;
  if (at > last.at) return hold ? norm360(last.value) : null;
  let i = 0;
  while (i < pts.length - 1 && pts[i + 1]!.at < at) i += 1;
  const a = pts[i]!;
  const b = pts[i + 1] ?? a;
  if (b.at === a.at) return norm360(a.value);
  const t = (at - a.at) / (b.at - a.at);
  const delta = ((b.value - a.value + 540) % 360) - 180;
  return norm360(a.value + delta * t);
}

function norm360(deg: number): number {
  return ((deg % 360) + 360) % 360;
}
