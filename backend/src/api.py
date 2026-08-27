"""FastAPI — GET /arome?lat=&lon=&from=&to="""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Any

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from src.config import in_arome_domain
from src.pipeline import AromePipeline, resolve_window

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger("arome.api")

app = FastAPI(
    title="AROME parapente V0",
    description=(
        "Profil vertical AROME 0.025° via Open-Meteo (models=arome_france) "
        "pour un Stüve : T, Td, vent. Données Météo-France / Open-Meteo CC BY 4.0."
    ),
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5173",
        "http://localhost:5173",
    ],
    allow_methods=["GET"],
    allow_headers=["*"],
)

_pipeline: AromePipeline | None = None


def get_pipeline() -> AromePipeline:
    global _pipeline
    if _pipeline is None:
        _pipeline = AromePipeline()
    return _pipeline


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "model": "AROME", "grid": "0.025", "source": "open-meteo"}


@app.get("/arome")
def arome(
    lat: float = Query(..., description="Latitude WGS84"),
    lon: float = Query(..., description="Longitude WGS84"),
    from_: str | None = Query(None, alias="from", description="Début ISO 8601 (Europe/Paris si naïf)"),
    to: str | None = Query(None, description="Fin ISO 8601"),
    force: bool = Query(False, description="Ignore le cache et relance l'extraction"),
) -> JSONResponse:
    if not in_arome_domain(lat, lon):
        raise HTTPException(
            status_code=400,
            detail=(
                "Point hors domaine AROME "
                "(lat 37.5–55.4 N, lon 12 W–16 E). Quota : un point, pas une carte."
            ),
        )
    try:
        t_from = _parse_iso(from_) if from_ else None
        t_to = _parse_iso(to) if to else None
        resolve_window(t_from, t_to)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    try:
        payload: dict[str, Any] = get_pipeline().forecast(
            lat, lon, time_from=t_from, time_to=t_to, force=force
        )
    except RuntimeError as exc:
        logger.exception("Config/auth")
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Extraction AROME")
        raise HTTPException(status_code=502, detail=f"Extraction AROME: {exc}") from exc

    return JSONResponse(content=payload)


def _parse_iso(value: str) -> datetime:
    text = value.strip()
    if text.endswith("Z"):
        text = text[:-1] + "+00:00"
    dt = datetime.fromisoformat(text)
    return dt
