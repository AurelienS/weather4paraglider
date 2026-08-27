"""OAuth2 client_credentials Météo-France (portail-api)."""

from __future__ import annotations

import logging
import threading
import time
from dataclasses import dataclass

import httpx

from src.config import TOKEN_URL, Settings

logger = logging.getLogger(__name__)

# Le JWT portail dure ~1 h ; on rafraîchit un peu avant.
_TOKEN_TTL_S = 50 * 60


@dataclass(slots=True)
class _CachedToken:
    value: str
    expires_at: float


class MeteoFranceAuth:
    """Token Bearer auto-refresh à partir de METEOFRANCE_APPLICATION_ID."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._lock = threading.Lock()
        self._cached: _CachedToken | None = None

    def mode(self) -> str:
        return "apikey" if self._settings.api_key else "oauth2"

    def headers(self) -> dict[str, str]:
        if self._settings.api_key:
            return {"apikey": self._settings.api_key, "accept": "*/*"}
        return {"Authorization": f"Bearer {self.token()}", "accept": "*/*"}

    def token(self) -> str:
        if self._settings.api_key:
            return ""
        now = time.monotonic()
        with self._lock:
            if self._cached and now < self._cached.expires_at:
                return self._cached.value
            token = self._fetch()
            self._cached = _CachedToken(token, now + _TOKEN_TTL_S)
            logger.info("Nouveau token Météo-France obtenu (TTL ~50 min)")
            return token

    def invalidate(self) -> None:
        with self._lock:
            self._cached = None

    def _fetch(self) -> str:
        if not self._settings.application_id:
            raise RuntimeError("METEOFRANCE_APPLICATION_ID requis pour OAuth2")
        headers = {
            "Authorization": f"Basic {self._settings.application_id}",
            "Content-Type": "application/x-www-form-urlencoded",
        }
        with httpx.Client(timeout=self._settings.token_timeout_s) as client:
            resp = client.post(
                TOKEN_URL,
                headers=headers,
                data={"grant_type": "client_credentials"},
            )
        if resp.status_code >= 400:
            raise RuntimeError(
                f"Token Météo-France HTTP {resp.status_code}: {resp.text[:400]}"
            )
        payload = resp.json()
        access = payload.get("access_token")
        if not access:
            raise RuntimeError(f"Réponse token inattendue: {payload!r}")
        return str(access)
