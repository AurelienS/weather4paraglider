"""Repli data.gouv.fr : paquets AROME 0.01° uniquement si le WCS refuse un champ.

Les paquets horaires publics SP/HP1 sont tronqués (HP1 : 10/20/50/100 m).
On n'utilise jamais AROME 0.025°. La grille France n'est pas mise en cache :
téléchargement temp → extrait point → suppression.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

import httpx

from src.config import DATAGOUV_API, Settings
from src.fields import DATAGOUV_HP1_LEVELS, Wanted
from src.grib_extract import ExtractedField, extract_grib_bytes

logger = logging.getLogger(__name__)

# Champs que les paquets 0.01° publics peuvent fournir.
PKG_FOR: dict[Wanted, str] = {
    Wanted.T2M: "SP1",
    Wanted.RH2M: "SP1",
    Wanted.U10: "SP1",
    Wanted.V10: "SP1",
    Wanted.U_GUST10: "SP1",
    Wanted.V_GUST10: "SP1",
    Wanted.PRECIP: "SP2",
    Wanted.CLOUD_LOW: "SP2",
    Wanted.CLOUD_MID: "SP2",
    Wanted.CLOUD_HIGH: "SP2",
    Wanted.CAPE: "SP2",
    Wanted.PSFC: "SP2",
    Wanted.ALTITUDE: "SP3",
    Wanted.HU_HEIGHT: "HP1",
    Wanted.U_HEIGHT: "HP1",
    Wanted.V_HEIGHT: "HP1",
}


class DataGouvFallback:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._index: dict[str, str] | None = None

    def available_for(self, wanted: Wanted) -> bool:
        return wanted in PKG_FOR

    def hp1_levels_only(self) -> tuple[int, ...]:
        return DATAGOUV_HP1_LEVELS

    def fetch_point(
        self,
        wanted: Wanted,
        run: datetime,
        lead_hour: int,
        lat: float,
        lon: float,
    ) -> ExtractedField | None:
        pkg = PKG_FOR.get(wanted)
        if pkg is None:
            return None
        url = self._resource_url(pkg, run, lead_hour)
        if url is None:
            logger.warning("data.gouv: pas de ressource %s run=%s +%sh", pkg, run, lead_hour)
            return None
        logger.info("Fallback data.gouv %s %s +%02dH (extrait point, grille jetée)", pkg, run, lead_hour)
        with httpx.Client(timeout=180.0, follow_redirects=True) as client:
            resp = client.get(url)
        if resp.status_code != 200:
            logger.warning("data.gouv HTTP %s pour %s", resp.status_code, url)
            return None
        # Ne pas écrire la France entière dans le cache : tmp + unlink.
        extracted = extract_grib_bytes(
            resp.content,
            lat,
            lon,
            wanted.value,
            run_init=run.astimezone(timezone.utc),
        )
        del resp
        return extracted

    def _resource_url(self, pkg: str, run: datetime, lead_hour: int) -> str | None:
        run_iso = run.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        filename = f"arome__001__{pkg}__{lead_hour:02d}H__{run_iso}.grib2"
        index = self._dataset_index()
        # match souple : filename ou suffixe
        if filename in index:
            return index[filename]
        needle = f"arome__001__{pkg}__{lead_hour:02d}H__"
        for name, url in index.items():
            if needle in name and run_iso[:13] in name:
                return url
        return None

    def _dataset_index(self) -> dict[str, str]:
        if self._index is not None:
            return self._index
        with httpx.Client(timeout=60.0) as client:
            resp = client.get(DATAGOUV_API)
        resp.raise_for_status()
        payload: dict[str, Any] = resp.json()
        index: dict[str, str] = {}
        for res in payload.get("resources", []):
            title = str(res.get("title") or res.get("name") or "")
            url = res.get("url")
            if title and url:
                index[title] = str(url)
        self._index = index
        logger.info("data.gouv index: %s ressources", len(index))
        return index
