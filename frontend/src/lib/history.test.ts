import { describe, expect, test } from "vitest";
import {
  boardLabel,
  MAX_HISTORY,
  migrateHistoryV1,
  modelBoardLabel,
  parseHistory,
  recordComparison,
  sameBoard,
  type SavedCompare,
} from "./history";
import type { ModelId } from "../api/models";
import type { CompareEntry } from "./compare";

const place = (lat: number, lon: number, name?: string): CompareEntry => ({
  kind: "place",
  lat,
  lon,
  name,
});
const model = (modelId: ModelId): CompareEntry => ({ kind: "model", modelId });

describe("sameBoard", () => {
  test("same key sets match regardless of order or names", () => {
    expect(sameBoard([place(1, 2, "A")], [place(1, 2, "B")])).toBe(true);
    expect(sameBoard([place(1, 2), place(3, 4)], [place(3, 4), place(1, 2)])).toBe(true);
    expect(sameBoard([place(1, 2)], [place(1, 3)])).toBe(false);
    expect(sameBoard([place(1, 2)], [place(1, 2), place(3, 4)])).toBe(false);
    expect(sameBoard([place(1, 2)], [model("arpege_europe")])).toBe(false);
  });
});

describe("boardLabel", () => {
  test("first place name plus the count of other entries", () => {
    expect(boardLabel([place(46, 7, "Plaine Joux"), place(1, 2)])).toBe("Plaine Joux +1");
    expect(boardLabel([place(46, 7, "Plaine Joux"), place(1, 2), model("arpege_europe")])).toBe(
      "Plaine Joux +2",
    );
  });

  test("single board keeps the bare name", () => {
    expect(boardLabel([place(46, 7, "Plaine Joux")])).toBe("Plaine Joux");
  });

  test("unnamed places fall back to coordinates", () => {
    expect(boardLabel([place(46, 7)])).toBe("46.0000,7.0000");
  });
});

describe("recordComparison", () => {
  test("saves boards with at least two entries", () => {
    expect(recordComparison([], [place(1, 2)])).toEqual([]);
    const list = recordComparison([], [place(1, 2), place(3, 4)]);
    expect(list).toHaveLength(1);
    expect(list[0]?.entries).toHaveLength(2);
  });
  test("a board identical to a previous one moves to the front", () => {
    const board = [place(1, 2), place(3, 4)];
    let list = recordComparison([], board, 1000);
    list = recordComparison([], [place(5, 6), place(7, 8)], 2000);
    list = recordComparison(list, board, 3000);
    expect(list).toHaveLength(2);
    expect(list[0]?.at).toBe(3000);
    expect(list[0]?.entries).toEqual(board);
  });

  test("the list is capped", () => {
    let list: SavedCompare[] = [];
    for (let i = 0; i < MAX_HISTORY + 3; i++) {
      list = recordComparison(list, [place(i, i), place(999, 999)], i * 1000);
    }
    expect(list).toHaveLength(MAX_HISTORY);
    expect(list[0]?.at).toBe((MAX_HISTORY + 2) * 1000);
  });
});

describe("parseHistory", () => {
  test("accepts a well-formed v2 payload", () => {
    const payload = [
      {
        id: "a",
        at: 1000,
        label: "Plaine Joux +1",
        mode: "place",
        entries: [place(1, 2), place(3, 4)],
      },
      {
        id: "b",
        at: 2000,
        label: "Chamonix · ICON D2 +1",
        mode: "model",
        point: { lat: 45.9231, lon: 6.8692 },
        entries: [model("icon_d2"), model("arpege_europe")],
      },
    ];
    expect(parseHistory(payload)).toEqual(payload);
    expect(parseHistory(JSON.parse(JSON.stringify(payload)))).toEqual(payload);
  });

  test("rejects malformed payloads entirely", () => {
    expect(parseHistory(null)).toBeNull();
    expect(parseHistory({})).toBeNull();
    expect(parseHistory([42])).toBeNull();
    // v1 payloads without a mode are rejected: they migrate instead
    expect(
      parseHistory([{ id: "a", at: 1000, label: "ok", entries: [] }]),
    ).toBeNull();
    expect(
      parseHistory([
        { id: "a", at: 1000, label: "ok", mode: "place", entries: [] },
        { id: "b", at: "nope", label: "bad", mode: "place", entries: [] },
      ]),
    ).toBeNull();
  });

  test("migrateHistoryV1 tags every entry as a place comparison", () => {
    const v1 = [{ id: "a", at: 1000, label: "Plaine Joux +1", entries: [place(1, 2)] }];
    expect(migrateHistoryV1(v1)).toEqual([
      { ...v1[0]!, mode: "place" },
    ]);
    expect(migrateHistoryV1("junk")).toBeNull();
  });
});

describe("modelBoardLabel", () => {
  test("labels after the place and the first model", () => {
    expect(modelBoardLabel("Chamonix", undefined, [model("icon_d2")])).toBe(
      "Chamonix · ICON D2",
    );
    expect(
      modelBoardLabel(null, { lat: 45.9231, lon: 6.8692 }, [
        model("icon_d2"),
        model("arpege_europe"),
      ]),
    ).toBe("45.9231,6.8692 · ICON D2 +1");
  });
});

describe("recordComparison (model boards)", () => {
  test("stores the mode and the place the board was opened at", () => {
    const list = recordComparison(
      [],
      [model("icon_d2"), model("arpege_europe")],
      1000,
      { mode: "model", point: { lat: 45.9231, lon: 6.8692 }, place: "Chamonix" },
    );
    expect(list).toHaveLength(1);
    expect(list[0]?.mode).toBe("model");
    expect(list[0]?.point).toEqual({ lat: 45.9231, lon: 6.8692 });
    expect(list[0]?.label).toBe("Chamonix · ICON D2 +1");
  });

  test("place boards stay mode place without a point", () => {
    const list = recordComparison([], [place(1, 2), place(3, 4)], 1000);
    expect(list[0]?.mode).toBe("place");
    expect(list[0]?.point).toBeUndefined();
  });
});
