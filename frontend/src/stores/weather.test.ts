import { beforeEach, describe, expect, test, vi } from "vitest";
import type { AromeResponse, Hour } from "../api/types";

vi.mock("../api/client", () => ({ fetchArome: vi.fn() }));

import { fetchArome } from "../api/client";
import { useStore } from "./index";

const fetchAromeMock = vi.mocked(fetchArome);

const JAN_FIRST = "2030-01-01";

function hour(time: string): Hour {
  return {
    time,
    surface: {
      t2m: 10,
      rh2m: 50,
      wind10: 5,
      dir10: 270,
      gust10: 8,
      cape: 0,
      precip: 0,
      cloudLow: 0,
      cloudMid: 0,
      cloudHigh: 0,
      cloudBaseM: 1500,
      psfc: 1013,
    },
    profile: [],
  };
}

/** Two display days (07:00–09:00 Paris time), day 1 and day 2. */
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
    hours: [
      hour(`${JAN_FIRST}T07:00:00+01:00`),
      hour(`${JAN_FIRST}T08:00:00+01:00`),
      hour(`${JAN_FIRST}T09:00:00+01:00`),
      hour("2030-01-02T07:00:00+01:00"),
      hour("2030-01-02T08:00:00+01:00"),
    ],
    warnings: [],
    attribution: "test",
  };
}

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  vi.clearAllMocks();
  fetchAromeMock.mockResolvedValue(payload());
  useStore.setState({
    point: { lat: 45, lon: 6 },
    modelId: "arome_france",
    lang: "en",
    data: null,
    error: null,
    loading: true,
    day: null,
    hourIdx: 0,
    activeZ: null,
    view: "windgram",
    compare: false,
    entries: [],
    entryStates: {},
  });
});

describe("weather.loadMain", () => {
  test("success stores the payload and picks a default selection", async () => {
    useStore.setState({ activeZ: 42 });
    useStore.getState().loadMain();
    await flush();

    const s = useStore.getState();
    expect(s.data).not.toBeNull();
    expect(s.loading).toBe(false);
    expect(s.error).toBeNull();
    expect(s.day).toBe(JAN_FIRST);
    // every hour lies in the future: pickDefaultHour keeps the first one
    expect(s.hourIdx).toBe(0);
    // the sounding highlight is reset on load
    expect(s.activeZ).toBeNull();
    expect(fetchAromeMock).toHaveBeenCalledWith(45, 6, "arome_france", {
      force: undefined,
      signal: expect.any(AbortSignal),
      lang: "en",
    });
  });

  test("failure stores the message and keeps the old data", async () => {
    useStore.setState({ data: payload(), loading: false });
    fetchAromeMock.mockRejectedValue(new Error("boom"));
    useStore.getState().loadMain();
    await flush();

    const s = useStore.getState();
    expect(s.error).toBe("boom");
    expect(s.loading).toBe(false);
    expect(s.data).not.toBeNull();
  });

  test("carry keeps the selected day and hour when the new data has them", async () => {
    useStore.setState({ data: payload(), day: JAN_FIRST, hourIdx: 1 });
    useStore.getState().loadMain({ carry: true });
    await flush();

    const s = useStore.getState();
    expect(s.day).toBe(JAN_FIRST);
    expect(s.hourIdx).toBe(1);
  });

  test("without carry the selection restarts from the default", async () => {
    useStore.setState({ data: payload(), day: JAN_FIRST, hourIdx: 1 });
    useStore.getState().loadMain();
    await flush();

    const s = useStore.getState();
    expect(s.day).toBe(JAN_FIRST);
    expect(s.hourIdx).toBe(0);
  });

  test("carry drops the day when the new data lacks it", async () => {
    useStore.setState({ data: payload(), day: "2030-03-15", hourIdx: 3 });
    useStore.getState().loadMain({ carry: true });
    await flush();

    const s = useStore.getState();
    expect(s.day).toBe(JAN_FIRST);
    expect(s.hourIdx).toBe(0);
  });

  test("force bypasses the cache", async () => {
    useStore.getState().loadMain({ force: true });
    await flush();
    expect(fetchAromeMock).toHaveBeenCalledWith(
      45,
      6,
      "arome_france",
      expect.objectContaining({ force: true }),
    );
  });
});

describe("weather.selectModel", () => {
  test("switching the model reloads with carry", async () => {
    useStore.getState().selectModel("arome_france_15min");
    await flush();

    const s = useStore.getState();
    expect(s.modelId).toBe("arome_france_15min");
    expect(s.loading).toBe(false);
    expect(fetchAromeMock).toHaveBeenCalledWith(
      45,
      6,
      "arome_france_15min",
      expect.objectContaining({ force: undefined }),
    );
  });

  test("selecting the same model is a no-op", () => {
    useStore.getState().selectModel("arome_france");
    expect(fetchAromeMock).not.toHaveBeenCalled();
  });
});

describe("weather.refresh", () => {
  test("forces the main load and the board loads", async () => {
    useStore.setState({
      compare: true,
      entries: [{ kind: "place", lat: 46, lon: 7 }],
    });
    useStore.getState().refresh();
    await flush();

    expect(fetchAromeMock).toHaveBeenCalledWith(
      45,
      6,
      "arome_france",
      expect.objectContaining({ force: true }),
    );
    expect(fetchAromeMock).toHaveBeenCalledWith(
      46,
      7,
      "arome_france",
      expect.objectContaining({ force: true }),
    );
  });
});
