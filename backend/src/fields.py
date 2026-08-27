"""Catalogue des champs AROME WCS et alias de coverageId.

Les identifiants exacts viennent de GetCapabilities. On ne mélange jamais
AROME 0.025° et 0.01°.
"""

from __future__ import annotations

import difflib
from dataclasses import dataclass
from enum import StrEnum
from typing import Literal

LevelKind = Literal["surface", "height", "isobar"]


class Wanted(StrEnum):
    T2M = "t2m"
    RH2M = "rh2m"
    U10 = "u10"
    V10 = "v10"
    U_GUST10 = "u_gust10"
    V_GUST10 = "v_gust10"
    CAPE = "cape"
    PRECIP = "precip"
    CLOUD_LOW = "cloud_low"
    CLOUD_MID = "cloud_mid"
    CLOUD_HIGH = "cloud_high"
    PSFC = "psfc"
    ALTITUDE = "altitude"
    T_HEIGHT = "t_height"
    HU_HEIGHT = "hu_height"
    U_HEIGHT = "u_height"
    V_HEIGHT = "v_height"
    TD_HEIGHT = "td_height"
    CLD_HEIGHT = "cld_height"
    T_ISOBAR = "t_isobar"
    HU_ISOBAR = "hu_isobar"
    U_ISOBAR = "u_isobar"
    V_ISOBAR = "v_isobar"
    Z_ISOBAR = "z_isobar"
    TD_ISOBAR = "td_isobar"
    CLD_ISOBAR = "cld_isobar"


@dataclass(frozen=True, slots=True)
class FieldSpec:
    wanted: Wanted
    preferred: tuple[str, ...]
    kind: LevelKind
    required: bool
    grib_vars: tuple[str, ...]
    interval: str | None = None  # e.g. PT1H for accumulations
    datagouv_pkg: str | None = None


