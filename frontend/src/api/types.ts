export type ProfilePoint = {
  z: number;
  src: string;
  t: number | null;
  rh: number | null;
  td: number | null;
  wind: number | null;
  dir: number | null;
  cloud: number | null;
};

export type Surface = {
  t2m: number | null;
  rh2m: number | null;
  wind10: number | null;
  dir10: number | null;
  gust10: number | null;
  cape: number | null;
  precip: number | null;
  cloudLow: number | null;
  cloudMid: number | null;
  cloudHigh: number | null;
  cloudBaseM: number | null;
  psfc: number | null;
};

export type Hour = {
  time: string;
  surface: Surface;
  profile: ProfilePoint[];
};

export type AromeResponse = {
  model: string;
  grid: string;
  source: string;
  openMeteoModel?: string;
  lat: number;
  lon: number;
  modelElevationM: number;
  nearestCell: { lat: number; lon: number };
  runInitUtc: string;
  runAvailable: boolean;
  timezone: string;
  fetchedAt: string;
  hours: Hour[];
  warnings: string[];
  cloudBaseRule?: string;
  attribution: string;
};
