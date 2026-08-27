"""Client WCS 2.0.1 AROME 0.01° — GetCapabilities / DescribeCoverage / GetCoverage.

Toujours un subset spatial minuscule autour du point. Jamais la France entière.
"""

from __future__ import annotations

import logging
import threading
import time
import xml.etree.ElementTree as ET
from collections import deque
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

import httpx

from src.config import (
    CAPABILITIES_TTL_S,
    DOMAIN_LAT,
    DOMAIN_LON,
    WCS_BASE,
    WCS_PRODUCT,
    WCS_RATE_PER_MIN,
    WCS_VERSION,
    Settings,
    subset_bbox,
)
from src.fields import parse_coverage_id
from src.mf_auth import MeteoFranceAuth

logger = logging.getLogger(__name__)

_NS = {
    "wcs": "http://www.opengis.net/wcs/2.0",
    "ows": "http://www.opengis.net/ows/2.0",
    "gml": "http://www.opengis.net/gml/3.2",
    "gmlrgrid": "http://www.opengis.net/gml/3.3/rgrid",
}

_JWT_EXPIRED = "900901"


class WcsError(RuntimeError):
    pass


@dataclass(slots=True)
class WcsStats:
    requests: int = 0
    bytes_downloaded: int = 0
    cache_hits: int = 0
    cache_misses: int = 0
    extract_s: float = 0.0

    def add_bytes(self, n: int) -> None:
        self.bytes_downloaded += n

    def mb(self) -> float:
        return self.bytes_downloaded / (1024 * 1024)


@dataclass(slots=True)
class CoverageRef:
    coverage_id: str
    indicator: str
    run: str
    interval: str


@dataclass(slots=True)
class AxisDescription:
    forecast_horizons: list[timedelta]
    heights: list[int]
    pressures: list[int]


class _RateLimiter:
    def __init__(self, max_per_minute: int) -> None:
        self._max = max_per_minute
        self._times: deque[float] = deque()
        self._lock = threading.Lock()

    def acquire(self) -> None:
        with self._lock:
            now = time.monotonic()
            while self._times and now - self._times[0] > 60.0:
                self._times.popleft()
            if len(self._times) >= self._max:
                sleep_s = 60.0 - (now - self._times[0]) + 0.05
                if sleep_s > 0:
                    logger.info("Quota WCS : pause %.1fs", sleep_s)
                    time.sleep(sleep_s)
            self._times.append(time.monotonic())


def _strip_ns(tag: str) -> str:
    return tag.split("}", 1)[-1] if "}" in tag else tag


def _local_text(el: ET.Element, *names: str) -> str:
    for child in el:
        if _strip_ns(child.tag) in names and child.text:
            return child.text.strip()
    return ""


