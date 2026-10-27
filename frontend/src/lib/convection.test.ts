import { describe, expect, test } from "vitest";
import type { Hour, ProfilePoint } from "../api/types";
import {
  allenShape,
  convectiveTop,
  convectiveVelocity,
  holtslagSensible,
  liftingCondensationLevelM,
  surfaceHeating,
  thermalSpeed,
  thermalUpdraft,
  upwardHeatFlux,
} from "./convection";

function point(z: number, t: number, td: number | null = null): ProfilePoint {
  return { z, src: "t", t, rh: null, td, wind: 10, dir: 270, cloud: 0 };
}

function hour(profile: ProfilePoint[], surface: Partial<Hour["surface"]> = {}): Hour {
  return {
    time: "2026-08-31T14:00:00+02:00",
    surface: {
      t2m: 20,
      rh2m: 40,
      wind10: 8,
      dir10: 180,
      gust10: 12,
      cape: 0,
      precip: 0,
      cloudLow: 0,
      cloudMid: 0,
      cloudHigh: 0,
      cloudBaseM: null,
      psfc: 950,
      shortwave: 600,
      sensibleUp: null,
      latentUp: null,
      ...surface,
    },
    profile,
  };
}

/** Temperature on the dry adiabat of potential temperature `theta` (°C). */
function dalr(theta: number, z: number, elev: number): number {
  return theta - (9.8 * (z - elev)) / 1000;
}

describe("upwardHeatFlux", () => {
  test("flips the downward-positive model flux into the atmosphere", () => {
    expect(upwardHeatFlux(-97.2)).toBe(97.2);
    expect(upwardHeatFlux(6.9)).toBe(-6.9);
    expect(upwardHeatFlux(null)).toBeNull();
    expect(upwardHeatFlux(Number.NaN)).toBeNull();
  });
});

describe("surfaceHeating", () => {
  test("a negative model flux stays a stable surface and is not replaced", () => {
    const heat = surfaceHeating(
      hour([], { sensibleUp: -20, shortwave: 800, t2m: 25 }),
    );
    expect(heat.modelKnown).toBe(true);
    expect(heat.hUp).toBe(0);
  });

  test("an unpublished flux falls back to the radiation scheme", () => {
    const heat = surfaceHeating(hour([], { sensibleUp: null, shortwave: 600, t2m: 15, psfc: 1013 }));
    expect(heat.modelKnown).toBe(false);
    expect(heat.hUp).toBeGreaterThan(15);
  });
});

describe("holtslagSensible", () => {
  test("matches the grass energy budget at 15 °C, 600 W/m², clear sky", () => {
    const h = holtslagSensible({ tC: 15, pHpa: 1013, shortwave: 600, cloudFraction: 0 });
    expect(h).toBeCloseTo(108, 0);
  });

  test("is zero without sun", () => {
    expect(holtslagSensible({ tC: 15, pHpa: 1013, shortwave: 0, cloudFraction: 0 })).toBe(0);
  });
});

describe("convectiveVelocity", () => {
  test("is Deardorff's scale for a 1200 m layer and 200 W/m²", () => {
    const w = convectiveVelocity({
      hUp: 200,
      leUp: 0,
      depthM: 1200,
      tC: 20,
      tdC: null,
      pHpa: 900,
    });
    expect(w).toBeCloseTo(1.96, 1);
  });

  test("is zero without heat or without a real layer", () => {
    expect(
      convectiveVelocity({ hUp: 0, leUp: 0, depthM: 1200, tC: 20, tdC: null, pHpa: 900 }),
    ).toBe(0);
    expect(
      convectiveVelocity({ hUp: 200, leUp: 0, depthM: 100, tC: 20, tdC: null, pHpa: 900 }),
    ).toBe(0);
  });
});

describe("thermalUpdraft", () => {
  test("equals w* at mid-layer and peaks lower down", () => {
    const base = 500;
    const depth = 1000;
    expect(allenShape(0.5)).toBeGreaterThan(0);
    expect(thermalUpdraft(2, base + 0.5 * depth, base, depth)).toBe(2);
    expect(thermalUpdraft(2, base + 0.25 * depth, base, depth)).toBe(2.6);
    expect(thermalUpdraft(2, base + depth, base, depth)).toBe(0);
    expect(thermalUpdraft(0, base + 400, base, depth)).toBe(0);
    expect(thermalUpdraft(2, base + 400, base, 100)).toBe(0);
  });
});

describe("liftingCondensationLevelM", () => {
  test("Bolton's level for 20 °C and a 10 °C dew point", () => {
    expect(liftingCondensationLevelM(20, 10, 1000)).toBeCloseTo(2247, 0);
  });

  test("saturated air condenses at the surface", () => {
    expect(liftingCondensationLevelM(12, 12, 800)).toBe(800);
  });
});

