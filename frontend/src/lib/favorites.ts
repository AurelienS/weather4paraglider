export type Favorite = {
  lat: number;
  lon: number;
  label: string;
};

export const DEFAULT_FAVORITES: Favorite[] = [
  { lat: 45.945, lon: 6.71, label: "Aravis" },
  { lat: 45.9226, lon: 6.8665, label: "Chamonix – Planpraz" },
  { lat: 45.8992, lon: 6.1289, label: "Annecy" },
  { lat: 45.309, lon: 5.884, label: "Saint-Hilaire-du-Touvet" },
  { lat: 45.09, lon: 6.03, label: "Bourg-d'Oisans" },
  { lat: 45.7726, lon: 2.9646, label: "Puy de Dôme" },
  { lat: 44.1739, lon: 5.2764, label: "Mont Ventoux" },
  { lat: 44.0996, lon: 3.0819, label: "Millau" },
  { lat: 43.6786, lon: 6.9762, label: "Gourdon (06)" },
  { lat: 43.9736, lon: 6.4397, label: "Saint-André-les-Alpes" },
];

const KEY = "w4p.favorites.v1";

export function loadFavorites(): Favorite[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw == null) return DEFAULT_FAVORITES;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_FAVORITES;
    const list: Favorite[] = [];
    for (const item of parsed) {
      if (item == null || typeof item !== "object") continue;
      const rec = item as Record<string, unknown>;
      if (typeof rec.lat !== "number" || typeof rec.lon !== "number") continue;
      list.push({
        lat: rec.lat,
        lon: rec.lon,
        label:
          typeof rec.label === "string" && rec.label.trim()
            ? rec.label
            : `${rec.lat.toFixed(4)}, ${rec.lon.toFixed(4)}`,
      });
    }
    return list;
  } catch {
    return DEFAULT_FAVORITES;
  }
}

export function storeFavorites(list: Favorite[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    return;
  }
}