class MeteoFranceWcs:
    def __init__(self, settings: Settings, auth: MeteoFranceAuth) -> None:
        self._settings = settings
        self._auth = auth
        self._rate = _RateLimiter(WCS_RATE_PER_MIN)
        self.stats = WcsStats()
        self._cap_lock = threading.Lock()
        self._capabilities: list[CoverageRef] | None = None
        self._cap_at: float = 0.0
        self._desc_cache: dict[str, AxisDescription] = {}
        self._lon_axis = "long"

    @property
    def entry(self) -> str:
        return f"{WCS_PRODUCT}"

    def _url(self, op: str) -> str:
        return f"{WCS_BASE}/{self.entry}/{op}"

    def _client(self) -> httpx.Client:
        return httpx.Client(
            timeout=httpx.Timeout(self._settings.wcs_timeout_s, connect=20.0),
            follow_redirects=True,
            headers=self._auth.headers(),
        )

    def _get(self, url: str, params: list[tuple[str, str]]) -> httpx.Response:
        self._rate.acquire()
        self.stats.requests += 1
        last_err: Exception | None = None
        for attempt in range(1, 5):
            try:
                with self._client() as client:
                    resp = client.get(url, params=params)
                self.stats.add_bytes(len(resp.content))
                if resp.status_code == 401:
                    self._auth.invalidate()
                    logger.info("JWT expiré, nouveau token puis retry")
                    continue
                if resp.status_code in {502, 503, 504, 429}:
                    wait = attempt * 4
                    logger.warning(
                        "WCS HTTP %s, retry %s/4 dans %ss",
                        resp.status_code,
                        attempt,
                        wait,
                    )
                    time.sleep(wait)
                    continue
                return resp
            except httpx.HTTPError as exc:
                last_err = exc
                time.sleep(attempt * 3)
        raise WcsError(f"WCS injoignable: {last_err}")

    def get_capabilities(self, *, force: bool = False) -> list[CoverageRef]:
        now = time.monotonic()
        with self._cap_lock:
            if (
                not force
                and self._capabilities is not None
                and now - self._cap_at < CAPABILITIES_TTL_S
            ):
                return self._capabilities
            refs = self._fetch_capabilities()
            self._capabilities = refs
            self._cap_at = now
            runs = sorted({r.run for r in refs})
            inds = {r.indicator for r in refs}
            logger.info(
                "GetCapabilities: %s coverages, %s indicateurs, runs %s → %s",
                len(refs),
                len(inds),
                runs[0] if runs else "—",
                runs[-1] if runs else "—",
            )
            return refs

    def _fetch_capabilities(self) -> list[CoverageRef]:
        params = [
            ("service", "WCS"),
            ("version", WCS_VERSION),
            ("language", "eng"),
        ]
        resp = self._get(self._url("GetCapabilities"), params)
        if resp.status_code != 200:
            raise WcsError(f"GetCapabilities HTTP {resp.status_code}: {resp.text[:500]}")
        root = ET.fromstring(resp.content)
        refs: list[CoverageRef] = []
        for node in root.iter():
            if _strip_ns(node.tag) != "CoverageSummary":
                continue
            cov_id = ""
            for child in node:
                name = _strip_ns(child.tag)
                if name in {"CoverageId", "CoverageID"} and child.text:
                    cov_id = child.text.strip()
            if not cov_id:
                continue
            indicator, run, interval = parse_coverage_id(cov_id)
            refs.append(
                CoverageRef(
                    coverage_id=cov_id,
                    indicator=indicator,
                    run=run,
                    interval=interval,
                )
            )
        if not refs:
            raise WcsError("GetCapabilities: aucun CoverageId (abonnement AROME ?)")
        return refs

    def indicators(self) -> list[str]:
        return sorted({r.indicator for r in self.get_capabilities()})

    def runs_for(self, indicator: str) -> list[str]:
        runs = sorted({r.run for r in self.get_capabilities() if r.indicator == indicator})
        return runs

    def coverage_id(self, indicator: str, run: str, interval: str | None) -> str:
        cid = f"{indicator}___{run}"
        if interval:
            cid += f"_{interval}"
        return cid

    def find_coverage(
        self, indicator: str, run: str, interval: str | None
    ) -> CoverageRef | None:
        wanted_int = interval or ""
        for ref in self.get_capabilities():
            if ref.indicator == indicator and ref.run == run:
                if wanted_int:
                    if ref.interval == wanted_int:
                        return ref
                else:
                    if ref.interval == "":
                        return ref
        # interval demandé absent : prendre n'importe quel interval du couple
        for ref in self.get_capabilities():
            if ref.indicator == indicator and ref.run == run:
                return ref
        return None

    def describe(self, coverage_id: str) -> AxisDescription:
        cached = self._desc_cache.get(coverage_id)
        if cached is not None:
            return cached
        params = [
            ("service", "WCS"),
            ("version", WCS_VERSION),
            ("coverageid", coverage_id),
        ]
        resp = self._get(self._url("DescribeCoverage"), params)
        if resp.status_code != 200:
            raise WcsError(
                f"DescribeCoverage {coverage_id} HTTP {resp.status_code}: {resp.text[:400]}"
            )
        root = ET.fromstring(resp.content)
        horizons: list[timedelta] = []
        heights: list[int] = []
        pressures: list[int] = []
        for axis in root.iter():
            if _strip_ns(axis.tag) != "GeneralGridAxis":
                continue
            spanned = ""
            coeffs = ""
            for child in axis:
                n = _strip_ns(child.tag)
                if n == "gridAxesSpanned" and child.text:
                    spanned = child.text.strip()
                elif n == "coefficients" and child.text:
                    coeffs = child.text.strip()
            values = [int(float(x)) for x in coeffs.split()] if coeffs else []
            if spanned == "time":
                horizons = [timedelta(seconds=v) for v in values]
            elif spanned == "height":
                heights = values
            elif spanned == "pressure":
                pressures = values
        desc = AxisDescription(horizons, heights, pressures)
        self._desc_cache[coverage_id] = desc
        return desc

    def get_coverage(
        self,
        coverage_id: str,
        lat: float,
        lon: float,
        *,
        time_value: str | int | None = None,
        height: int | None = None,
        pressure: int | None = None,
        lon_axis: str | None = None,
    ) -> bytes:
        """GetCoverage GRIB, bbox 0.02° autour du point.

        `time_value` : secondes depuis le run, ou ISO 8601 UTC.
        """
        lat0, lat1, lon0, lon1 = subset_bbox(lat, lon)
        lat0 = max(DOMAIN_LAT[0], lat0)
        lat1 = min(DOMAIN_LAT[1], lat1)
        lon0 = max(DOMAIN_LON[0], lon0)
        lon1 = min(DOMAIN_LON[1], lon1)
        axis = lon_axis or self._lon_axis
        subsets = [
            f"lat({lat0:.5f},{lat1:.5f})",
            f"{axis}({lon0:.5f},{lon1:.5f})",
        ]
        if time_value is not None:
            subsets.append(f"time({time_value})")
        if height is not None:
            subsets.append(f"height({height})")
        if pressure is not None:
            subsets.append(f"pressure({pressure})")

        params: list[tuple[str, str]] = [
            ("service", "WCS"),
            ("version", WCS_VERSION),
            ("coverageid", coverage_id),
            ("format", "application/wmo-grib"),
        ]
        for s in subsets:
            params.append(("subset", s))

        resp = self._get(self._url("GetCoverage"), params)
        body = resp.content
        if resp.status_code != 200:
            raise WcsError(
                f"GetCoverage {coverage_id} HTTP {resp.status_code}: {resp.text[:500]}"
            )
        if _is_xml(body):
            if b"Exception" in body or b"exception" in body.lower():
                msg = _xml_exception(body)
                # Axe long vs lon : bascule automatique.
                if axis == "long" and _lon_axis_error(msg):
                    self._lon_axis = "lon"
                    logger.info("WCS refuse subset=long, bascule sur subset=lon")
                    return self.get_coverage(
                        coverage_id,
                        lat,
                        lon,
                        time_value=time_value,
                        height=height,
                        pressure=pressure,
                        lon_axis="lon",
                    )
                raise WcsError(f"GetCoverage {coverage_id}: {msg}")
            # Point unique renvoyé en XML plutôt qu'en GRIB.
            return body
        if not body.startswith(b"GRIB") and b"GRIB" not in body[:16]:
            preview = body[:200]
            raise WcsError(f"GetCoverage {coverage_id}: corps non-GRIB {preview!r}")
        return body


