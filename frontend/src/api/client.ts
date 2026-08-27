import type { AromeResponse } from "./types";

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export type FetchAromeOpts = {
  force?: boolean;
  signal?: AbortSignal;
};

export async function fetchArome(
  lat: number,
  lon: number,
  opts: FetchAromeOpts = {},
): Promise<AromeResponse> {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
  });
  if (opts.force) params.set("force", "true");

  const res = await fetch(`/arome?${params.toString()}`, { signal: opts.signal });
  if (!res.ok) {
    throw new ApiError(await readDetail(res), res.status);
  }
  const payload: unknown = await res.json();
  if (!isAromeResponse(payload)) {
    throw new ApiError("Réponse API inattendue", res.status);
  }
  return payload;
}

async function readDetail(res: Response): Promise<string> {
  try {
    const body: unknown = await res.json();
    if (body && typeof body === "object" && "detail" in body) {
      const detail = (body as { detail: unknown }).detail;
      if (typeof detail === "string" && detail.trim()) return detail;
      if (Array.isArray(detail)) {
        return detail
          .map((item) => {
            if (item && typeof item === "object" && "msg" in item) {
              return String((item as { msg: unknown }).msg);
            }
            return String(item);
          })
          .join(" · ");
      }
    }
  } catch {
    /* corps non JSON */
  }
  return `Erreur ${res.status}`;
}

function isAromeResponse(value: unknown): value is AromeResponse {
  if (!value || typeof value !== "object") return false;
  const rec = value as Record<string, unknown>;
  return Array.isArray(rec.hours) && typeof rec.model === "string";
}
