"""Synthetic-only access and session regression tests (FR-001 / AT-05 read scope)."""

import uuid
from datetime import datetime, timedelta, timezone

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.db import Base, get_db
from app.main import app
from app.models import (
    AuditEvent,
    LoginRateLimit,
    LoginSession,
    Participant,
    ParticipantAssignment,
    Study,
    StudyAssignment,
    User,
)
from app.security import cookie_settings, password_hash, session_cookie_name


@pytest.fixture
def seeded_api(monkeypatch):
    monkeypatch.setenv("ALLOW_SYNTHETIC_ONLY", "true")
    monkeypatch.setenv("APP_ENV", "test")
    monkeypatch.setenv("SESSION_SECRET", "synthetic-test-only-secret-with-32-characters")
    monkeypatch.setenv("APP_PUBLIC_URL", "http://localhost:3000")
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)

    with Session(engine) as db:
        study_a, study_b = Study(code="SYN-A"), Study(code="SYN-B")
        clinician = User(
            email="clinician@example.org",
            password_hash=password_hash.hash("synthetic-password-123"),
            role="clinician",
        )
        analyst = User(
            email="analyst@example.org",
            password_hash=password_hash.hash("synthetic-password-123"),
            role="analyst",
        )
        db.add_all([study_a, study_b, clinician, analyst])
        db.flush()
        assigned = Participant(study_id=study_a.id, study_code="SYN-001")
        same_study_unassigned = Participant(study_id=study_a.id, study_code="SYN-002")
        other_study = Participant(study_id=study_b.id, study_code="SYN-003")
        db.add_all([assigned, same_study_unassigned, other_study])
        db.flush()
        db.add_all(
            [
                StudyAssignment(user_id=clinician.id, study_id=study_a.id),
                StudyAssignment(user_id=analyst.id, study_id=study_a.id),
                ParticipantAssignment(user_id=clinician.id, participant_id=assigned.id),
                ParticipantAssignment(user_id=clinician.id, participant_id=other_study.id),
            ]
        )
        ids = {
            "assigned": assigned.id,
            "same_study_unassigned": same_study_unassigned.id,
            "other_study": other_study.id,
            "study_a": study_a.id,
            "clinician": clinician.id,
        }
        db.commit()

    def override_db():
        with Session(engine) as db:
            yield db

    app.dependency_overrides[get_db] = override_db
    with TestClient(app) as client:
        yield client, engine, ids
    app.dependency_overrides.clear()
    engine.dispose()


def login(client: TestClient, email: str = "clinician@example.org"):
    return client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "synthetic-password-123"},
        headers={"Origin": "http://localhost:3000"},
    )


def test_authentication_and_cookie_flags(seeded_api) -> None:
    client, _, ids = seeded_api
    assert client.get("/api/v1/auth/me").status_code == 401
    assert client.get(f"/api/v1/participants/{ids['assigned']}").status_code == 401
    response = login(client)
    assert response.status_code == 200
    assert response.json()["role"] == "clinician"
    cookies = response.headers.get_list("set-cookie")
    assert any("taiji_session=" in item and "httponly" in item.lower() for item in cookies)
    assert all("samesite=strict" in item.lower() for item in cookies)
    assert client.get("/api/v1/auth/me").status_code == 200
    studies = client.get("/api/v1/studies")
    assert studies.status_code == 200
    assert [row["code"] for row in studies.json()] == ["SYN-A"]


def test_study_and_participant_scope_and_audit(seeded_api) -> None:
    client, engine, ids = seeded_api
    assert login(client).status_code == 200
    permitted = client.get(f"/api/v1/participants/{ids['assigned']}")
    assert permitted.status_code == 200
    assert permitted.json()["study_code"] == "SYN-001"
    for key in ("same_study_unassigned", "other_study"):
        denied = client.get(f"/api/v1/participants/{ids[key]}")
        assert denied.status_code == 403
        assert "SYN-" not in denied.text
    unknown = client.get(f"/api/v1/participants/{uuid.uuid4()}")
    assert unknown.status_code == 403
    assert unknown.json()["error"]["code"] == denied.json()["error"]["code"]

    with Session(engine) as db:
        events = db.scalars(select(AuditEvent).where(AuditEvent.action == "read")).all()
        assert [event.outcome for event in events] == [
            "allowed", "denied", "denied", "denied"
        ]
        assert all(event.actor_id == ids["clinician"] for event in events)


