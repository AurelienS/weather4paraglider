"""Client Open-Meteo — AROME France 0.025° uniquement (pas de seamless, pas de HD)."""

from __future__ import annotations

import logging
from typing import Any

import httpx

logger = logging.getLogger(__name__)

OPENMETEO_URL = "https://api.open-meteo.com/v1/meteofrance"
OM_MODEL = "arome_france"
OM_GRID = "0.025"

# Niveaux AGL exposés par Open-Meteo pour AROME 0.025 (pas le HD).
HEIGHT_AGL_M: tuple[int, ...] = (20, 50, 100, 150, 200)
# Jusqu'à ~500 hPa (~5.6 km) pour un Stüve 5000 m AMSL.
PRESSURE_HPA: tuple[int, ...] = (
    1000,
    950,
    925,
    900,
    850,
    800,
    750,
    700,
    650,
    600,
    550,
    500,
)


def _hourly_vars() -> list[str]:
    vars_: list[str] = [
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
    ]
    for h in HEIGHT_AGL_M:
        vars_.extend(
            (
                f"temperature_{h}m",
                f"wind_speed_{h}m",
                f"wind_direction_{h}m",
            )
        )
    for p in PRESSURE_HPA:
        vars_.extend(
            (
                f"temperature_{p}hPa",
                f"dew_point_{p}hPa",
                f"relative_humidity_{p}hPa",
                f"cloud_cover_{p}hPa",
                f"wind_speed_{p}hPa",
                f"wind_direction_{p}hPa",
                f"geopotential_height_{p}hPa",
            )
        )
    return vars_


class OpenMeteoError(RuntimeError):
    pass


class OpenMeteoClient:
    def __init__(self, timeout_s: float = 30.0) -> None:
        self._timeout = timeout_s

    def fetch(self, lat: float, lon: float, *, forecast_days: int = 2) -> dict[str, Any]:
        params: dict[str, Any] = {
            "latitude": f"{lat:.5f}",
            "longitude": f"{lon:.5f}",
            "hourly": ",".join(_hourly_vars()),
            "models": OM_MODEL,
            "forecast_days": forecast_days,
            "timezone": "Europe/Paris",
            "wind_speed_unit": "kmh",
            "temperature_unit": "celsius",
            "cell_selection": "nearest",
            "elevation": "nan",
        }
        logger.info("Open-Meteo GET models=%s lat=%s lon=%s", OM_MODEL, lat, lon)
        with httpx.Client(timeout=self._timeout, follow_redirects=True) as client:
            resp = client.get(OPENMETEO_URL, params=params)
            if resp.status_code >= 400:
                raise OpenMeteoError(f"Open-Meteo HTTP {resp.status_code}: {resp.text[:400]}")
            payload = resp.json()
        if payload.get("error"):
            raise OpenMeteoError(str(payload.get("reason") or payload))
        return payload
