import { describe, expect, it } from "vitest";
import { apiVarsFor, modelById } from "./models";

describe("upper pressure levels", () => {
  it("asks AROME and ARPEGE for the high-cloud layer through 150 hPa", () => {
    for (const id of ["arome_france", "arpege_europe", "arpege_world"] as const) {
      const vars = apiVarsFor(modelById(id));
      expect(vars).toContain("cloud_cover_150hPa");
      expect(vars).toContain("geopotential_height_450hPa");
      expect(vars).toContain("temperature_200hPa");
      expect(vars.join(",").length).toBeLessThan(8000);
    }
  });

  it("asks ICON D2 only for the upper levels that model fills", () => {
    const vars = apiVarsFor(modelById("icon_d2"));
    expect(vars).toContain("cloud_cover_200hPa");
    expect(vars).toContain("geopotential_height_400hPa");
    expect(vars).not.toContain("cloud_cover_150hPa");
    expect(vars).not.toContain("cloud_cover_450hPa");
    expect(vars).not.toContain("cloud_cover_350hPa");
  });
});
