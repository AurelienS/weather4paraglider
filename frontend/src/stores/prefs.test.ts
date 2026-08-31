import { beforeEach, describe, expect, test, vi } from "vitest";
import type { AromeResponse } from "../api/types";

vi.mock("../api/client", () => ({ fetchArome: vi.fn() }));

import { fetchArome } from "../api/client";
import { useStore } from "./index";

const fetchAromeMock = vi.mocked(fetchArome);

function payload(): AromeResponse {
  return {
    model: "arome",
    grid: "1.3km",
    source: "mf",
    lat: 45,
    lon: 6,
    modelElevationM: 1000,
    nearestCell: { lat: 45, lon: 6 },
    runInitUtc: "2030-01-01T00:00:00Z",
    runAvailable: true,
    timezone: "Europe/Paris",
    fetchedAt: "2030-01-01T00:05:00Z",
    hours: [],
    warnings: [],
    attribution: "test",
  };
}

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  vi.clearAllMocks();
  fetchAromeMock.mockResolvedValue(payload());
  useStore.setState({
    point: { lat: 45.8992, lon: 6.1294 },
    place: "Annecy",
    lang: "en",
    favs: [],
    theme: "dark",
    pins: [],
  });
});

describe("prefs.addFavorite", () => {
  test("adds the current place, named after the known label", () => {
    useStore.getState().addFavorite();
    expect(useStore.getState().favs).toEqual([
      { lat: 45.8992, lon: 6.1294, label: "Annecy" },
    ]);
  });

  test("falls back to the board pin name, then bare coordinates", () => {
    useStore.setState({
      place: null,
      pins: [{ lat: 45.8992, lon: 6.1294, name: "Pin name" }],
    });
    useStore.getState().addFavorite();
    expect(useStore.getState().favs[0]?.label).toBe("Pin name");

    useStore.setState({ pins: [], favs: [] });
    useStore.getState().addFavorite();
    expect(useStore.getState().favs[0]?.label).toBe("45.8992, 6.1294");
  });

  test("adding twice is a no-op", () => {
    useStore.getState().addFavorite();
    useStore.getState().addFavorite();
    expect(useStore.getState().favs).toHaveLength(1);
  });

  test("removeFavorite drops the entry", () => {
    useStore.getState().addFavorite();
    const fav = useStore.getState().favs[0];
    expect(fav).toBeDefined();
    useStore.getState().removeFavorite(fav!);
    expect(useStore.getState().favs).toEqual([]);
  });
});

describe("prefs.setLang", () => {
  test("persists the language and reloads so errors are retranslated", async () => {
    useStore.getState().setLang("fr");
    await flush();

    expect(useStore.getState().lang).toBe("fr");
    expect(fetchAromeMock).toHaveBeenCalledWith(
      45.8992,
      6.1294,
      "arome_france",
      expect.objectContaining({ lang: "fr" }),
    );
  });

  test("setting the same language is a no-op", () => {
    useStore.getState().setLang("en");
    expect(fetchAromeMock).not.toHaveBeenCalled();
  });
});

describe("prefs.toggleTheme", () => {
  test("flips the theme", () => {
    useStore.getState().toggleTheme();
    expect(useStore.getState().theme).toBe("light");
    useStore.getState().toggleTheme();
    expect(useStore.getState().theme).toBe("dark");
  });
});
