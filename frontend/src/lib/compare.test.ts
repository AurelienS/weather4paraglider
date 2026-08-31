import { describe, expect, test } from "vitest";
import { encodeBoard, parseBoard, type CompareEntry } from "./compare";

const place = (lat: number, lon: number, name?: string): CompareEntry => ({
  kind: "place",
  lat,
  lon,
  name,
});
const model = (id: string): CompareEntry => ({ kind: "model", modelId: id as never });

describe("encodeBoard / parseBoard", () => {
  test("a mixed board round-trips with its order intact", () => {
    const board: CompareEntry[] = [
      place(45.945, 6.71, "Passy"),
      model("icon_d2"),
      place(46.1, 6.2),
      model("meteoswiss_icon_ch1"),
    ];
    const raw = encodeBoard(board);
    expect(raw).toBe(
      "45.9450,6.7100/Passy;model:icon_d2;46.1000,6.2000;model:meteoswiss_icon_ch1",
    );
    expect(parseBoard(raw)).toEqual(board);
  });

  test("plain place-only strings still parse (old shared URLs)", () => {
    expect(parseBoard("45.92,6.87/Plaine%20Joux;46.1,6.2")).toEqual([
      place(45.92, 6.87, "Plaine Joux"),
      place(46.1, 6.2),
    ]);
    expect(parseBoard(null)).toEqual([]);
  });

  test("unknown model ids and malformed segments are dropped", () => {
    const out = parseBoard("model:not-a-model;model:icon_d2;not-a-segment");
    expect(out).toEqual([model("icon_d2")]);
  });

  test("the board is capped", () => {
    const raw = Array.from({ length: 8 }, () => "model:icon_d2").join(";");
    expect(parseBoard(raw)).toHaveLength(6);
  });

  test("names are re-encoded and decoded", () => {
    const first = parseBoard("45.92,6.87/Plaine%20Joux")[0];
    expect(first && first.kind === "place" ? first.name : undefined).toBe(
      "Plaine Joux",
    );
  });
});
