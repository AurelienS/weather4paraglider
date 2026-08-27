from __future__ import annotations

from fastapi.testclient import TestClient

from src.api import app


def test_health() -> None:
    client = TestClient(app)
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["model"] == "AROME"


def test_arome_rejects_point_outside_domain() -> None:
    client = TestClient(app)
    resp = client.get("/arome", params={"lat": 0.0, "lon": 0.0})
    assert resp.status_code == 400
    assert "hors domaine" in resp.json()["detail"]


def test_arome_rejects_inverted_window() -> None:
    client = TestClient(app)
    resp = client.get(
        "/arome",
        params={
            "lat": 45.923,
            "lon": 6.869,
            "from": "2026-08-28T20:00:00+02:00",
            "to": "2026-08-27T06:00:00+02:00",
        },
    )
    assert resp.status_code == 400
