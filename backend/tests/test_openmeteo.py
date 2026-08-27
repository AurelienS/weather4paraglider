from __future__ import annotations

from datetime import datetime

from src.config import TIMEZONE
from src.pipeline import assemble_response, cache_slot_utc
from src.profile import ProfilePoint, fuse_profile


def test_cache_slot_is_3h() -> None:
    from datetime import timezone

    now = datetime(2026, 8, 27, 16, 40, tzinfo=timezone.utc)
    assert cache_slot_utc(now) == "2026-08-27T15:00:00Z"


def test_fuse_drops_isobar_too_close() -> None:
    heights = [
        ProfilePoint(z=1700, src="h20", t=18.0, rh=None, td=None, wind=10, dir=180, cloud=None),
    ]
    isobars = [
        ProfilePoint(z=1740, src="p850", t=17.0, rh=40, td=6.0, wind=12, dir=200, cloud=None),
        ProfilePoint(z=5600, src="p500", t=-12.0, rh=30, td=-20.0, wind=40, dir=250, cloud=None),
    ]
    out = fuse_profile(heights, isobars, model_elev=1680)
    assert [p.src for p in out] == ["h20", "p500"]


def test_assemble_stuve_fields() -> None:
    raw = {
        "latitude": 45.94,
        "longitude": 6.70,
        "elevation": 1000.0,
        "hourly": {
            "time": ["2026-08-27T16:00"],
            "temperature_2m": [18.4],
            "relative_humidity_2m": [45],
            "dew_point_2m": [6.1],
            "wind_speed_10m": [14],
            "wind_direction_10m": [220],
            "wind_gusts_10m": [24],
            "cape": [120],
            "precipitation": [0],
            "cloud_cover_low": [10],
            "cloud_cover_mid": [0],
            "cloud_cover_high": [30],
            "surface_pressure": [900],
            "temperature_100m": [17.0],
            "wind_speed_100m": [18],
            "wind_direction_100m": [230],
            "temperature_850hPa": [10.0],
            "dew_point_850hPa": [2.0],
            "relative_humidity_850hPa": [55],
            "cloud_cover_850hPa": [20],
            "wind_speed_850hPa": [25],
            "wind_direction_850hPa": [240],
            "geopotential_height_850hPa": [1500],
            "temperature_500hPa": [-15.0],
            "dew_point_500hPa": [-25.0],
            "relative_humidity_500hPa": [40],
            "cloud_cover_500hPa": [0],
            "wind_speed_500hPa": [60],
            "wind_direction_500hPa": [260],
            "geopotential_height_500hPa": [5600],
        },
    }
    start = datetime(2026, 8, 27, 16, 0, tzinfo=TIMEZONE)
    end = datetime(2026, 8, 27, 17, 0, tzinfo=TIMEZONE)
    payload = assemble_response(
        lat=45.945,
        lon=6.71,
        raw=raw,
        window_from=start,
        window_to=end,
        slot="2026-08-27T15:00:00Z",
    )
    assert payload["source"] == "open-meteo"
    assert payload["grid"] == "0.025"
    assert payload["openMeteoModel"] == "arome_france"
    hour = payload["hours"][0]
    assert hour["surface"]["t2m"] == 18.4
    srcs = [p["src"] for p in hour["profile"]]
    assert "h2" in srcs
    assert "h100" in srcs
    assert "p850" in srcs
    assert "p500" in srcs
    p500 = next(p for p in hour["profile"] if p["src"] == "p500")
    assert p500["td"] == -25.0
    assert p500["t"] == -15.0
    assert p500["wind"] == 60
