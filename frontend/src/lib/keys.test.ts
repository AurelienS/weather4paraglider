import { describe, expect, it } from "vitest";
import type { Favorite } from "./favorites";
import { deskHandlesArrow, stepFavorites, stepPrimaryModel } from "./keys";

const fav = (lat: number, lon: number, label: string): Favorite => ({ lat, lon, label });
const list = [
  fav(45.9, 6.13, "Annecy"),
  fav(45.9231, 6.8692, "Chamonix"),
  fav(45.77, 4.83, "Lyon"),
];

describe("stepFavorites", () => {
  it("walks down and up the list", () => {
    expect(stepFavorites(list, 45.9, 6.13, 1)?.label).toBe("Chamonix");
    expect(stepFavorites(list, 45.9231, 6.8692, -1)?.label).toBe("Annecy");
  });

  it("wraps past either end and does not reload a single favorite", () => {
    expect(stepFavorites(list, 45.9, 6.13, -1)?.label).toBe("Lyon");
    expect(stepFavorites(list, 45.77, 4.83, 1)?.label).toBe("Annecy");
    expect(stepFavorites([fav(45.9, 6.13, "Annecy")], 45.9, 6.13, 1)).toBeNull();
  });

  it("enters the list from a place that is not saved", () => {
    expect(stepFavorites(list, 46, 7, 1)?.label).toBe("Annecy");
    expect(stepFavorites(list, 46, 7, -1)?.label).toBe("Lyon");
  });

  it("matches a place on four decimals", () => {
    expect(stepFavorites(list, 45.90004, 6.13004, 1)?.label).toBe("Chamonix");
  });

  it("does nothing when there are no favorites", () => {
    expect(stepFavorites([], 45, 6, 1)).toBeNull();
  });
});

describe("deskHandlesArrow", () => {
  const body = { tagName: "BODY", id: "", value: "", isContentEditable: false };
  const search = { tagName: "INPUT", id: "place", value: "", isContentEditable: false };
  const idle = { mapOpen: false, menuOpen: false, modified: false };

  it("handles arrows on the page and in the empty place field", () => {
    expect(deskHandlesArrow("ArrowDown", body, idle)).toBe(true);
    expect(deskHandlesArrow("ArrowRight", search, idle)).toBe(true);
    expect(deskHandlesArrow("ArrowDown", { ...search, value: "cham" }, idle)).toBe(true);
  });

  it("leaves the keys to a menu, a typed caret, the map and other fields", () => {
    expect(deskHandlesArrow("ArrowDown", search, { ...idle, menuOpen: true })).toBe(false);
    expect(deskHandlesArrow("ArrowLeft", { ...search, value: "cham" }, idle)).toBe(false);
    expect(deskHandlesArrow("ArrowDown", body, { ...idle, mapOpen: true })).toBe(false);
    expect(deskHandlesArrow("ArrowDown", body, { ...idle, modified: true })).toBe(false);
    expect(
      deskHandlesArrow("ArrowDown", { tagName: "INPUT", id: "lat", value: "", isContentEditable: false }, idle),
    ).toBe(false);
    expect(
      deskHandlesArrow("ArrowDown", { tagName: "SELECT", id: "lang", value: "", isContentEditable: false }, idle),
    ).toBe(false);
  });
});

describe("stepPrimaryModel", () => {
  it("steps between the two plates and wraps", () => {
    expect(stepPrimaryModel("arome_france", 1)).toBe("icon_d2");
    expect(stepPrimaryModel("icon_d2", -1)).toBe("arome_france");
    expect(stepPrimaryModel("arome_france", -1)).toBe("icon_d2");
    expect(stepPrimaryModel("icon_d2", 1)).toBe("arome_france");
  });

  it("enters the pair from a model that is not on the rail", () => {
    expect(stepPrimaryModel("arome_france_hd", 1)).toBe("arome_france");
    expect(stepPrimaryModel("meteoswiss_icon_ch1", -1)).toBe("icon_d2");
  });
});
