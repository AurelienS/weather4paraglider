import { beforeEach, describe, expect, test, vi } from "vitest";
import type { AromeResponse } from "../api/types";
import type { EntryState } from "./types";

vi.mock("../api/client", () => ({ fetchArome: vi.fn() }));

import { fetchArome } from "../api/client";
import { useStore } from "./index";
import { entryKey } from "../lib/compare";

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
    modelId: "arome_france",
    data: null,
    error: null,
    loading: true,
    compare: false,
    entries: [],
    entryStates: {},
    compareMode: "place",
    history: [],
  });
});

describe("compare.toggleCompare", () => {
  test("entering compare mode pins the current place", async () => {
    useStore.getState().toggleCompare(true);
    await flush();

    const s = useStore.getState();
    expect(s.compare).toBe(true);
    expect(s.entries).toEqual([
      { kind: "place", lat: 45.8992, lon: 6.1294, name: "Annecy" },
    ]);
    // the current place was served by the main load: no extra call
    expect(fetchAromeMock).toHaveBeenCalledTimes(1);
    expect(fetchAromeMock).toHaveBeenCalledWith(
      45.8992,
      6.1294,
      "arome_france",
      expect.anything(),
    );
  });

  test("entering compare mode with the place already pinned keeps the board", async () => {
    useStore.setState({ entries: [{ kind: "place", lat: 45.8992, lon: 6.1294 }] });
    useStore.getState().toggleCompare(true);
    await flush();

    expect(useStore.getState().entries).toEqual([
      { kind: "place", lat: 45.8992, lon: 6.1294 },
    ]);
    expect(useStore.getState().compare).toBe(true);
  });

  test("leaving compare mode discards the board and its states", () => {
    useStore.setState({
      compare: true,
      entries: [{ kind: "place", lat: 45.8992, lon: 6.1294 }],
      entryStates: { "place:45.8992,6.1294": { status: "ready", data: payload() } },
    });
    useStore.getState().toggleCompare(false);

    const s = useStore.getState();
    expect(s.compare).toBe(false);
    expect(s.entries).toEqual([]);
    expect(s.entryStates).toEqual({});
  });
});

describe("compare.addPlaceToBoard", () => {
  test("opening the board from a search result anchors it to the current place", async () => {
    useStore.getState().addPlaceToBoard({ lat: 46, lon: 7, name: "Sallanches" });
    await flush();

    const s = useStore.getState();
    expect(s.compare).toBe(true);
    // the added place first, the current place appended to anchor the board
    expect(s.entries).toEqual([
      { kind: "place", lat: 46, lon: 7, name: "Sallanches" },
      { kind: "place", lat: 45.8992, lon: 6.1294, name: "Annecy" },
    ]);
    expect(fetchAromeMock).toHaveBeenCalledWith(46, 7, "arome_france", expect.anything());
    expect(fetchAromeMock).toHaveBeenCalledWith(
      45.8992,
      6.1294,
      "arome_france",
      expect.anything(),
    );
  });

  test("re-adding the same place replaces it and keeps one state", async () => {
    useStore.getState().addPlaceToBoard({ lat: 46, lon: 7 });
    useStore.getState().addPlaceToBoard({ lat: 46, lon: 7, name: "Renamed" });
    await flush();

    expect(useStore.getState().entries).toEqual([
      { kind: "place", lat: 46, lon: 7, name: "Renamed" },
      { kind: "place", lat: 45.8992, lon: 6.1294, name: "Annecy" },
    ]);
  });

  test("adding to an already-open board does not re-pin the current place", async () => {
    useStore.setState({ compare: true, entries: [{ kind: "place", lat: 46, lon: 7 }] });
    useStore.getState().addPlaceToBoard({ lat: 47, lon: 8 });
    await flush();

    expect(useStore.getState().entries).toEqual([
      { kind: "place", lat: 46, lon: 7 },
      { kind: "place", lat: 47, lon: 8 },
    ]);
  });
});

describe("compare.addModelToBoard", () => {
  test("adds to the model board and fetches the current place for the model", async () => {
    useStore.setState({ compare: true, compareMode: "model" });
    useStore.getState().addModelToBoard("arpege_europe");
    await flush();

    const s = useStore.getState();
    expect(s.compare).toBe(true);
    expect(s.compareMode).toBe("model");
    expect(s.entries).toEqual([{ kind: "model", modelId: "arpege_europe" }]);
    // no place card on the model board: the place is the page context
    expect(s.entries.every((e) => e.kind === "model")).toBe(true);
    expect(fetchAromeMock).toHaveBeenCalledWith(
      45.8992,
      6.1294,
      "arpege_europe",
      expect.anything(),
    );
  });

  test("is ignored on the place board", () => {
    useStore.setState({
      compare: true,
      compareMode: "place",
      entries: [{ kind: "place", lat: 46, lon: 7 }],
    });
    useStore.getState().addModelToBoard("arpege_europe");
    expect(useStore.getState().entries).toEqual([
      { kind: "place", lat: 46, lon: 7 },
    ]);
  });

  test("toggleCompare(true, 'model') seeds the board with the selected model", async () => {
    useStore.setState({ compare: false, entries: [], modelId: "icon_d2" });
    useStore.getState().toggleCompare(true, "model");
    await flush();

    const s = useStore.getState();
    expect(s.compareMode).toBe("model");
    expect(s.entries).toEqual([{ kind: "model", modelId: "icon_d2" }]);
    expect(fetchAromeMock).toHaveBeenCalledWith(
      45.8992,
      6.1294,
      "icon_d2",
      expect.anything(),
    );
  });
});

