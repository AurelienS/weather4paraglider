"""Ouverture GRIB2 (cfgrib/xarray) et plus proche voisin sur la grille 0.01°."""

from __future__ import annotations

import logging
import math
import os
import tempfile
import threading
import xml.etree.ElementTree as ET
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Iterable

import numpy as np

from src.config import G

logger = logging.getLogger(__name__)

# eccodes MEMFS n'est pas thread-safe sous Windows.
_GRIB_LOCK = threading.Lock()


@dataclass(slots=True)
class ExtractedField:
    """Série extraite au point : valid_time → {level → value}."""

    name: str
    nearest_lat: float | None = None
    nearest_lon: float | None = None
    units: str = ""
    # surface: level=0 ; hauteur: mètres AGL ; isobare: hPa
    series: dict[datetime, dict[int, float | None]] = field(default_factory=dict)

    def set(self, when: datetime, level: int, value: float | None) -> None:
        bucket = self.series.setdefault(when, {})
        bucket[level] = value

    def get(self, when: datetime, level: int = 0) -> float | None:
        return self.series.get(when, {}).get(level)


def _as_utc(value: Any) -> datetime:
    if isinstance(value, datetime):
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)
    if isinstance(value, np.datetime64):
        # ns → datetime
        ts = value.astype("datetime64[s]").astype("int")
        return datetime.fromtimestamp(int(ts), tz=timezone.utc)
    if isinstance(value, (int, float, np.integer, np.floating)):
        # pandas/numpy timedelta ns or seconds
        return datetime.fromtimestamp(float(value), tz=timezone.utc)
    raise TypeError(f"Horodatage inattendu: {type(value)} {value!r}")


def _scalar(value: Any) -> float | None:
    if value is None:
        return None
    try:
        arr = np.asarray(value)
        if arr.size == 0:
            return None
        number = float(arr.reshape(-1)[0])
    except (TypeError, ValueError):
        return None
    if math.isnan(number) or math.isinf(number):
        return None
    return number


def kelvin_to_c(t: float | None) -> float | None:
    if t is None:
        return None
    return t - 273.15 if t > 100.0 else t


def ms_to_kmh(speed: float | None) -> float | None:
    if speed is None:
        return None
    return speed * 3.6


def pa_to_hpa(p: float | None) -> float | None:
    if p is None:
        return None
    return p / 100.0 if p > 2000.0 else p


def fraction_to_pct(x: float | None) -> float | None:
    if x is None:
        return None
    return x * 100.0 if 0.0 <= x <= 1.5 else x


def geopotential_to_m(z: float | None) -> float | None:
    """Z GRIB : mètres (gh) ou m²/s² (geopotential)."""
    if z is None:
        return None
    return z / G if z > 20_000.0 else z


def wind_speed_dir(u: float | None, v: float | None) -> tuple[float | None, float | None]:
    """Vitesse m/s et direction météo ° (d'où vient le vent)."""
    if u is None or v is None:
        return None, None
    speed = math.hypot(u, v)
    direction = (math.degrees(math.atan2(u, v)) + 180.0) % 360.0
    return speed, direction


def _lat_lon_names(ds: Any) -> tuple[str, str]:
    for lat_n, lon_n in (("latitude", "longitude"), ("lat", "lon"), ("y", "x")):
        if lat_n in ds.coords or lat_n in ds.variables:
            if lon_n in ds.coords or lon_n in ds.variables:
                return lat_n, lon_n
    raise KeyError(f"Pas de coordonnées lat/lon dans {list(ds.coords)}")


def nearest_indices(lats: np.ndarray, lons: np.ndarray, lat: float, lon: float) -> tuple[int, int]:
    lat1d = np.asarray(lats).reshape(-1)
    lon1d = np.asarray(lons).reshape(-1)
    i = int(np.abs(lat1d - lat).argmin())
    j = int(np.abs(lon1d - lon).argmin())
    return i, j