# Noms WCS réels du produit 0.01° (GetCapabilities). Alias INSPIRE en repli.
FIELDS: tuple[FieldSpec, ...] = (
    FieldSpec(
        Wanted.T2M,
        ("T__HEIGHT", "TEMPERATURE__SPECIFIC_HEIGHT_LEVEL_ABOVE_GROUND"),
        "height",
        True,
        ("t2m", "t", "temperature"),
        datagouv_pkg="SP1",
    ),
    FieldSpec(
        Wanted.RH2M,
        ("HU__HEIGHT", "RELATIVE_HUMIDITY__SPECIFIC_HEIGHT_LEVEL_ABOVE_GROUND"),
        "height",
        True,
        ("r2", "r", "rh", "relative_humidity"),
        datagouv_pkg="SP1",
    ),
    FieldSpec(
        Wanted.U10,
        ("U__HEIGHT", "U_COMPONENT_OF_WIND__SPECIFIC_HEIGHT_LEVEL_ABOVE_GROUND"),
        "height",
        True,
        ("u10", "u", "u_component_of_wind"),
        datagouv_pkg="SP1",
    ),
    FieldSpec(
        Wanted.V10,
        ("V__HEIGHT", "V_COMPONENT_OF_WIND__SPECIFIC_HEIGHT_LEVEL_ABOVE_GROUND"),
        "height",
        True,
        ("v10", "v", "v_component_of_wind"),
        datagouv_pkg="SP1",
    ),
    FieldSpec(
        Wanted.U_GUST10,
        ("U_RAF__HEIGHT", "U_COMPONENT_OF_WIND_GUST__SPECIFIC_HEIGHT_LEVEL_ABOVE_GROUND"),
        "height",
        True,
        ("ugust", "u_gust", "unknown"),
        datagouv_pkg="SP1",
    ),
    FieldSpec(
        Wanted.V_GUST10,
        ("V_RAF__HEIGHT", "V_COMPONENT_OF_WIND_GUST__SPECIFIC_HEIGHT_LEVEL_ABOVE_GROUND"),
        "height",
        True,
        ("vgust", "v_gust", "unknown"),
        datagouv_pkg="SP1",
    ),
    FieldSpec(
        Wanted.CAPE,
        ("CAPE_INS__GROUND", "CONVECTIVE_AVAILABLE_POTENTIAL_ENERGY__GROUND_OR_WATER_SURFACE"),
        "surface",
        True,
        ("cape", "unknown"),
        datagouv_pkg="SP2",
    ),
    FieldSpec(
        Wanted.PRECIP,
        ("EAU__GROUND", "TOTAL_WATER_PRECIPITATION__GROUND_OR_WATER_SURFACE", "PRECIP__GROUND"),
        "surface",
        True,
        ("tp", "unknown", "paramId_0"),
        interval="PT1H",
        datagouv_pkg="SP2",
    ),
    FieldSpec(
        Wanted.CLOUD_LOW,
        ("NEBBAS__GROUND", "LOW_CLOUD_COVER__GROUND_OR_WATER_SURFACE"),
        "surface",
        True,
        ("lcc", "unknown"),
        datagouv_pkg="SP2",
    ),
    FieldSpec(
        Wanted.CLOUD_MID,
        ("NEBMOY__GROUND", "MEDIUM_CLOUD_COVER__GROUND_OR_WATER_SURFACE"),
        "surface",
        True,
        ("mcc", "unknown"),
        datagouv_pkg="SP2",
    ),
    FieldSpec(
        Wanted.CLOUD_HIGH,
        ("NEBHAU__GROUND", "HIGH_CLOUD_COVER__GROUND_OR_WATER_SURFACE"),
        "surface",
        True,
        ("hcc", "unknown"),
        datagouv_pkg="SP2",
    ),
    FieldSpec(
        Wanted.PSFC,
        ("P__GROUND", "PRESSURE__GROUND_OR_WATER_SURFACE"),
        "surface",
        True,
        ("sp", "pres", "unknown"),
        datagouv_pkg="SP2",
    ),
    FieldSpec(
        Wanted.ALTITUDE,
        ("ALTITUDE__GROUND", "GEOMETRIC_HEIGHT__GROUND_OR_WATER_SURFACE"),
        "surface",
        True,
        ("orog", "z", "gh", "unknown"),
        datagouv_pkg="SP3",
    ),
    FieldSpec(
        Wanted.T_HEIGHT,
        ("T__HEIGHT", "TEMPERATURE__SPECIFIC_HEIGHT_LEVEL_ABOVE_GROUND"),
        "height",
        False,
        ("t", "temperature"),
    ),
    FieldSpec(
        Wanted.HU_HEIGHT,
        ("HU__HEIGHT", "RELATIVE_HUMIDITY__SPECIFIC_HEIGHT_LEVEL_ABOVE_GROUND"),
        "height",
        True,
        ("r", "q", "relative_humidity"),
        datagouv_pkg="HP1",
    ),
    FieldSpec(
        Wanted.U_HEIGHT,
        ("U__HEIGHT", "U_COMPONENT_OF_WIND__SPECIFIC_HEIGHT_LEVEL_ABOVE_GROUND"),
        "height",
        True,
        ("u", "u_component_of_wind"),
        datagouv_pkg="HP1",
    ),
    FieldSpec(
        Wanted.V_HEIGHT,
        ("V__HEIGHT", "V_COMPONENT_OF_WIND__SPECIFIC_HEIGHT_LEVEL_ABOVE_GROUND"),
        "height",
        True,
        ("v", "v_component_of_wind"),
        datagouv_pkg="HP1",
    ),
    FieldSpec(
        Wanted.TD_HEIGHT,
        ("TD__HEIGHT", "DEW_POINT_TEMPERATURE__SPECIFIC_HEIGHT_LEVEL_ABOVE_GROUND"),
        "height",
        False,
        ("d2m", "d", "dewpoint"),
    ),
    FieldSpec(
        Wanted.CLD_HEIGHT,
        (
            "CLOUD_COVER__SPECIFIC_HEIGHT_LEVEL_ABOVE_GROUND",
            "CLOUD_AREA_FRACTION__SPECIFIC_HEIGHT_LEVEL_ABOVE_GROUND",
        ),
        "height",
        False,
        ("cc", "unknown"),
    ),
    FieldSpec(
        Wanted.T_ISOBAR,
        ("T__ISOBAR", "TEMPERATURE__ISOBARIC_SURFACE"),
        "isobar",
        False,
        ("t", "temperature"),
    ),
    FieldSpec(
        Wanted.HU_ISOBAR,
        ("HU__ISOBAR", "RELATIVE_HUMIDITY__ISOBARIC_SURFACE"),
        "isobar",
        False,
        ("r", "relative_humidity"),
    ),
    FieldSpec(
        Wanted.U_ISOBAR,
        ("U__ISOBAR", "U_COMPONENT_OF_WIND__ISOBARIC_SURFACE"),
        "isobar",
        False,
        ("u", "u_component_of_wind"),
    ),
    FieldSpec(
        Wanted.V_ISOBAR,
        ("V__ISOBAR", "V_COMPONENT_OF_WIND__ISOBARIC_SURFACE"),
        "isobar",
        False,
        ("v", "v_component_of_wind"),
    ),
    FieldSpec(
        Wanted.Z_ISOBAR,
        ("Z__ISOBAR", "GEOPOTENTIAL__ISOBARIC_SURFACE"),
        "isobar",
        False,
        ("z", "gh", "unknown"),
    ),
    FieldSpec(
        Wanted.TD_ISOBAR,
        ("DEW_POINT_TEMPERATURE__ISOBARIC_SURFACE",),
        "isobar",
        False,
        ("d", "dewpoint"),
    ),
    FieldSpec(
        Wanted.CLD_ISOBAR,
        (
            "CLOUD_COVER__ISOBARIC_SURFACE",
            "CLOUD_AREA_FRACTION__ISOBARIC_SURFACE",
        ),
        "isobar",
        False,
        ("cc", "unknown"),
    ),
)