describe("compare.removeEntry", () => {
  test("removing an entry keeps the others and drops its state", () => {
    const a = { kind: "place", lat: 45.8992, lon: 6.1294 } as const;
    const b = { kind: "place", lat: 46, lon: 7 } as const;
    useStore.setState({
      compare: true,
      entries: [a, b],
      entryStates: {
        [entryKey(a)]: { status: "ready", data: payload() },
        [entryKey(b)]: { status: "error", message: "boom" },
      },
    });
    useStore.getState().removeEntry(entryKey(b));

    const s = useStore.getState();
    expect(s.compare).toBe(true);
    expect(s.entries).toEqual([a]);
    expect(s.entryStates).toEqual({ [entryKey(a)]: { status: "ready", data: payload() } });
  });

  test("removing the last entry keeps the page open on its placeholder", () => {
    useStore.setState({
      compare: true,
      entries: [{ kind: "place", lat: 46, lon: 7 }],
    });
    useStore.getState().removeEntry("place:46.0000,7.0000");

    const s = useStore.getState();
    // an empty board is a valid state: the compare page stays open
    expect(s.compare).toBe(true);
    expect(s.entries).toEqual([]);
    expect(s.entryStates).toEqual({});
  });

  test("dismantling a real comparison below two entries records it", () => {
    useStore.setState({
      compare: true,
      entries: [
        { kind: "place", lat: 45.8992, lon: 6.1294 },
        { kind: "place", lat: 46, lon: 7 },
        { kind: "place", lat: 45.92, lon: 6.87 },
      ],
      entryStates: {},
    });
    // 3 → 2: still a comparison, nothing recorded
    useStore.getState().removeEntry("place:45.9200,6.8700");
    expect(useStore.getState().history).toEqual([]);
    // 2 → 1: the board stops being a comparison and lands in the recents
    useStore.getState().removeEntry("place:46.0000,7.0000");
    expect(useStore.getState().history).toHaveLength(1);
    expect(useStore.getState().history[0]?.label).toBe("45.8992,6.1294 +1");
  });
});

describe("compare.moveEntry", () => {
  const a = { kind: "place", lat: 45.8992, lon: 6.1294 } as const;
  const b = { kind: "place", lat: 46, lon: 7 } as const;
  const c = { kind: "place", lat: 45.92, lon: 6.87, name: "Plaine Joux" } as const;

  test("moves an entry down, keeping its loaded state", () => {
    useStore.setState({
      compare: true,
      entries: [a, b, c],
      entryStates: {
        [entryKey(a)]: { status: "ready", data: payload() },
        [entryKey(c)]: { status: "ready", data: payload() },
      },
    });
    useStore.getState().moveEntry(entryKey(a), +1);

    const s = useStore.getState();
    expect(s.entries).toEqual([b, a, c]);
    // states stay keyed by entry: no refetch, nothing lost
    expect(s.entryStates[entryKey(a)]?.status).toBe("ready");
    expect(s.entryStates[entryKey(c)]?.status).toBe("ready");
  });

  test("moves an entry up", () => {
    useStore.setState({ compare: true, entries: [a, b, c] });
    useStore.getState().moveEntry(entryKey(c), -1);
    expect(useStore.getState().entries).toEqual([a, c, b]);
  });

  test("boundaries and unknown keys leave the board untouched", () => {
    useStore.setState({ compare: true, entries: [a, b] });
    const before = useStore.getState().entries;
    useStore.getState().moveEntry(entryKey(a), -1);
    useStore.getState().moveEntry(entryKey(b), +1);
    useStore.getState().moveEntry("place:0.0000,0.0000", +1);
    expect(useStore.getState().entries).toEqual(before);
  });
});

