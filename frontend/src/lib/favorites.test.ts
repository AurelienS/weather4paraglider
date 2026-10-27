import { describe, expect, it } from "vitest";
import { MAX_RECENT_PLACES, recordRecentPlace, type Favorite } from "./favorites";

const pin = (lat: number, lon: number, label: string): Favorite => ({ lat, lon, label });

describe("recordRecentPlace", () => {
  it("puts a new place at the front and caps the list", () => {
    const list = Array.from({ length: MAX_RECENT_PLACES }, (_, i) =>
      pin(40 + i * 0.1, 6, `P${i}`),
    );
    const next = recordRecentPlace(list, pin(45.9, 6.1, "Annecy"));
    expect(next).toHaveLength(MAX_RECENT_PLACES);
    expect(next[0]).toEqual(pin(45.9, 6.1, "Annecy"));
    expect(next.some((p) => p.label === "P9")).toBe(false);
  });

  it("keeps an existing place where it is and refreshes the label", () => {
    const list = [pin(45.92, 6.87, "Chamonix"), pin(45.9, 6.13, "Annecy"), pin(45.04, 3.88, "Puy")];
    const next = recordRecentPlace(list, pin(45.9, 6.13, "Annecy-le-Vieux"));
    expect(next.map((p) => p.lat)).toEqual([45.92, 45.9, 45.04]);
    expect(next[1]?.label).toBe("Annecy-le-Vieux");
  });
});