def test_role_denial(seeded_api) -> None:
    client, _, ids = seeded_api
    assert login(client, "analyst@example.org").status_code == 200
    response = client.get(f"/api/v1/participants/{ids['assigned']}")
    assert response.status_code == 403
    assert "SYN-001" not in response.text


def test_csrf_logout_and_revocation(seeded_api) -> None:
    client, engine, _ = seeded_api
    assert login(client).status_code == 200
    assert client.post("/api/v1/auth/logout").status_code == 403
    assert client.post(
        "/api/v1/auth/logout", headers={"X-CSRF-Token": "wrong"}
    ).status_code == 403
    csrf = client.cookies.get("taiji_csrf")
    response = client.post("/api/v1/auth/logout", headers={"X-CSRF-Token": csrf})
    assert response.status_code == 204
    assert client.get("/api/v1/auth/me").status_code == 401
    with Session(engine) as db:
        row = db.scalar(select(LoginSession))
        assert row is not None and row.revoked_at is not None


def test_expired_session_and_origin_check(seeded_api) -> None:
    client, engine, _ = seeded_api
    denied = client.post(
        "/api/v1/auth/login",
        json={"email": "clinician@example.org", "password": "synthetic-password-123"},
        headers={"Origin": "https://example.net"},
    )
    assert denied.status_code == 403
    assert login(client).status_code == 200
    with Session(engine) as db:
        row = db.scalar(select(LoginSession))
        assert row is not None
        row.expires_at = datetime.now(timezone.utc) - timedelta(seconds=1)
        db.commit()
    assert client.get("/api/v1/auth/me").status_code == 401


def test_invalid_credentials_and_rate_limit(seeded_api) -> None:
    client, engine, _ = seeded_api
    for _ in range(5):
        response = client.post(
            "/api/v1/auth/login",
            json={"email": "clinician@example.org", "password": "incorrect"},
        )
        assert response.status_code == 401
        assert response.json()["error"]["code"] == "AUTH_REQUIRED"
        assert "clinician@example.org" not in response.text
    assert login(client).status_code == 429
    with Session(engine) as db:
        events = db.scalars(select(AuditEvent).where(AuditEvent.action == "login")).all()
        assert len(events) == 6
        assert all(event.actor_id is None for event in events)


def test_non_synthetic_mode_is_closed(monkeypatch) -> None:
    monkeypatch.setenv("ALLOW_SYNTHETIC_ONLY", "false")
    with pytest.raises(HTTPException) as error:
        next(get_db())
    assert error.value.status_code == 503


def test_rate_window_resets_and_success_clears_counter(seeded_api) -> None:
    client, engine, _ = seeded_api
    for _ in range(5):
        assert client.post(
            "/api/v1/auth/login",
            json={"email": "clinician@example.org", "password": "incorrect"},
        ).status_code == 401
    with Session(engine) as db:
        row = db.scalar(select(LoginRateLimit))
        assert row is not None and row.failures == 5
        row.window_started_at = datetime.now(timezone.utc) - timedelta(minutes=16)
        db.commit()
    assert login(client).status_code == 200
    with Session(engine) as db:
        row = db.scalar(select(LoginRateLimit))
        assert row is not None and row.failures == 0


def test_production_cookie_flags(monkeypatch) -> None:
    monkeypatch.setenv("APP_ENV", "production")
    assert cookie_settings() == {
        "secure": True, "httponly": True, "samesite": "strict", "path": "/"
    }
    assert session_cookie_name() == "__Host-taiji_session"


def test_validation_error_never_echoes_password(seeded_api) -> None:
    client, _, _ = seeded_api
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "invalid", "password": "sensitive-synthetic-string"},
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "INVALID_INPUT"
    assert "sensitive-synthetic-string" not in response.text
