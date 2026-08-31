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
    data: null,
    error: null,
    loading: true,
    compare: false,
    pins: [],
    pinStates: {},
  });
});

describe("compare.toggleCompare", () => {
  test("entering compare mode pins the current place", async () => {
    useStore.getState().toggleCompare(true);
    await flush();

    const s = useStore.getState();
    expect(s.compare).toBe(true);
    expect(s.pins).toEqual([{ lat: 45.8992, lon: 6.1294, name: "Annecy" }]);
    expect(fetchAromeMock).toHaveBeenCalled();
  });

  test("entering compare mode with the place already pinned keeps the board", async () => {
    useStore.setState({ pins: [{ lat: 45.8992, lon: 6.1294 }] });
    useStore.getState().toggleCompare(true);
    await flush();

    expect(useStore.getState().pins).toEqual([{ lat: 45.8992, lon: 6.1294 }]);
    expect(useStore.getState().compare).toBe(true);
  });
  test("leaving compare mode keeps the pins", () => {
    useStore.setState({ compare: true, pins: [{ lat: 45.8992, lon: 6.1294 }] });
    useStore.getState().toggleCompare(false);
    expect(useStore.getState().compare).toBe(false);
    expect(useStore.getState().pins).toEqual([{ lat: 45.8992, lon: 6.1294 }]);
  });
});

describe("compare.removePin", () => {
  test("removing the current place ends the comparison", () => {
    useStore.setState({
      compare: true,
      pins: [
        { lat: 45.8992, lon: 6.1294 },
        { lat: 46, lon: 7 },
      ],
    });
    useStore.getState().removePin("45.8992,6.1294");

    const s = useStore.getState();
    expect(s.compare).toBe(false);
    expect(s.pins).toEqual([{ lat: 46, lon: 7 }]);
  });

  test("removing another pin just leaves the board", () => {
    useStore.setState({
      compare: true,
      pins: [
        { lat: 45.8992, lon: 6.1294 },
        { lat: 46, lon: 7 },
      ],
    });
    useStore.getState().removePin("46.0000,7.0000");

    const s = useStore.getState();
    expect(s.compare).toBe(true);
    expect(s.pins).toEqual([{ lat: 45.8992, lon: 6.1294 }]);
  });
});

describe("compare.clearBoard", () => {
  test("clears the board but keeps the current place pinned", async () => {
    useStore.setState({
      compare: true,
      pins: [
        { lat: 45.8992, lon: 6.1294 },
        { lat: 46, lon: 7 },
      ],
    });
    useStore.getState().clearBoard();
    await flush();

    const s = useStore.getState();
    expect(s.pins).toEqual([{ lat: 45.8992, lon: 6.1294, name: "Annecy" }]);
    expect(fetchAromeMock).toHaveBeenCalledWith(
      45.8992,
      6.1294,
      "arome_france",
      expect.anything(),
    );
  });
});

describe("location.submitPlace", () => {
  test("a new place updates the point, clears the label and loads", async () => {
    useStore.setState({ place: null });
    useStore.getState().submitPlace(46, 7, "Sallanches");
    await flush();

    const s = useStore.getState();
    expect(s.point).toEqual({ lat: 46, lon: 7 });
    expect(s.place).toBe("Sallanches");
    expect(s.loading).toBe(false);
    expect(fetchAromeMock).toHaveBeenCalledWith(46, 7, "arome_france", expect.anything());
  });

  test("outside compare mode the board is untouched", () => {
    useStore.getState().submitPlace(46, 7, null);
    expect(useStore.getState().pins).toEqual([]);
  });

  test("in compare mode every loaded place joins the board", async () => {
    useStore.setState({ compare: true, pins: [] });
    useStore.getState().submitPlace(46, 7, "Sallanches");
    await flush();

    expect(useStore.getState().pins).toEqual([{ lat: 46, lon: 7, name: "Sallanches" }]);
  });
});

describe("location.goHome", () => {
  test("resets to the demo point with a clean state", async () => {
    useStore.setState({
      modelId: "arpege_europe",
      compare: true,
      pins: [{ lat: 46, lon: 7 }],
      day: "2030-01-02",
      hourIdx: 3,
      view: "sounding",
    });
    useStore.getState().goHome();
    await flush();

    const s = useStore.getState();
    expect(s.modelId).toBe("arome_france");
    expect(s.compare).toBe(false);
    expect(s.pins).toEqual([]);
    expect(s.day).toBeNull();
    expect(s.hourIdx).toBe(0);
    expect(s.view).toBe("windgram");
  });
});
