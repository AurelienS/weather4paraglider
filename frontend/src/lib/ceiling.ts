import type { Hour } from "../api/types";
import { CLOUD_VEIL_PCT } from "./windgram";

/** The altitude charts stop here unless the user asks to see higher. */
export const FLYING_Z_MAX_M = 5000;

/**
 * Top of the layer where cloud can still matter for a paraglider: shade,
 * overdevelopment, a ceiling. Higher than that is thin cirrus. 10 km sits
 * on the windgram's 250 m grid.
 */
export const CLOUD_INFLUENCE_Z_MAX_M = 10_000;

/** Highest profile level cloudy enough to paint the windgram veil.
 * Null when every level is clearer than that. */
export function cloudTopM(hours: readonly Hour[]): number | null {
  let top: number | null = null;
  for (const hour of hours) {
    for (const point of hour.profile) {
      if (point.cloud == null || point.cloud < CLOUD_VEIL_PCT) continue;
      if (top == null || point.z > top) top = point.z;
    }
  }
  return top;
}

/** True when the displayed hours have cloud above the flying window. */
export function canSeeHigher(hours: readonly Hour[]): boolean {
  const top = cloudTopM(hours);
  return top != null && top > FLYING_Z_MAX_M;
}

function profileTopM(hours: readonly Hour[]): number {
  let top = 0;
  for (const hour of hours) {
    for (const point of hour.profile) {
      if (point.z > top) top = point.z;
    }
  }
  return top;
}

/** Altitude cap for the windgram and the sounding. Collapsed stays at the
 * flying window. Expanded opens the whole layer up to 10 km, not merely up
 * to the highest cloud, and never past the last measured level: above that
 * level the windgram would paint the top cloud forever. */
export function altitudeCeiling(hours: readonly Hour[], expanded: boolean): number {
  if (!expanded) return FLYING_Z_MAX_M;
  const top = cloudTopM(hours);
  if (top == null || top <= FLYING_Z_MAX_M) return FLYING_Z_MAX_M;
  return Math.min(CLOUD_INFLUENCE_Z_MAX_M, profileTopM(hours));
}
