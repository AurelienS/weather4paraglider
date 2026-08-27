"""Orchestration : Open-Meteo AROME 0.025°, cache JSON, profil Stüve."""

from __future__ import annotations

import logging
import math
import time
from datetime import datetime, timezone
from typing import Any

from src.cache import PointCache
from src.config import (
    TIMEZONE,
    Settings,
    in_arome_domain,
    load_settings,
    round_point,
)
from src.openmeteo import HEIGHT_AGL_M, OM_GRID, OM_MODEL, PRESSURE_HPA, OpenMeteoClient
from src.profile import (
    CLOUD_BASE_RULE,
    HourBlock,
    ProfilePoint,
    SurfaceBlock,
    estimate_cloud_base,
    fuse_profile,
)

logger = logging.getLogger(__name__)


def _f(value: Any) -> float | None:
    if value is None:
        return None
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    if math.isnan(number) or math.isinf(number):
        return None
    return number


def _r1(x: float | None) -> float | None:
    return None if x is None else round(x, 1)


def _ri(x: float | None) -> int | None:
    return None if x is None else int(round(x))


def cache_slot_utc(now: datetime | None = None) -> str:
    """Slot 3 h (cycle AROME), pour invalider le cache — pas l'heure d'init MF."""
    utc = (now or datetime.now(timezone.utc)).astimezone(timezone.utc)
    hour = (utc.hour // 3) * 3
    return utc.replace(hour=hour, minute=0, second=0, microsecond=0).strftime(
        "%Y-%m-%dT%H:%M:%SZ"
    )


class AromePipeline:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or load_settings()
        self.om = OpenMeteoClient()
        self.cache = PointCache(self.settings.cache_dir)

    def forecast(
        self,
        lat: float,
        lon: float,
        *,
        time_from: datetime | None = None,
        time_to: datetime | None = None,
        force: bool = False,
    ) -> dict[str, Any]:
        if not in_arome_domain(lat, lon):
            raise ValueError(
                f"Point ({lat}, {lon}) hors domaine AROME "
                f"lat 37.5–55.4 N, lon 12 W–16 E"
            )
        rlat, rlon = round_point(lat, lon)
        window_from, window_to = resolve_window(time_from, time_to)
        slot = cache_slot_utc()
        wf = window_from.isoformat()
        wt = window_to.isoformat()

        t0 = time.perf_counter()
        if not force:
            cached = self.cache.read(rlat, rlon, slot, wf, wt)
            if cached is not None:
                logger.info("cache hit Open-Meteo %.0f ms", (time.perf_counter() - t0) * 1000)
                return cached

        lock = self.cache.lock(rlat, rlon, slot, wf, wt)
        with lock:
            if not force:
                cached = self.cache.read(rlat, rlon, slot, wf, wt)
                if cached is not None:
                    return cached
            raw = self.om.fetch(lat, lon, forecast_days=3)
            payload = assemble_response(
                lat=lat,
                lon=lon,
                raw=raw,
                window_from=window_from,
                window_to=window_to,
                slot=slot,
            )
            self.cache.write(rlat, rlon, slot, wf, wt, payload)

        logger.info(
            "Open-Meteo extract %.0f ms | %s heures",
            (time.perf_counter() - t0) * 1000,
            len(payload.get("hours", [])),
        )
        return payload


def assemble_response(
    *,
    lat: float,
    lon: float,
    raw: dict[str, Any],
    window_from: datetime,
    window_to: datetime,
    slot: str,
) -> dict[str, Any]:
    hourly: dict[str, Any] = raw.get("hourly") or {}
    times_raw = hourly.get("time") or []
    elev = _f(raw.get("elevation")) or 0.0
    nearest_lat = _f(raw.get("latitude"))
    nearest_lon = _f(raw.get("longitude"))
    warnings: list[str] = [
        "source=open-meteo models=arome_france (0.025°). Pas de seamless, pas de HD, pas d'ARPEGE.",
        "runInitUtc = slot cache 3 h Open-Meteo, pas l'heure d'init du run Météo-France.",
        "Td isobare : Open-Meteo le dérive de T+HU. Td AGL hors 2 m : null (non publié).",
        CLOUD_BASE_RULE,
    ]

    hours: list[HourBlock] = []
    for i, ts in enumerate(times_raw):
        when = _parse_om_time(str(ts))
        if when < window_from or when > window_to:
            continue
        heights = _height_points(hourly, i, elev)
        isobars = _isobar_points(hourly, i)
        profile = fuse_profile(heights, isobars, elev)
        surface = SurfaceBlock(
            t2m=_r1(_f(_at(hourly, "temperature_2m", i))),
            rh2m=_ri(_f(_at(hourly, "relative_humidity_2m", i))),
            wind10=_ri(_f(_at(hourly, "wind_speed_10m", i))),
            dir10=_ri(_f(_at(hourly, "wind_direction_10m", i))),
            gust10=_ri(_f(_at(hourly, "wind_gusts_10m", i))),
            cape=_ri(_f(_at(hourly, "cape", i))),
            precip=_r1(_f(_at(hourly, "precipitation", i))),
            cloudLow=_ri(_f(_at(hourly, "cloud_cover_low", i))),
            cloudMid=_ri(_f(_at(hourly, "cloud_cover_mid", i))),
            cloudHigh=_ri(_f(_at(hourly, "cloud_cover_high", i))),
            cloudBaseM=estimate_cloud_base(profile),
            psfc=_r1(_f(_at(hourly, "surface_pressure", i))),
        )
        hours.append(HourBlock(time=when, surface=surface, profile=profile))

    return {
        "model": "AROME",
        "grid": OM_GRID,
        "source": "open-meteo",
        "openMeteoModel": OM_MODEL,
        "lat": lat,
        "lon": lon,
        "modelElevationM": int(round(elev)),
        "nearestCell": {
            "lat": nearest_lat if nearest_lat is not None else round_point(lat, lon)[0],
            "lon": nearest_lon if nearest_lon is not None else round_point(lat, lon)[1],
        },
        "runInitUtc": slot,
        "runAvailable": True,
        "timezone": "Europe/Paris",
        "fetchedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "hours": [h.as_dict("Europe/Paris") for h in hours],
        "warnings": warnings,
        "cloudBaseRule": CLOUD_BASE_RULE,
        "attribution": (
            "Données Météo-France AROME via Open-Meteo (CC BY 4.0). "
            "Licence Ouverte 2.0 / Météo-France. "
            "https://open-meteo.com/en/licence"
        ),
    }


def _at(hourly: dict[str, Any], key: str, index: int) -> Any:
    series = hourly.get(key)
    if not isinstance(series, list) or index >= len(series):
        return None
    return series[index]


def _parse_om_time(value: str) -> datetime:
    text = value.strip()
    if text.endswith("Z"):
        text = text[:-1] + "+00:00"
    dt = datetime.fromisoformat(text)
    if dt.tzinfo is None:
        return dt.replace(tzinfo=TIMEZONE)
    return dt


def _height_points(hourly: dict[str, Any], index: int, elev: float) -> list[ProfilePoint]:
    points: list[ProfilePoint] = []
    t2 = _f(_at(hourly, "temperature_2m", index))
    td2 = _f(_at(hourly, "dew_point_2m", index))
    rh2 = _f(_at(hourly, "relative_humidity_2m", index))
    w10 = _f(_at(hourly, "wind_speed_10m", index))
    d10 = _f(_at(hourly, "wind_direction_10m", index))
    points.append(
        ProfilePoint(
            z=int(round(elev + 2)),
            src="h2",
            t=_r1(t2),
            rh=_ri(rh2),
            td=_r1(td2),
            wind=_ri(w10),
            dir=_ri(d10),
            cloud=None,
        )
    )
    for h in HEIGHT_AGL_M:
        t = _f(_at(hourly, f"temperature_{h}m", index))
        wind = _f(_at(hourly, f"wind_speed_{h}m", index))
        direc = _f(_at(hourly, f"wind_direction_{h}m", index))
        if all(v is None for v in (t, wind, direc)):
            continue
        points.append(
            ProfilePoint(
                z=int(round(elev + h)),
                src=f"h{h}",
                t=_r1(t),
                rh=None,
                td=None,
                wind=_ri(wind),
                dir=_ri(direc),
                cloud=None,
            )
        )
    return points


def _isobar_points(hourly: dict[str, Any], index: int) -> list[ProfilePoint]:
    points: list[ProfilePoint] = []
    for p in PRESSURE_HPA:
        z = _f(_at(hourly, f"geopotential_height_{p}hPa", index))
        if z is None:
            continue
        t = _f(_at(hourly, f"temperature_{p}hPa", index))
        td = _f(_at(hourly, f"dew_point_{p}hPa", index))
        rh = _f(_at(hourly, f"relative_humidity_{p}hPa", index))
        cloud = _f(_at(hourly, f"cloud_cover_{p}hPa", index))
        wind = _f(_at(hourly, f"wind_speed_{p}hPa", index))
        direc = _f(_at(hourly, f"wind_direction_{p}hPa", index))
        points.append(
            ProfilePoint(
                z=int(round(z)),
                src=f"p{p}",
                t=_r1(t),
                rh=_ri(rh),
                td=_r1(td),
                wind=_ri(wind),
                dir=_ri(direc),
                cloud=_ri(cloud),
            )
        )
    return points


def resolve_window(
    time_from: datetime | None,
    time_to: datetime | None,
    now: datetime | None = None,
) -> tuple[datetime, datetime]:
    from datetime import timedelta

    now_paris = (now or datetime.now(TIMEZONE)).astimezone(TIMEZONE)
    default_from = now_paris.replace(hour=7, minute=0, second=0, microsecond=0)
    default_to = (now_paris + timedelta(days=2)).replace(
        hour=22, minute=0, second=0, microsecond=0
    )
    start = time_from.astimezone(TIMEZONE) if time_from else default_from
    end = time_to.astimezone(TIMEZONE) if time_to else default_to
    if end <= start:
        raise ValueError("Paramètre to doit être postérieur à from")
    return start, end
