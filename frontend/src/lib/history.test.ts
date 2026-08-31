import { describe, expect, test } from "vitest";
import {
  boardLabel,
  MAX_HISTORY,
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
  test("accepts a well-formed payload", () => {
    const payload = [
      { id: "a", at: 1000, label: "Plaine Joux +1", entries: [place(1, 2), place(3, 4)] },
    ];
    expect(parseHistory(payload)).toEqual(payload);
    expect(parseHistory(JSON.parse(JSON.stringify(payload)))).toEqual(payload);
  });

  test("rejects malformed payloads entirely", () => {
    expect(parseHistory(null)).toBeNull();
    expect(parseHistory({})).toBeNull();
    expect(parseHistory([42])).toBeNull();
    expect(parseHistory([
      { id: "a", at: 1000, label: "ok", entries: [] },
      { id: "b", at: "nope", label: "bad", entries: [] },
    ])).toBeNull();
  });
});
