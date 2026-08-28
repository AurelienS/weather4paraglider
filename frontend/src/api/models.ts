export type ModelDomain = {
  latMin: number;
  latMax: number;
  lonMin: number;
  lonMax: number;
};

export type ModelId =
  | "arome_france_15min"
  | "arome_france_hd"
  | "arome_france"
  | "arpege_europe"
  | "arpege_world"
  | "meteoswiss_icon_ch1"
  | "icon_d2"
  | "dmi_harmonie_arome_europe";

export type ModelDef = {
  id: ModelId;
  family: string;
  short: string;
  label: string;
  grid: string;
  days: number;
  endpoint: "meteofrance" | "forecast";
  /** Time step of the upstream series: hourly, or 15-minutely (decimated to hourly). */
  api: "hourly" | "minutely_15";
  /** Open-Meteo cache slot length in hours (drives runInitUtc and the cache key). */
  slotHours: number;
  /** Extra variables only available in the hourly block of a minutely_15 model. */
  extraHourlyVars?: readonly string[];
  aglHeights: readonly number[];
  pressureLevels: readonly number[];
  domain: ModelDomain;
};

const AROME_DOMAIN: ModelDomain = {
  latMin: 37.5,
  latMax: 55.4,
  lonMin: -12,
  lonMax: 16,
};

const EUROPE_DOMAIN: ModelDomain = {
  latMin: 30,
  latMax: 71,
  lonMin: -25,
  lonMax: 45,
};

const WORLD_DOMAIN: ModelDomain = {
  latMin: -89,
  latMax: 89,
  lonMin: -179,
  lonMax: 179,
};

// MeteoSwiss ICON-CH1: Switzerland and the surrounding Alps / north-east France.
const CH1_DOMAIN: ModelDomain = {
  latMin: 42.3,
  latMax: 49.8,
  lonMin: 1.1,
  lonMax: 14.5,
};

// DWD ICON-D2: Germany, the Alps and most of France (not the far south-east coast).
const D2_DOMAIN: ModelDomain = {
  latMin: 43,
  latMax: 56.5,
  lonMin: -5,
  lonMax: 17,
};

// DMI HARMONIE AROME Europe.
const DMI_DOMAIN: ModelDomain = {
  latMin: 34,
  latMax: 66,
  lonMin: -11,
  lonMax: 32,
};

export const MODELS: readonly ModelDef[] = [
  {
    id: "arome_france_15min",
    family: "AROME",
    short: "AROME 15 min",
    label: "AROME 15 min nowcast",
    grid: "0.025°",
    days: 2,
    endpoint: "meteofrance",
    api: "minutely_15",
    slotHours: 1,
    extraHourlyVars: ["cloud_cover_mid", "cloud_cover_high"],
    aglHeights: [20, 50, 100],
    pressureLevels: [],
    domain: AROME_DOMAIN,
  },
  {
    id: "arome_france_hd",
    family: "AROME",
    short: "AROME HD",
    label: "AROME France HD 1.3 km",
    grid: "0.01°",
    days: 2,
    endpoint: "meteofrance",
    api: "hourly",
    slotHours: 3,
    aglHeights: [20, 50, 80, 100],
    pressureLevels: [],
    domain: AROME_DOMAIN,
  },
  {
    id: "arome_france",
    family: "AROME",
    short: "AROME 2.5 km",
    label: "AROME France 2.5 km",
    grid: "0.025°",
    days: 3,
    endpoint: "meteofrance",
    api: "hourly",
    slotHours: 3,
    aglHeights: [20, 50, 80, 100, 120, 150, 180, 200],
    pressureLevels: [1000, 950, 925, 900, 850, 800, 750, 700, 650, 600, 550, 500],
    domain: AROME_DOMAIN,
  },
  {
    id: "arpege_europe",
    family: "ARPEGE",
    short: "ARPEGE EU",
    label: "ARPEGE Europe 11 km",
    grid: "0.1°",
    days: 4,
    endpoint: "meteofrance",
    api: "hourly",
    slotHours: 3,
    aglHeights: [20, 50, 80, 100, 120, 150, 180, 200],
    pressureLevels: [1000, 950, 925, 900, 850, 800, 750, 700, 650, 600, 550, 500],
    domain: EUROPE_DOMAIN,
  },
  {
    id: "arpege_world",
    family: "ARPEGE",
    short: "ARPEGE World",
    label: "ARPEGE World 25 km",
    grid: "0.25°",
    days: 4,
    endpoint: "meteofrance",
    api: "hourly",
    slotHours: 3,
    aglHeights: [20, 50, 80, 100, 120, 150, 180, 200],
    pressureLevels: [1000, 950, 925, 900, 850, 800, 750, 700, 650, 600, 550, 500],
    domain: WORLD_DOMAIN,
  },
  {
    id: "meteoswiss_icon_ch1",
    family: "MeteoSwiss",
    short: "ICON CH1",
    label: "MeteoSwiss ICON CH1 1 km",
    grid: "1 km",
    days: 5,
    endpoint: "forecast",
    api: "hourly",
    slotHours: 3,
    aglHeights: [],
    pressureLevels: [],
    domain: CH1_DOMAIN,
  },
  {
    id: "icon_d2",
    family: "ICON",
    short: "ICON D2",
    label: "DWD ICON D2 2.2 km",
    grid: "2.2 km",
    days: 2,
    endpoint: "forecast",
    api: "hourly",
    slotHours: 3,
    aglHeights: [80, 100, 120, 180, 200],
    pressureLevels: [1000, 975, 950, 925, 900, 850, 800, 700, 600, 500],
    domain: D2_DOMAIN,
  },
  {
    id: "dmi_harmonie_arome_europe",
    family: "HARMONIE",
    short: "HARMONIE",
    label: "DMI HARMONIE AROME Europe 2.5 km",
    grid: "2.5 km",
    days: 2,
    endpoint: "forecast",
    api: "hourly",
    slotHours: 3,
    aglHeights: [50, 80, 100, 120, 150],
    pressureLevels: [1000, 950, 925, 900, 850],
    domain: DMI_DOMAIN,
  },
];

