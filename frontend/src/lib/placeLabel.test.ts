import { describe, expect, it } from "vitest";
import {
  isCoordinateLabel,
  knownPlaceLabel,
  loadRememberedPlaceName,
  placeNameForPoint,
  rememberPlaceName,
} from "./placeLabel";

function memory() {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => {
      data.set(k, v);
    },
    removeItem: (k: string) => {
      data.delete(k);
    },
  };
}

describe("isCoordinateLabel", () => {
  it("recognises both coordinate fallbacks", () => {
    expect(isCoordinateLabel("43.7323°N 7.4277°E")).toBe(true);
    expect(isCoordinateLabel("43.7323, 7.4277")).toBe(true);
    expect(isCoordinateLabel("-43.7323°N -7.4277°E")).toBe(true);
  });

  it("keeps a real place name", () => {
    expect(isCoordinateLabel("Beausoleil")).toBe(false);
    expect(isCoordinateLabel("Chamonix-Mont-Blanc, Auvergne-Rhône-Alpes, France")).toBe(false);
    expect(isCoordinateLabel("Puy de Dôme")).toBe(false);
  });
});

describe("placeNameForPoint", () => {
  it("returns the name remembered for this point", () => {
    const store = memory();
    rememberPlaceName(43.7323, 7.4277, "Beausoleil", store);
    expect(loadRememberedPlaceName(43.7323, 7.4277, store)).toBe("Beausoleil");
    expect(placeNameForPoint(43.7323, 7.4277, [], [], store)).toBe("Beausoleil");
  });

  it("ignores a remembered name for another point and a coordinate stub", () => {
    const store = memory();
    rememberPlaceName(45.9, 6.1, "Annecy", store);
    rememberPlaceName(43.73, 7.42, "43.7323, 7.4277", store);
    expect(loadRememberedPlaceName(43.7323, 7.4277, store)).toBeNull();
    expect(placeNameForPoint(43.7323, 7.4277, [], [], store)).toBeNull();
  });

  it("uses a favorite, then a recent place, and skips coordinate labels", () => {
    const favs = [{ lat: 43.7323, lon: 7.4277, label: "43.7323, 7.4277" }];
    const recents = [
      { lat: 45.9, lon: 6.1, label: "Annecy" },
      { lat: 43.73234, lon: 7.42769, label: "Beausoleil" },
    ];
    expect(knownPlaceLabel(43.7323, 7.4277, favs)).toBeNull();
    expect(placeNameForPoint(43.7323, 7.4277, favs, recents, memory())).toBe("Beausoleil");
    expect(
      placeNameForPoint(
        43.7323,
        7.4277,
        [{ lat: 43.7323, lon: 7.4277, label: "Roquebrune" }],
        recents,
        memory(),
      ),
    ).toBe("Roquebrune");
  });
});