describe("compare.clearBoard", () => {
  test("clears the board and keeps the page open on its placeholder", async () => {
    useStore.setState({
      compare: true,
      entries: [
        { kind: "place", lat: 45.8992, lon: 6.1294 },
        { kind: "place", lat: 46, lon: 7 },
      ],
      entryStates: {},
    });
    useStore.getState().clearBoard();

    const s = useStore.getState();
    // the page stays open with zero entries; only leaving it closes compare
    expect(s.compare).toBe(true);
    expect(s.entries).toEqual([]);
    // the board was a real comparison: it lands in the history
    expect(s.history).toHaveLength(1);
    expect(s.history[0]?.label).toBe("45.8992,6.1294 +1");
  });

  test("a single-place board is cleared without polluting the history", () => {
    useStore.setState({ compare: true, entries: [{ kind: "place", lat: 46, lon: 7 }] });
    useStore.getState().clearBoard();

    expect(useStore.getState().compare).toBe(true);
    expect(useStore.getState().entries).toEqual([]);
    expect(useStore.getState().history).toEqual([]);
  });

  test("a model board is recorded with its place and mode", () => {
    useStore.setState({
      compare: true,
      compareMode: "model",
      entries: [
        { kind: "model", modelId: "icon_d2" },
        { kind: "model", modelId: "arpege_europe" },
      ],
    });
    useStore.getState().clearBoard();

    const s = useStore.getState();
    expect(s.history).toHaveLength(1);
    const saved = s.history[0]!;
    expect(saved.mode).toBe("model");
    expect(saved.point).toEqual({ lat: 45.8992, lon: 6.1294 });
    expect(saved.label).toBe("Annecy · ICON D2 +1");
  });

  test("restoring a model board switches the place too", async () => {
    useStore.setState({
      compare: false,
      entries: [],
      history: [
        {
          id: "m1",
          at: 1000,
          label: "Chamonix · ICON D2 +1",
          mode: "model",
          point: { lat: 45.9231, lon: 6.8692 },
          entries: [
            { kind: "model", modelId: "icon_d2" },
            { kind: "model", modelId: "arpege_europe" },
          ],
        },
      ],
    });
    useStore.getState().restoreFromHistory("m1");
    await flush();

    const s = useStore.getState();
    expect(s.compare).toBe(true);
    expect(s.compareMode).toBe("model");
    expect(s.point).toEqual({ lat: 45.9231, lon: 6.8692 });
    expect(s.entries).toEqual([
      { kind: "model", modelId: "icon_d2" },
      { kind: "model", modelId: "arpege_europe" },
    ]);
  });
});

describe("compare.loadEntries", () => {
  test("marks entries loading, then ready", async () => {
    useStore.setState({
      compare: true,
      entries: [
        { kind: "place", lat: 46, lon: 7 },
        { kind: "model", modelId: "arpege_europe" },
      ],
    });
    const resolvers: Array<(p: AromeResponse) => void> = [];
    fetchAromeMock.mockImplementation(
      () => new Promise<AromeResponse>((resolve) => resolvers.push(resolve)),
    );
    useStore.getState().loadEntries();

    // loading is set synchronously for entries with nothing on screen
    const states = useStore.getState().entryStates;
    expect(states["place:46.0000,7.0000"]?.status).toBe("loading");
    expect(states["model:arpege_europe"]?.status).toBe("loading");

    for (const resolve of resolvers) resolve(payload());
    await flush();
    expect(useStore.getState().entryStates["place:46.0000,7.0000"]?.status).toBe("ready");
  });

  test("keeps displayed data on screen while reloading (no layout shift)", async () => {
    const ready: EntryState = { status: "ready", data: payload() };
    useStore.setState({
      compare: true,
      compareMode: "model",
      entries: [
        { kind: "model", modelId: "arome_france" },
        { kind: "model", modelId: "icon_d2" },
      ],
      entryStates: { "model:arome_france": ready },
    });
    fetchAromeMock.mockImplementation(
      () => new Promise<AromeResponse>(() => {}),
    );
    useStore.getState().setModelBoardPlace({ lat: 45.8992, lon: 6.1294 });

    // the card with data stays ready; only the unknown one is loading
    const states = useStore.getState().entryStates;
    expect(states["model:arome_france"]?.status).toBe("ready");
    expect(states["model:icon_d2"]?.status).toBe("loading");
    expect(useStore.getState().point).toEqual({ lat: 45.8992, lon: 6.1294 });
  });

  test("a failing entry stores an inline error, not a global banner", async () => {
    useStore.setState({ compare: true, entries: [{ kind: "place", lat: 46, lon: 7 }] });
    fetchAromeMock.mockRejectedValueOnce(new Error("quota"));
    useStore.getState().loadEntries();
    await flush();

    const states = useStore.getState().entryStates;
    expect(states["place:46.0000,7.0000"]).toEqual({ status: "error", message: "quota" });
    expect(useStore.getState().error).toBeNull();
  });

  test("does nothing outside compare mode", async () => {
    useStore.setState({ entries: [{ kind: "place", lat: 46, lon: 7 }] });
    useStore.getState().loadEntries();
    await flush();
    expect(fetchAromeMock).not.toHaveBeenCalled();
    expect(useStore.getState().entryStates).toEqual({});
  });

  test("force bypasses the cache", async () => {
    useStore.setState({ compare: true, entries: [{ kind: "place", lat: 46, lon: 7 }] });
    useStore.getState().loadEntries({ force: true });
    await flush();
    expect(fetchAromeMock).toHaveBeenCalledWith(
      46,
      7,
      "arome_france",
      expect.objectContaining({ force: true }),
    );
  });

  test("model entries fetch the current place with their own model", async () => {
    useStore.setState({
      compare: true,
      compareMode: "model",
      entries: [{ kind: "model", modelId: "icon_d2" }],
    });
    useStore.getState().loadEntries({ force: true });
    await flush();
    expect(fetchAromeMock).toHaveBeenCalledWith(
      45.8992,
      6.1294,
      "icon_d2",
      expect.objectContaining({ force: true }),
    );
  });
});
