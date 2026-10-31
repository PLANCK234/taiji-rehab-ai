"""Demo and research profiles cannot be crossed with a synthetic flag change."""

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app import seed_demo, seed_reassessment_demo
from app.db import get_db
from app.main import app
from app.runtime import demo_enabled


def test_demo_profile_requires_local_or_test_and_synthetic_flag(monkeypatch):
    monkeypatch.setenv("APP_PROFILE", "demo")
    monkeypatch.setenv("APP_ENV", "test")
    monkeypatch.setenv("ALLOW_SYNTHETIC_ONLY", "true")
    assert demo_enabled()
    monkeypatch.setenv("ALLOW_SYNTHETIC_ONLY", "false")
    assert not demo_enabled()
    with pytest.raises(HTTPException) as error:
        next(get_db())
    assert error.value.status_code == 503


@pytest.mark.parametrize("profile", ["research", "unknown"])
def test_non_demo_profile_refuses_routes_and_seeds(monkeypatch, profile):
    monkeypatch.setenv("APP_PROFILE", profile)
    monkeypatch.setenv("APP_ENV", "local")
    monkeypatch.setenv("ALLOW_SYNTHETIC_ONLY", "true")
    monkeypatch.setenv("DATABASE_URL", "sqlite:///unused-research-profile.sqlite")
    monkeypatch.setenv("DEMO_PASSWORD", "synthetic-test-password")
    assert not demo_enabled()
    with TestClient(app) as client:
        assert client.get("/health").status_code == 200
        assert client.get("/ready").status_code == 503
        assert client.get("/api/v1/studies").status_code == 503
    with pytest.raises(RuntimeError, match="restricted to synthetic local mode"):
        seed_demo.main()
    with pytest.raises(RuntimeError, match="restricted to synthetic local mode"):
        seed_reassessment_demo.main()
