"""CLI : python -m src.cli --lat 45.923 --lon 6.869"""

from __future__ import annotations

import argparse
import json
import logging
import sys
from datetime import datetime

from src.pipeline import AromePipeline, resolve_window


def _parse_iso(value: str | None) -> datetime | None:
    if not value:
        return None
    text = value.strip()
    if text.endswith("Z"):
        text = text[:-1] + "+00:00"
    return datetime.fromisoformat(text)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Dump JSON du profil vertical AROME 0.025° (Open-Meteo) pour un point GPS."
    )
    parser.add_argument("--lat", type=float, default=None, help="Latitude WGS84")
    parser.add_argument("--lon", type=float, default=None, help="Longitude WGS84")
    parser.add_argument("--from", dest="time_from", default=None, help="Début ISO 8601")
    parser.add_argument("--to", dest="time_to", default=None, help="Fin ISO 8601")
    parser.add_argument("--force", action="store_true", help="Ignore le cache")
    parser.add_argument("-v", "--verbose", action="store_true")
    args = parser.parse_args(argv)

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )

    if args.lat is None or args.lon is None:
        parser.error("--lat et --lon sont obligatoires")

    t_from = _parse_iso(args.time_from)
    t_to = _parse_iso(args.time_to)
    resolve_window(t_from, t_to)
    payload = AromePipeline().forecast(
        args.lat,
        args.lon,
        time_from=t_from,
        time_to=t_to,
        force=args.force,
    )
    json.dump(payload, sys.stdout, ensure_ascii=False, indent=2)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
