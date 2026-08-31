import { describe, expect, test } from "vitest";
import { omToPlace } from "./geocode";

describe("omToPlace", () => {
  test("maps name, admin and country to label and detail", () => {
    expect(
      omToPlace({
        name: "Chamonix-Mont-Blanc",
        latitude: 45.92375,
        longitude: 6.86933,
        admin1: "Rhône-Alpes",
        admin2: "Haute-Savoie",
        country: "France",
      }),
    ).toEqual({
      lat: 45.92375,
      lon: 6.86933,
      label: "Chamonix-Mont-Blanc",
      detail: "Haute-Savoie, Rhône-Alpes, France",
    });
  });

  test("falls back to admin levels when the name is missing", () => {
    expect(omToPlace({ latitude: 45, longitude: 6, admin1: "Île-de-France" })).toEqual({
      lat: 45,
      lon: 6,
      label: "Île-de-France",
      detail: "",
    });
  });

  test("drops results without coordinates", () => {
    expect(omToPlace({ name: "Nowhere" })).toBeNull();
  });
});
