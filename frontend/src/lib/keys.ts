import { PRIMARY_MODELS, type ModelId } from "../api/models";
import type { Favorite } from "./favorites";
import { pinKey } from "./pins";

export type KeyTarget = {
  tagName: string;
  id: string;
  value: string;
  isContentEditable: boolean;
};

/**
 * The desk takes the arrow keys unless a field is actually using them:
 * the map, any input other than the idle place search, a select, or the
 * place search while its suggestion menu is open. Left and right stay with
 * a typed query so the caret can move.
 */
export function deskHandlesArrow(
  key: string,
  target: KeyTarget,
  ui: { mapOpen: boolean; menuOpen: boolean; modified: boolean },
): boolean {
  if (ui.modified || ui.mapOpen) return false;
  if (key !== "ArrowUp" && key !== "ArrowDown" && key !== "ArrowLeft" && key !== "ArrowRight") {
    return false;
  }
  if (target.isContentEditable) return false;
  const tag = target.tagName;
  if (tag === "TEXTAREA" || tag === "SELECT") return false;
  if (tag === "INPUT") {
    if (target.id !== "place" || ui.menuOpen) return false;
    if (target.value.length > 0 && (key === "ArrowLeft" || key === "ArrowRight")) return false;
  }
  return true;
}

/**
 * Next favorite in list order. Down walks toward the bottom of the rail.
 * The list wraps, so the top favorite is one step above the bottom one.
 * A single saved place does not reload itself. When the current place is
 * not in the list, down enters at the top and up at the bottom.
 */
export function stepFavorites(
  favs: readonly Favorite[],
  lat: number,
  lon: number,
  delta: -1 | 1,
): Favorite | null {
  if (favs.length === 0) return null;
  const idx = favs.findIndex((f) => pinKey(f) === pinKey({ lat, lon }));
  if (idx < 0) return delta > 0 ? favs[0]! : favs[favs.length - 1]!;
  if (favs.length === 1) return null;
  return favs[(idx + delta + favs.length) % favs.length] ?? null;
}

/**
 * Next plate in the two-model pair. Left and right wrap, so either key
 * leaves the plate you are on. A model that is not on the rail sits just
 * outside it: right enters on the first plate, left on the last.
 */
export function stepPrimaryModel(current: ModelId, delta: -1 | 1): ModelId | null {
  const idx = PRIMARY_MODELS.indexOf(current);
  if (idx < 0) {
    const from = delta > 0 ? -1 : PRIMARY_MODELS.length;
    return PRIMARY_MODELS[from + delta] ?? null;
  }
  const count = PRIMARY_MODELS.length;
  if (count < 2) return null;
  return PRIMARY_MODELS[(idx + delta + count) % count] ?? null;
}