export const DEFAULT_MODEL: ModelId = "arome_france";

export function isModelId(value: unknown): value is ModelId {
  return MODELS.some((m) => m.id === value);
}

export function modelById(id: ModelId): ModelDef {
  return MODELS.find((m) => m.id === id) ?? MODELS[2]!;
}

export function isGlobalDomain(d: ModelDomain): boolean {
  return d.lonMax - d.lonMin >= 350;
}

export function inModelDomain(lat: number, lon: number, d: ModelDomain): boolean {
  return (
    lat >= d.latMin && lat <= d.latMax && lon >= d.lonMin && lon <= d.lonMax
  );
}

export function apiVarsFor(model: ModelDef): string[] {
  if (model.api === "minutely_15") {
    const vars: string[] = [
      "temperature_2m",
      "relative_humidity_2m",
      "dew_point_2m",
      "wind_speed_10m",
      "wind_direction_10m",
      "wind_gusts_10m",
      "cape",
      "precipitation",
      "cloud_cover_low",
      "surface_pressure",
    ];
    for (const h of model.aglHeights) {
      vars.push(`wind_speed_${h}m`, `wind_direction_${h}m`);
    }
    return vars;
  }
  const vars: string[] = [
    "temperature_2m",
    "relative_humidity_2m",
    "dew_point_2m",
    "wind_speed_10m",
    "wind_direction_10m",
    "wind_gusts_10m",
    "cape",
    "precipitation",
    "cloud_cover_low",
    "cloud_cover_mid",
    "cloud_cover_high",
    "surface_pressure",
  ];
  for (const h of model.aglHeights) {
    vars.push(`temperature_${h}m`, `wind_speed_${h}m`, `wind_direction_${h}m`);
  }
  for (const p of model.pressureLevels) {
    vars.push(
      `temperature_${p}hPa`,
      `dew_point_${p}hPa`,
      `relative_humidity_${p}hPa`,
      `cloud_cover_${p}hPa`,
      `wind_speed_${p}hPa`,
      `wind_direction_${p}hPa`,
      `geopotential_height_${p}hPa`,
    );
  }
  return vars;
}

export function allHourlyVars(): string[] {
  const vars = new Set<string>();
  for (const m of MODELS) {
    for (const v of apiVarsFor(m)) vars.add(v);
    for (const v of m.extraHourlyVars ?? []) vars.add(v);
  }
  return [...vars];
}