describe("convectiveTop", () => {
  const elev = 500;

  function mixedColumn(theta: number, capAt: number): ProfilePoint[] {
    const zs = [560, 800, 1100, 1400, capAt];
    const mixed = zs.map((z) => point(z, dalr(theta, z, elev), 5));
    return [
      ...mixed,
      point(capAt + 200, dalr(theta + 5, capAt + 200, elev), 0),
      point(capAt + 700, dalr(theta + 7, capAt + 700, elev), -2),
    ];
  }

  test("follows the mixed layer and ignores a hot skin", () => {
    const profile = mixedColumn(18, 1700);
    const warm = convectiveTop(hour(profile, { t2m: 32, shortwave: 650 }), elev);
    const mild = convectiveTop(hour(profile, { t2m: 18, shortwave: 650 }), elev);
    expect(warm).not.toBeNull();
    expect(mild).not.toBeNull();
    expect(warm!).toBeGreaterThan(1500);
    expect(warm!).toBeLessThan(1900);
    expect(Math.abs(warm! - mild!)).toBeLessThanOrEqual(100);
  });

  test("a stable lapse in sunshine is not a convective layer", () => {
    const profile = [600, 1000, 1600, 2200, 3000].map((z) =>
      point(z, 18 - 0.0065 * (z - elev)),
    );
    expect(convectiveTop(hour(profile, { t2m: 18, shortwave: 700 }), elev)).toBeNull();
  });

  test("a surface inversion at night is not convective", () => {
    const profile = [point(650, 12, 2), point(1100, 10, 1), point(1800, 6, 0)];
    expect(convectiveTop(hour(profile, { t2m: 4, shortwave: 0 }), elev)).toBeNull();
  });

  test("a model flux into the ground suppresses the layer even in strong sun", () => {
    const profile = mixedColumn(16, 2000);
    const top = convectiveTop(
      hour(profile, { t2m: 16, shortwave: 800, sensibleUp: -20 }),
      elev,
    );
    expect(top).toBeNull();
  });

  test("a published upward flux allows a mixed layer after sunset", () => {
    const profile = mixedColumn(16, 2000);
    const top = convectiveTop(
      hour(profile, { t2m: 16, shortwave: 0, sensibleUp: 150, latentUp: 40 }),
      elev,
    );
    expect(top).toBeGreaterThan(1800);
    expect(top!).toBeLessThan(2200);
  });

  test("a profile that never reaches a cap does not draw a fake ceiling", () => {
    const shallow = [1050, 1080, 1100].map((z) => point(z, dalr(15, z, 1000)));
    expect(convectiveTop(hour(shallow, { t2m: 15, shortwave: 500 }), 1000)).toBeNull();
    const mid = [1100, 1400, 1800].map((z) => point(z, dalr(15, z, 1000)));
    expect(convectiveTop(hour(mid, { t2m: 15, shortwave: 500 }), 1000)).toBeNull();
  });

  test("a deep profile that stays mixed is convective up to the data", () => {
    const profile = [300, 800, 1400, 2000, 2600].map((z) => point(z, dalr(12, z, 200), 2));
    const top = convectiveTop(hour(profile, { t2m: 12, shortwave: 500 }), 200);
    expect(top).toBeGreaterThanOrEqual(2575);
  });

  test("missing dew points aloft do not invent a cap under a moist level", () => {
    const elevM = 1000;
    const theta = 20;
    const profile = [
      point(1002, 20, 14),
      point(1100, dalr(theta, 1100, elevM), null),
      point(1500, dalr(theta, 1500, elevM), null),
      point(2000, dalr(theta, 2000, elevM), null),
      point(2500, dalr(theta, 2500, elevM), 10),
      point(2800, dalr(theta, 2800, elevM), 6),
      point(3300, dalr(theta + 8, 3300, elevM), 0),
    ];
    const top = convectiveTop(hour(profile, { t2m: 20, shortwave: 550, psfc: 900 }), elevM);
    expect(top).toBeGreaterThan(2600);
    expect(top!).toBeLessThan(3300);
  });
});

describe("thermalSpeed", () => {
  test("is stronger in the lower half than near the top, and zero outside", () => {
    const elev = 500;
    const theta = 18;
    const mixed = [560, 900, 1300, 1700].map((z) => point(z, dalr(theta, z, elev), 6));
    const cap = [
      point(2000, dalr(theta + 6, 2000, elev), 0),
      point(2600, dalr(theta + 8, 2600, elev), -2),
    ];
    const day = hour([point(502, 20, 6), ...mixed, ...cap], { t2m: 20, shortwave: 700 });
    const top = convectiveTop(day, elev);
    expect(top).not.toBeNull();
    const depth = top! - elev;
    const low = thermalSpeed(day, elev + depth * 0.25, elev, top);
    const high = thermalSpeed(day, elev + depth * 0.85, elev, top);
    expect(low).toBeGreaterThan(high);
    expect(low).toBeGreaterThan(0.3);
    expect(thermalSpeed(day, top! + 50, elev, top)).toBe(0);
    expect(thermalSpeed(day, elev, elev, top)).toBe(0);

    const night = hour(
      [point(650, 8, 2), point(1200, 6, 0)],
      { t2m: 2, shortwave: 0 },
    );
    expect(convectiveTop(night, elev)).toBeNull();
    expect(thermalSpeed(night, elev + 400, elev, null)).toBe(0);
  });
});
