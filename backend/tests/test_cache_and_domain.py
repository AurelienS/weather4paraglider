from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

from src.cache import PointCache, cache_key
from src.config import in_arome_domain, load_settings, round_point, subset_bbox
from src.fields import match_indicator, parse_coverage_id, resolve_field, FieldSpec, Wanted
from src.mf_wcs import previous_run, theoretical_latest_run, run_to_wcs_id
from src.pipeline import resolve_window


def test_load_settings_accepts_arome_api_key(monkeypatch, tmp_path: Path) -> None:
    monkeypatch.setenv("AROME_API_KEY", "jwt-test")
    monkeypatch.delenv("METEOFRANCE_API_KEY", raising=False)
    monkeypatch.delenv("METEOFRANCE_APPLICATION_ID", raising=False)
    monkeypatch.setenv("CACHE_DIR", str(tmp_path))
    settings = load_settings()
    assert settings.api_key == "jwt-test"


def test_round_point_shares_cache() -> None:
    a = round_point(45.923, 6.869)
    b = round_point(45.924, 6.871)
    assert a == (45.92, 6.87)
    assert a == b


def test_domain_alps_inside_ocean_outside() -> None:
    assert in_arome_domain(45.923, 6.869)
    assert in_arome_domain(37.5, -12.0)
    assert in_arome_domain(55.4, 16.0)
    assert not in_arome_domain(46.0, 20.0)
    assert not in_arome_domain(30.0, 6.0)


def test_subset_bbox_is_tiny() -> None:
    lat0, lat1, lon0, lon1 = subset_bbox(45.92, 6.87)
    assert abs((lat1 - lat0) - 0.04) < 1e-9
    assert abs((lon1 - lon0) - 0.04) < 1e-9


def test_cache_hit_same_run(tmp_path: Path) -> None:
    cache = PointCache(tmp_path)
    payload = {"runInitUtc": "2026-08-27T12:00:00Z", "hours": []}
    cache.write(45.923, 6.869, "2026-08-27T12:00:00Z", "A", "B", payload)
    hit = cache.read(45.924, 6.871, "2026-08-27T12:00:00Z", "A", "B")
    assert hit is not None
    assert hit["runInitUtc"] == "2026-08-27T12:00:00Z"
    miss = cache.read(45.92, 6.87, "2026-08-27T09:00:00Z", "A", "B")
    assert miss is None


def test_cache_key_stable() -> None:
    k1 = cache_key(45.923, 6.869, "r", "f", "t")
    k2 = cache_key(45.924, 6.871, "r", "f", "t")
    assert k1 == k2


def test_theoretical_run_after_delay() -> None:
    # 16:00 UTC : le 12Z est dispo (15:45), pas le 15Z (18:10)
    now = datetime(2026, 8, 27, 16, 0, tzinfo=timezone.utc)
    run = theoretical_latest_run(now)
    assert run == datetime(2026, 8, 27, 12, tzinfo=timezone.utc)
    prev = previous_run(run)
    assert prev == datetime(2026, 8, 27, 9, tzinfo=timezone.utc)
    assert run_to_wcs_id(run) == "2026-08-27T12.00.00Z"


def test_run_21_wraps_to_previous_day() -> None:
    run21 = datetime(2026, 8, 27, 21, tzinfo=timezone.utc)
    assert previous_run(run21).hour == 18
    run00 = datetime(2026, 8, 27, 0, tzinfo=timezone.utc)
    prev = previous_run(run00)
    assert prev == datetime(2026, 8, 26, 21, tzinfo=timezone.utc)


def test_default_window_j0_07_j2_22() -> None:
    now = datetime(2026, 8, 27, 14, 40, tzinfo=timezone.utc)
    start, end = resolve_window(None, None, now=now)
    assert start.hour == 7
    assert end.hour == 22
    assert (end.date() - start.date()).days == 2


def test_parse_coverage_id() -> None:
    ind, run, interval = parse_coverage_id(
        "TEMPERATURE__SPECIFIC_HEIGHT_LEVEL_ABOVE_GROUND___2026-08-27T12.00.00Z"
    )
    assert ind.startswith("TEMPERATURE")
    assert run == "2026-08-27T12.00.00Z"
    assert interval == ""
    ind2, run2, interval2 = parse_coverage_id(
        "TOTAL_PRECIPITATION__GROUND_OR_WATER_SURFACE___2026-08-27T12.00.00Z_PT1H"
    )
    assert interval2 == "PT1H"
    assert run2.endswith("Z")


def test_match_indicator_closest() -> None:
    available = [
        "TEMPERATURE__SPECIFIC_HEIGHT_LEVEL_ABOVE_GROUND",
        "TEMPERATURE__ISOBARIC_SURFACE",
        "RELATIVE_HUMIDITY__ISOBARIC_SURFACE",
    ]
    assert (
        match_indicator("TEMPERATURE__SPECIFIC_HEIGHT_LEVEL_ABOVE_GROUND", available)
        == "TEMPERATURE__SPECIFIC_HEIGHT_LEVEL_ABOVE_GROUND"
    )
    spec = FieldSpec(
        Wanted.T_ISOBAR,
        ("TEMPERATURE__ISOBARIC_SURFACE",),
        "isobar",
        True,
        ("t",),
    )
    hit, warn = resolve_field(spec, available)
    assert hit == "TEMPERATURE__ISOBARIC_SURFACE"
    assert warn is None
