from __future__ import annotations

import numpy as np

from src.grib_extract import (
    fraction_to_pct,
    geopotential_to_m,
    kelvin_to_c,
    nearest_indices,
    pa_to_hpa,
)


def test_nearest_indices() -> None:
    lats = np.array([45.90, 45.91, 45.92, 45.93])
    lons = np.array([6.85, 6.86, 6.87, 6.88])
    i, j = nearest_indices(lats, lons, 45.923, 6.869)
    assert lats[i] == 45.92
    assert lons[j] == 6.87


def test_unit_heuristics_do_not_invent() -> None:
    assert kelvin_to_c(291.15) is not None and abs(kelvin_to_c(291.15) - 18.0) < 1e-9
    assert kelvin_to_c(18.0) == 18.0
    assert kelvin_to_c(None) is None
    assert pa_to_hpa(85000.0) == 850.0
    assert pa_to_hpa(850.0) == 850.0
    assert fraction_to_pct(0.4) == 40.0
    assert fraction_to_pct(40.0) == 40.0
    # 500 hPa ~ 56000 m²/s²
    z_m = geopotential_to_m(56000.0)
    assert z_m is not None and 5500 < z_m < 5900
    assert geopotential_to_m(5600.0) == 5600.0
