"""Configuration runtime et constantes du domaine AROME 0.01°."""

from __future__ import annotations

import os
from dataclasses import dataclass
from datetime import timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

from dotenv import load_dotenv

# Toujours le .env du projet, pas celui du cwd.
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

TIMEZONE = ZoneInfo("Europe/Paris")
UTC = ZoneInfo("UTC")

# Grille EURW1S100 — AROME 0.01° (~1.3 km)
GRID_DEG = 0.01
DOMAIN_LAT = (37.5, 55.4)
DOMAIN_LON = (-12.0, 16.0)
SUBSET_PAD_DEG = 0.02
POINT_ROUND_DEG = 0.01

RUN_HOURS_UTC: tuple[int, ...] = (0, 3, 6, 9, 12, 15, 18, 21)
MAX_LEAD_HOURS = 51

# Délais de publication officiels (run + délai = première dispo)
RUN_AVAILABILITY_DELAY: dict[int, timedelta] = {
    0: timedelta(hours=2, minutes=45),
    3: timedelta(hours=2, minutes=45),
    6: timedelta(hours=5, minutes=5),
    9: timedelta(hours=3, minutes=30),
    12: timedelta(hours=3, minutes=45),
    15: timedelta(hours=3, minutes=10),
    18: timedelta(hours=4, minutes=45),
    21: timedelta(hours=3, minutes=30),
}

HEIGHT_LEVELS_M: tuple[int, ...] = (
    10,
    20,
    50,
    100,
    200,
    500,
    750,
    1000,
    1500,
    2000,
    2500,
    3000,
)
PRESSURE_LEVELS_HPA: tuple[int, ...] = (850, 800, 750, 700, 650, 600, 550, 500)

PROFILE_Z_MAX_M = 6000.0
MERGE_MIN_DZ_M = 80.0
CLOUD_BASE_RH = 90.0
CLOUD_BASE_FRACT = 50.0

WCS_BASE = "https://public-api.meteofrance.fr/public"
WCS_PRODUCT = "arome/1.0/wcs/MF-NWP-HIGHRES-AROME-001-FRANCE-WCS"
WCS_VERSION = "2.0.1"
TOKEN_URL = "https://portail-api.meteofrance.fr/token"

DATAGOUV_DATASET = "paquets-arome-resolution-0-01deg"
DATAGOUV_API = f"https://www.data.gouv.fr/api/1/datasets/{DATAGOUV_DATASET}/"

G = 9.80665
WCS_RATE_PER_MIN = 45
WCS_MAX_WORKERS = 4
CAPABILITIES_TTL_S = 180.0


@dataclass(frozen=True, slots=True)
class Settings:
    application_id: str
    api_key: str | None
    cache_dir: Path
    datagouv_fallback: bool
    wcs_timeout_s: float = 120.0
    token_timeout_s: float = 15.0


def _first_env(*names: str) -> str:
    for name in names:
        value = os.environ.get(name, "").strip().strip('"').strip("'")
        if value:
            return value
    return ""


def load_settings() -> Settings:
    app_id = _first_env("METEOFRANCE_APPLICATION_ID", "APPLICATION_ID")
    # Clé API = plus simple (header apikey, pas de refresh OAuth).
    api_key = _first_env(
        "AROME_API_KEY",
        "METEOFRANCE_API_KEY",
        "METEOFRANCE_TOKEN",
        "API_KEY",
    ) or None
    cache_dir = Path(os.environ.get("CACHE_DIR", "data/cache"))
    fallback = os.environ.get("DATAGOUV_FALLBACK", "true").strip().lower() in {
        "1",
        "true",
        "yes",
        "on",
    }
    cache_dir.mkdir(parents=True, exist_ok=True)
    return Settings(
        application_id=app_id,
        api_key=api_key,
        cache_dir=cache_dir,
        datagouv_fallback=fallback,
    )


def in_arome_domain(lat: float, lon: float) -> bool:
    return DOMAIN_LAT[0] <= lat <= DOMAIN_LAT[1] and DOMAIN_LON[0] <= lon <= DOMAIN_LON[1]


def round_point(lat: float, lon: float) -> tuple[float, float]:
    """Arrondit à 0.01° pour partager le cache entre clics proches."""
    rlat = round(lat / POINT_ROUND_DEG) * POINT_ROUND_DEG
    rlon = round(lon / POINT_ROUND_DEG) * POINT_ROUND_DEG
    return round(rlat, 4), round(rlon, 4)


def subset_bbox(lat: float, lon: float) -> tuple[float, float, float, float]:
    """Bbox minuscule autour du point (interdit : France entière)."""
    return (
        lat - SUBSET_PAD_DEG,
        lat + SUBSET_PAD_DEG,
        lon - SUBSET_PAD_DEG,
        lon + SUBSET_PAD_DEG,
    )
