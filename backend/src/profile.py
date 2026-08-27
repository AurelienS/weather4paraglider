"""Fusion hauteurs AGL + isobares → profil AMSL, vent, base nuageuse."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Mapping
from zoneinfo import ZoneInfo

from src.config import (
    CLOUD_BASE_FRACT,
    CLOUD_BASE_RH,
    HEIGHT_LEVELS_M,
    MERGE_MIN_DZ_M,
    PRESSURE_LEVELS_HPA,
    PROFILE_Z_MAX_M,
)
from src.grib_extract import (
    ExtractedField,
    fraction_to_pct,
    geopotential_to_m,
    kelvin_to_c,
    ms_to_kmh,
    pa_to_hpa,
    wind_speed_dir,
)

CLOUD_BASE_RULE = (
    "cloudBaseM = AMSL du premier niveau du profil (z croissant) où "
    f"HU >= {CLOUD_BASE_RH:.0f} % ou CLD_FRACT >= {CLOUD_BASE_FRACT:.0f} % ; "
    "null sinon. Aucune interpolation."
)


def _r1(x: float | None) -> float | None:
    return None if x is None else round(x, 1)


def _ri(x: float | None) -> int | None:
    return None if x is None else int(round(x))


@dataclass(slots=True)
class ProfilePoint:
    z: int
    src: str
    t: float | None
    rh: float | None
    td: float | None
    wind: int | None
    dir: int | None
    cloud: int | None

    def as_dict(self) -> dict[str, Any]:
        return {
            "z": self.z,
            "src": self.src,
            "t": self.t,
            "rh": self.rh,
            "td": self.td,
            "wind": self.wind,
            "dir": self.dir,
            "cloud": self.cloud,
        }


@dataclass(slots=True)
class SurfaceBlock:
    t2m: float | None
    rh2m: int | None
    wind10: int | None
    dir10: int | None
    gust10: int | None
    cape: int | None
    precip: float | None
    cloudLow: int | None
    cloudMid: int | None
    cloudHigh: int | None
    cloudBaseM: int | None
    psfc: float | None = None

    def as_dict(self) -> dict[str, Any]:
        return {
            "t2m": self.t2m,
            "rh2m": self.rh2m,
            "wind10": self.wind10,
            "dir10": self.dir10,
            "gust10": self.gust10,
            "cape": self.cape,
            "precip": self.precip,
            "cloudLow": self.cloudLow,
            "cloudMid": self.cloudMid,
            "cloudHigh": self.cloudHigh,
            "cloudBaseM": self.cloudBaseM,
            "psfc": self.psfc,
        }


@dataclass(slots=True)
class HourBlock:
    time: datetime
    surface: SurfaceBlock
    profile: list[ProfilePoint] = field(default_factory=list)

    def as_dict(self, tz_name: str) -> dict[str, Any]:
        local = self.time.astimezone(ZoneInfo(tz_name))
        iso = local.isoformat(timespec="seconds")
        return {
            "time": iso,
            "surface": self.surface.as_dict(),
            "profile": [p.as_dict() for p in self.profile],
        }


def _val(field: ExtractedField | None, when: datetime, level: int = 0) -> float | None:
    if field is None:
        return None
    return field.get(when, level)


def build_surface(
    when: datetime,
    fields: Mapping[str, ExtractedField],
    prev_precip: float | None,
    profile: list[ProfilePoint],
) -> SurfaceBlock:
    t2m = kelvin_to_c(_val(fields.get("t2m"), when, 2) or _val(fields.get("t2m"), when, 0))
    rh2m = fraction_to_pct(_val(fields.get("rh2m"), when, 2) or _val(fields.get("rh2m"), when, 0))
    u10 = _val(fields.get("u10"), when, 10) or _val(fields.get("u10"), when, 0)
    v10 = _val(fields.get("v10"), when, 10) or _val(fields.get("v10"), when, 0)
    spd, direc = wind_speed_dir(u10, v10)
    ug = _val(fields.get("u_gust10"), when, 10) or _val(fields.get("u_gust10"), when, 0)
    vg = _val(fields.get("v_gust10"), when, 10) or _val(fields.get("v_gust10"), when, 0)
    gst, _ = wind_speed_dir(ug, vg)
    cape = _val(fields.get("cape"), when, 0)
    raw_precip = _val(fields.get("precip"), when, 0)
    # EAU / TP : cumul depuis le run → on dérive l'incrément horaire (mm).
    precip: float | None
    if raw_precip is None:
        precip = None
    elif prev_precip is None:
        precip = max(0.0, raw_precip)
    else:
        precip = max(0.0, raw_precip - prev_precip)

    return SurfaceBlock(
        t2m=_r1(t2m),
        rh2m=_ri(rh2m),
        wind10=_ri(ms_to_kmh(spd)),
        dir10=_ri(direc),
        gust10=_ri(ms_to_kmh(gst)),
        cape=_ri(cape),
        precip=_r1(precip),
        cloudLow=_ri(fraction_to_pct(_val(fields.get("cloud_low"), when, 0))),
        cloudMid=_ri(fraction_to_pct(_val(fields.get("cloud_mid"), when, 0))),
        cloudHigh=_ri(fraction_to_pct(_val(fields.get("cloud_high"), when, 0))),
        cloudBaseM=estimate_cloud_base(profile),
        psfc=_r1(pa_to_hpa(_val(fields.get("psfc"), when, 0))),
    )


def _height_point(
    when: datetime,
    z_agl: int,
    model_elev: float,
    fields: Mapping[str, ExtractedField],
) -> ProfilePoint | None:
    z_amsl = model_elev + z_agl
    if z_amsl > PROFILE_Z_MAX_M:
        return None
    t = kelvin_to_c(_val(fields.get("t_height"), when, z_agl))
    rh = fraction_to_pct(_val(fields.get("hu_height"), when, z_agl))
    td = kelvin_to_c(_val(fields.get("td_height"), when, z_agl))
    u = _val(fields.get("u_height"), when, z_agl)
    v = _val(fields.get("v_height"), when, z_agl)
    spd, direc = wind_speed_dir(u, v)
    cloud = fraction_to_pct(_val(fields.get("cld_height"), when, z_agl))
    # Un niveau sans aucune grandeur utile est omis (pas inventé).
    if all(x is None for x in (t, rh, td, spd, cloud)):
        return None
    return ProfilePoint(
        z=int(round(z_amsl)),
        src=f"h{z_agl}",
        t=_r1(t),
        rh=_ri(rh),
        td=_r1(td),
        wind=_ri(ms_to_kmh(spd)),
        dir=_ri(direc),
        cloud=_ri(cloud),
    )


def _isobar_point(
    when: datetime,
    p_hpa: int,
    fields: Mapping[str, ExtractedField],
) -> ProfilePoint | None:
    z_raw = _val(fields.get("z_isobar"), when, p_hpa)
    z_m = geopotential_to_m(z_raw)
    if z_m is None:
        return None
    if z_m > PROFILE_Z_MAX_M:
        return None
    t = kelvin_to_c(_val(fields.get("t_isobar"), when, p_hpa))
    rh = fraction_to_pct(_val(fields.get("hu_isobar"), when, p_hpa))
    td = kelvin_to_c(_val(fields.get("td_isobar"), when, p_hpa))
    u = _val(fields.get("u_isobar"), when, p_hpa)
    v = _val(fields.get("v_isobar"), when, p_hpa)
    spd, direc = wind_speed_dir(u, v)
    cloud = fraction_to_pct(_val(fields.get("cld_isobar"), when, p_hpa))
    return ProfilePoint(
        z=int(round(z_m)),
        src=f"p{p_hpa}",
        t=_r1(t),
        rh=_ri(rh),
        td=_r1(td),
        wind=_ri(ms_to_kmh(spd)),
        dir=_ri(direc),
        cloud=_ri(cloud),
    )


def merge_profile(
    when: datetime,
    model_elev: float,
    fields: Mapping[str, ExtractedField],
) -> list[ProfilePoint]:
    """Hauteurs AGL → AMSL, isobares via Z, fusion, coupe 6000 m, d<80 m → hauteur."""
    heights: list[ProfilePoint] = []
    for z_agl in HEIGHT_LEVELS_M:
        pt = _height_point(when, z_agl, model_elev, fields)
        if pt is not None:
            heights.append(pt)

    isobars: list[ProfilePoint] = []
    for p in PRESSURE_LEVELS_HPA:
        pt = _isobar_point(when, p, fields)
        if pt is None:
            continue
        if pt.z < model_elev:
            continue
        too_close = any(abs(pt.z - h.z) < MERGE_MIN_DZ_M for h in heights)
        if too_close:
            continue
        isobars.append(pt)

    merged = heights + isobars
    merged.sort(key=lambda p: p.z)
    return [p for p in merged if p.z <= PROFILE_Z_MAX_M]


def fuse_profile(heights: list[ProfilePoint], isobars: list[ProfilePoint], model_elev: float) -> list[ProfilePoint]:
    """Isobares sous le relief ou à <80 m d'un niveau hauteur : on garde la hauteur."""
    kept_iso: list[ProfilePoint] = []
    for pt in isobars:
        if pt.z < model_elev:
            continue
        if any(abs(pt.z - h.z) < MERGE_MIN_DZ_M for h in heights):
            continue
        kept_iso.append(pt)
    merged = heights + kept_iso
    merged.sort(key=lambda p: p.z)
    return [p for p in merged if p.z <= PROFILE_Z_MAX_M]


def estimate_cloud_base(profile: list[ProfilePoint]) -> int | None:
    """Premier niveau (z croissant) où HU>=90 ou CLD_FRACT>=50."""
    for pt in profile:
        rh_hit = pt.rh is not None and pt.rh >= CLOUD_BASE_RH
        cld_hit = pt.cloud is not None and pt.cloud >= CLOUD_BASE_FRACT
        if rh_hit or cld_hit:
            return pt.z
    return None


def model_elevation(fields: Mapping[str, ExtractedField]) -> float | None:
    alt = fields.get("altitude")
    if alt is None or not alt.series:
        return None
    first_time = next(iter(alt.series))
    raw = alt.get(first_time, 0)
    if raw is None:
        # parfois niveau surface absent, n'importe quel level
        levels = alt.series[first_time]
        raw = next(iter(levels.values())) if levels else None
    return geopotential_to_m(raw)
