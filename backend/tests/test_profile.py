from __future__ import annotations

from datetime import datetime, timezone

from src.grib_extract import ExtractedField, wind_speed_dir
from src.profile import estimate_cloud_base, merge_profile, ProfilePoint


def _field(name: str, when: datetime, mapping: dict[int, float]) -> ExtractedField:
    ext = ExtractedField(name=name)
    for level, value in mapping.items():
        ext.set(when, level, value)
    return ext


def test_wind_meteorological_direction() -> None:
    # u=0, v=-10 : vent du nord (vers le sud) → 0°
    speed, direction = wind_speed_dir(0.0, -10.0)
    assert speed is not None and abs(speed - 10.0) < 1e-9
    assert direction is not None and abs(direction - 0.0) < 1e-6
    # u=10, v=0 : vent d'ouest → 270°
    _, d2 = wind_speed_dir(10.0, 0.0)
    assert d2 is not None and abs(d2 - 270.0) < 1e-6


def test_merge_prefers_height_when_closer_than_80m() -> None:
    when = datetime(2026, 8, 27, 12, tzinfo=timezone.utc)
    elev = 1680.0
    # h1000 → AMSL 2680 ; isobare 700 hPa à 2700 m (<80 m) → drop isobar
    fields = {
        "t_height": _field("t", when, {1000: 280.0, 3000: 260.0}),
        "hu_height": _field("hu", when, {1000: 50.0, 3000: 40.0}),
        "u_height": _field("u", when, {1000: 1.0, 3000: 2.0}),
        "v_height": _field("v", when, {1000: 0.0, 3000: 0.0}),
        "z_isobar": _field("z", when, {700: 2700.0, 500: 5600.0}),
        "t_isobar": _field("t", when, {700: 270.0, 500: 250.0}),
        "hu_isobar": _field("hu", when, {700: 45.0, 500: 30.0}),
        "u_isobar": _field("u", when, {700: 3.0, 500: 5.0}),
        "v_isobar": _field("v", when, {700: 0.0, 500: 1.0}),
    }
    profile = merge_profile(when, elev, fields)
    srcs = [p.src for p in profile]
    assert "h1000" in srcs
    assert "p700" not in srcs
    assert "p500" in srcs
    assert all(p.z <= 6000 for p in profile)
    assert profile == sorted(profile, key=lambda p: p.z)


def test_drop_isobar_below_model_elevation() -> None:
    when = datetime(2026, 8, 27, 12, tzinfo=timezone.utc)
    fields = {
        "z_isobar": _field("z", when, {850: 1400.0, 500: 5600.0}),
        "t_isobar": _field("t", when, {850: 280.0, 500: 250.0}),
        "hu_isobar": _field("hu", when, {850: 40.0, 500: 20.0}),
        "u_isobar": _field("u", when, {850: 1.0, 500: 2.0}),
        "v_isobar": _field("v", when, {850: 0.0, 500: 0.0}),
    }
    profile = merge_profile(when, 1680.0, fields)
    assert all(p.src != "p850" for p in profile)
    assert any(p.src == "p500" for p in profile)


def test_cloud_base_first_rh_or_cloud() -> None:
    pts = [
        ProfilePoint(z=1700, src="h10", t=18.0, rh=40, td=None, wind=10, dir=180, cloud=None),
        ProfilePoint(z=2200, src="h500", t=12.0, rh=70, td=None, wind=12, dir=180, cloud=10),
        ProfilePoint(z=2800, src="h1000", t=8.0, rh=91, td=None, wind=14, dir=200, cloud=20),
        ProfilePoint(z=4200, src="p600", t=-5.0, rh=95, td=None, wind=40, dir=250, cloud=80),
    ]
    assert estimate_cloud_base(pts) == 2800
    dry = [
        ProfilePoint(z=1700, src="h10", t=18.0, rh=20, td=None, wind=10, dir=180, cloud=0),
        ProfilePoint(z=3000, src="h1500", t=5.0, rh=30, td=None, wind=20, dir=180, cloud=10),
    ]
    assert estimate_cloud_base(dry) is None
    by_cloud = [
        ProfilePoint(z=1900, src="h200", t=15.0, rh=40, td=None, wind=8, dir=90, cloud=55),
    ]
    assert estimate_cloud_base(by_cloud) == 1900


def test_never_invent_missing_td() -> None:
    when = datetime(2026, 8, 27, 12, tzinfo=timezone.utc)
    fields = {
        "t_height": _field("t", when, {10: 291.15}),
        "hu_height": _field("hu", when, {10: 46.0}),
        "u_height": _field("u", when, {10: 1.0}),
        "v_height": _field("v", when, {10: -1.0}),
    }
    profile = merge_profile(when, 1680.0, fields)
    assert len(profile) == 1
    assert profile[0].td is None
    assert profile[0].cloud is None
    assert profile[0].src == "h10"
    assert profile[0].z == 1690