def _is_xml(body: bytes) -> bool:
    stripped = body.lstrip()
    return stripped.startswith(b"<?xml") or stripped.startswith(b"<")


def _xml_exception(body: bytes) -> str:
    try:
        root = ET.fromstring(body)
    except ET.ParseError:
        return body.decode("utf-8", errors="replace")[:400]
    texts = [el.text.strip() for el in root.iter() if el.text and el.text.strip()]
    return " | ".join(texts[:6]) or body.decode("utf-8", errors="replace")[:400]


def _lon_axis_error(msg: str) -> bool:
    lower = msg.lower()
    return "long" in lower or "lon" in lower or "axis" in lower or "subset" in lower


def theoretical_latest_run(now_utc: datetime | None = None) -> datetime:
    """Run le plus récent *théoriquement* publié (délais officiels)."""
    now = now_utc or datetime.now(timezone.utc)
    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)
    now = now.astimezone(timezone.utc)
    from src.config import RUN_AVAILABILITY_DELAY, RUN_HOURS_UTC

    candidates: list[datetime] = []
    for day_offset in range(0, 3):
        day = (now - timedelta(days=day_offset)).date()
        for hour in RUN_HOURS_UTC:
            init = datetime(day.year, day.month, day.day, hour, tzinfo=timezone.utc)
            available_at = init + RUN_AVAILABILITY_DELAY[hour]
            if available_at <= now and init <= now:
                candidates.append(init)
    if not candidates:
        # Fallback : dernier cycle avant maintenant, sans délai.
        hour = max(h for h in RUN_HOURS_UTC if h <= now.hour)
        return datetime(now.year, now.month, now.day, hour, tzinfo=timezone.utc)
    return max(candidates)


def run_to_wcs_id(run: datetime) -> str:
    """Format coverageId : 2026-08-27T12.00.00Z"""
    utc = run.astimezone(timezone.utc)
    return utc.strftime("%Y-%m-%dT%H.%M.%SZ")


def wcs_id_to_run(run_id: str) -> datetime:
    cleaned = run_id.replace(".", ":", 2)
    if cleaned.endswith("Z"):
        cleaned = cleaned[:-1] + "+00:00"
    return datetime.fromisoformat(cleaned).astimezone(timezone.utc)


def previous_run(run: datetime) -> datetime:
    from src.config import RUN_HOURS_UTC

    utc = run.astimezone(timezone.utc)
    idx = RUN_HOURS_UTC.index(utc.hour)
    if idx == 0:
        prev_day = utc - timedelta(days=1)
        return prev_day.replace(hour=RUN_HOURS_UTC[-1], minute=0, second=0, microsecond=0)
    return utc.replace(hour=RUN_HOURS_UTC[idx - 1], minute=0, second=0, microsecond=0)