SURFACE_FIXED_HEIGHT: dict[Wanted, int] = {
    Wanted.T2M: 2,
    Wanted.RH2M: 2,
    Wanted.U10: 10,
    Wanted.V10: 10,
    Wanted.U_GUST10: 10,
    Wanted.V_GUST10: 10,
}

# HP1 public 0.01° : uniquement 10/20/50/100 m — le profil haut doit venir du WCS.
DATAGOUV_HP1_LEVELS: tuple[int, ...] = (10, 20, 50, 100)


def parse_coverage_id(coverage_id: str) -> tuple[str, str, str]:
    """Retourne (indicator, run `YYYY-MM-DDTHH.MM.SSZ`, interval)."""
    if "___" not in coverage_id:
        return coverage_id, "", ""
    indicator, rest = coverage_id.split("___", 1)
    if "Z" in rest:
        run, after = rest.split("Z", 1)
        run = run + "Z"
        interval = after.strip("_")
    else:
        run, interval = rest, ""
    return indicator, run, interval


def match_indicator(wanted: str, available: list[str]) -> str | None:
    """CoverageId le plus proche. Exact d'abord, sinon prefixe, sinon difflib."""
    if wanted in available:
        return wanted
    prefixed = [a for a in available if a.startswith(wanted)]
    if prefixed:
        return sorted(prefixed)[0]
    if not available:
        return None
    hits = difflib.get_close_matches(wanted, available, n=1, cutoff=0.88)
    return hits[0] if hits else None


def resolve_field(spec: FieldSpec, indicators: list[str]) -> tuple[str | None, str | None]:
    """Retourne (indicator retenu, warning si approximation)."""
    for pref in spec.preferred:
        if pref in indicators:
            return pref, None
        hit = match_indicator(pref, indicators)
        if hit is None:
            continue
        if hit == pref:
            return hit, None
        return hit, f"{spec.wanted}: coverage '{pref}' absent, repli sur '{hit}'"
    if spec.kind == "isobar":
        return None, (
            f"{spec.wanted}: pas de coverage isobare dans le WCS 0.01° "
            f"(cherché {spec.preferred[0]})"
        )
    return None, f"{spec.wanted}: aucun coverage WCS proche de {spec.preferred[0]}"
