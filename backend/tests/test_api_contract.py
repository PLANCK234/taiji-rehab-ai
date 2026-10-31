"""The checked-in API contract must describe the live FastAPI routes."""

import json
from pathlib import Path

from app.main import app


def test_openapi_snapshot_matches_live_application() -> None:
    snapshot = Path(__file__).resolve().parents[1] / "openapi.json"
    assert json.loads(snapshot.read_text(encoding="utf-8")) == app.openapi()
