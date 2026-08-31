import type { AromeResponse } from "../api/types";

export type Point = { lat: number; lon: number };
export type View = "windgram" | "sounding";

export type PinState =
  | { status: "ready"; data: AromeResponse }
  | { status: "error"; message: string };