_COORD_COLS = {
    "time",
    "step",
    "valid_time",
    "surface",
    "meanSea",
    "heightAboveGround",
    "isobaricInhPa",
    "isobaricInPa",
    "height",
    "level",
    "latitude",
    "longitude",
    "lat",
    "lon",
    "number",
    "potentialVorticity",
}


def extract_from_dataset(
    ds: Any,
    lat: float,
    lon: float,
    field_name: str,
    *,
    run_init: datetime | None = None,
) -> ExtractedField:
    """Nearest-neighbor sur un Dataset xarray (un typeOfLevel homogène)."""
    out = ExtractedField(name=field_name)
    lat_n, lon_n = _lat_lon_names(ds)
    lat_coord = ds[lat_n]
    lon_coord = ds[lon_n]

    if lat_coord.ndim == 1 and lon_coord.ndim == 1:
        point = ds.sel({lat_n: lat, lon_n: lon}, method="nearest")
        out.nearest_lat = float(np.asarray(point[lat_n].values).reshape(-1)[0])
        out.nearest_lon = float(np.asarray(point[lon_n].values).reshape(-1)[0])
    else:
        la = np.asarray(lat_coord.values)
        lo = np.asarray(lon_coord.values)
        dist = (la - lat) ** 2 + (lo - lon) ** 2
        idx = np.unravel_index(np.nanargmin(dist), dist.shape)
        indexer = {lat_coord.dims[k]: int(idx[k]) for k in range(len(idx))}
        point = ds.isel(indexer)
        out.nearest_lat = float(np.asarray(point[lat_n].values).reshape(-1)[0])
        out.nearest_lon = float(np.asarray(point[lon_n].values).reshape(-1)[0])

    skip = {lat_n, lon_n}
    data_vars = [v for v in point.data_vars if v not in skip]
    if not data_vars:
        return out
    candidates = [v for v in data_vars if v not in _COORD_COLS]
    value_name = (candidates or data_vars)[0]
    out.units = str(point[value_name].attrs.get("units", ""))

    var = point[value_name]
    if var.ndim == 0 or (var.size == 1 and not var.dims):
        when = run_init or datetime.now(timezone.utc)
        for name in ("valid_time", "time"):
            if name in point.coords:
                when = _as_utc(point.coords[name].values)
                break
        level = 0
        for name, scale in (
            ("heightAboveGround", 1.0),
            ("isobaricInhPa", 1.0),
            ("height", 1.0),
        ):
            if name in point.coords:
                val = _scalar(point.coords[name].values)
                if val is not None:
                    level = int(round(val * scale))
                break
        out.set(when, level, _scalar(var.values))
        return out

    try:
        df = point.to_dataframe().reset_index()
    except ValueError:
        when = run_init or datetime.now(timezone.utc)
        out.set(when, 0, _scalar(var.values))
        return out
    for _, row in df.iterrows():
        when = _time_from_row(row, run_init)
        level = _level_from_row(row)
        out.set(when, level, _scalar(row[value_name]))
    return out


def _time_from_row(row: Any, run_init: datetime | None) -> datetime:
    if "valid_time" in row.index and _is_time_like(row["valid_time"]):
        return _as_utc(row["valid_time"])
    if "time" in row.index and _is_time_like(row["time"]):
        base = _as_utc(row["time"])
        if "step" in row.index:
            step = row["step"]
            if isinstance(step, np.timedelta64):
                return base + timedelta(seconds=float(step / np.timedelta64(1, "s")))
            if isinstance(step, timedelta):
                return base + step
        return base
    if run_init is not None and "step" in row.index:
        step = row["step"]
        if isinstance(step, np.timedelta64):
            return run_init + timedelta(seconds=float(step / np.timedelta64(1, "s")))
        if isinstance(step, timedelta):
            return run_init + step
        try:
            return run_init + timedelta(seconds=float(step))
        except (TypeError, ValueError):
            pass
    return run_init or datetime.now(timezone.utc)


def _is_time_like(value: Any) -> bool:
    return isinstance(value, (datetime, np.datetime64)) or type(value).__name__ == "Timestamp"


