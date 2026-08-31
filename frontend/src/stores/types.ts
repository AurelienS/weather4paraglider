import type { AromeResponse } from "../api/types";
import type { CompareEntry } from "../lib/compare";

export type Point = { lat: number; lon: number };
export type View = "windgram" | "sounding" | "meteogram";

export type EntryState =
  | { status: "loading" }
  | { status: "ready"; data: AromeResponse }
  | { status: "error"; message: string };

export type { CompareEntry };
