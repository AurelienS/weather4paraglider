"""Cache disque des extraits point (JSON final), jamais des grilles France."""

from __future__ import annotations

import json
import logging
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from src.config import round_point

logger = logging.getLogger(__name__)

_locks: dict[str, threading.RLock] = {}
_locks_guard = threading.Lock()


def cache_key(lat: float, lon: float, run_init_utc: str, window_from: str, window_to: str) -> str:
    rlat, rlon = round_point(lat, lon)
    return f"{rlat:.2f}_{rlon:.2f}|{run_init_utc}|{window_from}|{window_to}"


def cache_path(root: Path, lat: float, lon: float, run_init_utc: str, window_from: str, window_to: str) -> Path:
    rlat, rlon = round_point(lat, lon)
    safe_from = window_from.replace(":", "").replace("+", "p")
    safe_to = window_to.replace(":", "").replace("+", "p")
    folder = root / f"{rlat:.2f}_{rlon:.2f}" / run_init_utc.replace(":", "")
    folder.mkdir(parents=True, exist_ok=True)
    return folder / f"{safe_from}_{safe_to}.json"


def _lock_for(path: Path) -> threading.RLock:
    key = str(path)
    with _locks_guard:
        if key not in _locks:
            _locks[key] = threading.RLock()
        return _locks[key]


class PointCache:
    def __init__(self, root: Path) -> None:
        self.root = root
        self.root.mkdir(parents=True, exist_ok=True)

    def read(
        self,
        lat: float,
        lon: float,
        run_init_utc: str,
        window_from: str,
        window_to: str,
    ) -> dict[str, Any] | None:
        path = cache_path(self.root, lat, lon, run_init_utc, window_from, window_to)
        if not path.is_file():
            return None
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            logger.warning("Cache illisible %s: %s", path, exc)
            return None
        cached_run = data.get("runInitUtc")
        if cached_run != run_init_utc:
            logger.info("Cache miss (run %s ≠ %s)", cached_run, run_init_utc)
            return None
        logger.info("Cache hit %s", path)
        return data

    def write(
        self,
        lat: float,
        lon: float,
        run_init_utc: str,
        window_from: str,
        window_to: str,
        payload: dict[str, Any],
    ) -> Path:
        path = cache_path(self.root, lat, lon, run_init_utc, window_from, window_to)
        with _lock_for(path):
            path.write_text(
                json.dumps(payload, ensure_ascii=False, indent=None),
                encoding="utf-8",
            )
        logger.info("Cache write %s", path)
        return path

    def lock(
        self,
        lat: float,
        lon: float,
        run_init_utc: str,
        window_from: str,
        window_to: str,
    ) -> threading.Lock:
        path = cache_path(self.root, lat, lon, run_init_utc, window_from, window_to)
        return _lock_for(path)


def iso_utc(dt: datetime) -> str:
    utc = dt.astimezone(timezone.utc)
    return utc.strftime("%Y-%m-%dT%H:%M:%SZ")