def _level_from_row(row: Any) -> int:
    for name, scale in (
        ("heightAboveGround", 1.0),
        ("isobaricInhPa", 1.0),
        ("isobaricInPa", 0.01),
        ("height", 1.0),
        ("level", 1.0),
    ):
        if name in row.index:
            val = _scalar(row[name])
            if val is not None:
                return int(round(val * scale))
    return 0


def open_grib_datasets(path: str | Path) -> list[Any]:
    try:
        import cfgrib
    except ImportError as exc:
        raise RuntimeError(
            "cfgrib/eccodes requis pour lire le GRIB2. "
            "conda install -c conda-forge eccodes cfgrib"
        ) from exc
    return cfgrib.open_datasets(str(path), backend_kwargs={"indexpath": ""})


def extract_grib_bytes(
    payload: bytes,
    lat: float,
    lon: float,
    field_name: str,
    *,
    run_init: datetime | None = None,
) -> ExtractedField:
    if payload.lstrip().startswith(b"<?xml") or payload.lstrip().startswith(b"<"):
        return extract_from_wcs_xml(payload, lat, lon, field_name, run_init=run_init)

    fd, tmp = tempfile.mkstemp(suffix=".grib2")
    os.close(fd)
    path = Path(tmp)
    datasets: list[Any] = []
    try:
        path.write_bytes(payload)
        if not path.read_bytes()[:4] == b"GRIB" and b"GRIB" not in path.read_bytes()[:16]:
            logger.warning("Corps non-GRIB pour %s (%s octets)", field_name, path.stat().st_size)
            return ExtractedField(name=field_name)
        merged = ExtractedField(name=field_name)
        with _GRIB_LOCK:
            try:
                datasets = open_grib_datasets(path)
            except Exception as exc:  # noqa: BLE001
                logger.warning("GRIB illisible %s: %s", field_name, exc)
                return merged
            if not datasets:
                logger.warning("GRIB vide pour %s", field_name)
                return merged
            for ds in datasets:
                try:
                    part = extract_from_dataset(ds, lat, lon, field_name, run_init=run_init)
                finally:
                    try:
                        ds.close()
                    except Exception:
                        pass
                if merged.nearest_lat is None:
                    merged.nearest_lat = part.nearest_lat
                    merged.nearest_lon = part.nearest_lon
                    merged.units = part.units
                for when, levels in part.series.items():
                    for lev, val in levels.items():
                        merged.set(when, lev, val)
        return merged
    finally:
        try:
            path.unlink(missing_ok=True)
        except OSError:
            pass
        try:
            path.with_suffix(path.suffix + ".idx").unlink(missing_ok=True)
        except OSError:
            pass


def extract_from_wcs_xml(
    payload: bytes,
    lat: float,
    lon: float,
    field_name: str,
    *,
    run_init: datetime | None = None,
) -> ExtractedField:
    """WCS peut renvoyer un XML (point unique) au lieu d'un GRIB."""
    out = ExtractedField(name=field_name, nearest_lat=lat, nearest_lon=lon)
    try:
        root = ET.fromstring(payload)
    except ET.ParseError:
        logger.warning("XML WCS illisible pour %s", field_name)
        return out
    numbers: list[float] = []
    for el in root.iter():
        tag = el.tag.split("}", 1)[-1]
        if tag in {"tupleList", "TupleList", "value", "DataBlock"} and el.text:
            for token in el.text.replace(",", " ").split():
                try:
                    numbers.append(float(token))
                except ValueError:
                    continue
    when = run_init or datetime.now(timezone.utc)
    if numbers:
        # Dernier nombre = valeur (les précédents peuvent être lat/lon)
        out.set(when, 0, numbers[-1])
    return out


def merge_extracted(parts: Iterable[ExtractedField]) -> ExtractedField:
    acc: ExtractedField | None = None
    for part in parts:
        if acc is None:
            acc = ExtractedField(
                name=part.name,
                nearest_lat=part.nearest_lat,
                nearest_lon=part.nearest_lon,
                units=part.units,
            )
        for when, levels in part.series.items():
            for lev, val in levels.items():
                acc.set(when, lev, val)
    return acc or ExtractedField(name="empty")
