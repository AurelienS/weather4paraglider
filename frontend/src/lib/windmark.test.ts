import { describe, expect, it } from "vitest";
import { windLabelMask } from "./windmark";

describe("windLabelMask", () => {
  it("labels an isolated point", () => {
    expect(windLabelMask([12], 14)).toEqual([true]);
  });

  it("labels every point when the gaps are wide", () => {
    expect(windLabelMask([0, 20, 40], 14)).toEqual([true, true, true]);
  });

  it("keeps the higher point of a tight stack", () => {
    expect(windLabelMask([0, 10, 30], 14)).toEqual([true, false, true]);
  });

  it("walks from the top of the plot even when the list is bottom-first", () => {
    expect(windLabelMask([40, 0, 8], 14)).toEqual([true, true, false]);
  });
});
