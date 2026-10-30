"""S1-02 synthetic-only intake, authorization and unknown screening tests."""

import uuid

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
    ConsentRecord,
    Participant,
    ParticipantAssignment,
    ScreeningRecord,
    Study,
    StudyAssignment,
    User,
)
from app.security import password_hash


@pytest.fixture
def intake_api(monkeypatch):
    monkeypatch.setenv("ALLOW_SYNTHETIC_ONLY", "true")
    monkeypatch.setenv("APP_ENV", "test")
    monkeypatch.setenv("SESSION_SECRET", "synthetic-intake-test-secret-with-32-characters")
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
            email="intake-clinician@example.org",
            password_hash=password_hash.hash("synthetic-password-123"),
            role="clinician",
        )
        analyst = User(
            email="intake-analyst@example.org",
            password_hash=password_hash.hash("synthetic-password-123"),
            role="analyst",
        )
        db.add_all([study_a, study_b, clinician, analyst])
        db.flush()
        assigned = Participant(study_id=study_a.id, study_code="SYN-BASE")
        unassigned = Participant(study_id=study_a.id, study_code="SYN-HIDDEN")
        cross_study = Participant(study_id=study_b.id, study_code="SYN-CROSS")
        db.add_all([assigned, unassigned, cross_study])
        db.flush()
        db.add_all(
            [
                StudyAssignment(user_id=clinician.id, study_id=study_a.id),
                StudyAssignment(user_id=analyst.id, study_id=study_a.id),
                ParticipantAssignment(user_id=clinician.id, participant_id=assigned.id),
                ParticipantAssignment(user_id=clinician.id, participant_id=cross_study.id),
            ]
        )
        ids = {
            "study_a": study_a.id,
            "study_b": study_b.id,
            "assigned": assigned.id,
            "unassigned": unassigned.id,
            "cross_study": cross_study.id,
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


def login(client: TestClient, email: str = "intake-clinician@example.org") -> None:
    response = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "synthetic-password-123"},
        headers={"Origin": "http://localhost:3000"},
    )
    assert response.status_code == 200


def write_headers(client: TestClient, key: str) -> dict[str, str]:
    return {"X-CSRF-Token": client.cookies["taiji_csrf"], "Idempotency-Key": key}


def test_create_scope_idempotency_and_list(intake_api) -> None:
    client, engine, ids = intake_api
    payload = {"study_id": str(ids["study_a"]), "study_code": "SYN-NEW001"}
    assert client.get("/api/v1/participants").status_code == 401
    login(client)
    assert [row["study_code"] for row in client.get("/api/v1/participants").json()] == [
        "SYN-BASE"
    ]
    assert client.post(
        "/api/v1/participants", json=payload, headers={"Idempotency-Key": "create-0000000001"}
    ).status_code == 403
    assert client.post(
        "/api/v1/participants",
        json={**payload, "study_id": str(ids["study_b"])},
        headers=write_headers(client, "create-0000000002"),
    ).status_code == 403
    created = client.post(
        "/api/v1/participants", json=payload, headers=write_headers(client, "create-0000000003")
    )
    assert created.status_code == 201
    assert created.json()["study_code"] == "SYN-NEW001"
    replay = client.post(
        "/api/v1/participants", json=payload, headers=write_headers(client, "create-0000000003")
    )
    assert replay.status_code == 201 and replay.json()["id"] == created.json()["id"]
    assert client.post(
        "/api/v1/participants",
        json={**payload, "study_code": "SYN-DIFFERENT"},
        headers=write_headers(client, "create-0000000003"),
    ).status_code == 409
    assert client.post(
        "/api/v1/participants", json=payload, headers=write_headers(client, "create-0000000004")
    ).status_code == 409
    assert client.post(
        "/api/v1/participants",
        json={**payload, "name": "synthetic forbidden field"},
        headers=write_headers(client, "create-0000000005"),
    ).status_code == 422
    visible = [row["study_code"] for row in client.get("/api/v1/participants").json()]
    assert visible == ["SYN-BASE", "SYN-NEW001"]
    with Session(engine) as db:
        assert db.scalar(
            select(ParticipantAssignment).where(
                ParticipantAssignment.participant_id == uuid.UUID(created.json()["id"])
            )
        ) is not None
        assert len(
            db.scalars(select(Participant).where(Participant.study_code == "SYN-NEW001")).all()
        ) == 1
        create_events = db.scalars(select(AuditEvent).where(AuditEvent.action == "create")).all()
        assert {event.outcome for event in create_events} == {"allowed", "denied"}

    login(client, "intake-analyst@example.org")
    assert client.get("/api/v1/participants").status_code == 403
    assert client.post(
        "/api/v1/participants", json=payload, headers=write_headers(client, "create-0000000006")
    ).status_code == 403


def test_consent_history_scope_and_photo_route_closed(intake_api) -> None:
    client, engine, ids = intake_api
    login(client)
    path = f"/api/v1/participants/{ids['assigned']}/consents"
    assert client.get(path).json() == {"state": "not_recorded", "records": []}
    first = {
        "document_version": "SYN-FORM-V1",
        "purpose_code": "SYN-DEMO-USE",
        "decision": "granted",
        "photo_scope": True,
    }
    assert client.post(
        path, json=first, headers={"Idempotency-Key": "consent-000000001"}
    ).status_code == 403
    created = client.post(path, json=first, headers=write_headers(client, "consent-000000001"))
    assert created.status_code == 201
    assert client.post(
        path, json=first, headers=write_headers(client, "consent-000000001")
    ).json()["id"] == created.json()["id"]
    assert client.post(
        path,
        json={**first, "decision": "withdrawn", "photo_scope": False},
        headers=write_headers(client, "consent-000000002"),
    ).status_code == 422
    withdrawal = {
        **first,
        "decision": "withdrawn",
        "photo_scope": False,
        "change_reason": "SYN-DEMO-CHANGE",
    }
    assert client.post(
        path, json=withdrawal, headers=write_headers(client, "consent-000000003")
    ).status_code == 201
    history = client.get(path).json()
    assert history["state"] == "withdrawn"
    assert len(history["records"]) == 2
    assert client.post(
        path,
        json={**first, "decision": "refused"},
        headers=write_headers(client, "consent-000000004"),
    ).status_code == 422
    for denied_id in (ids["unassigned"], ids["cross_study"]):
        denied_path = f"/api/v1/participants/{denied_id}/consents"
        assert client.get(denied_path).status_code == 403
        assert client.post(
            denied_path, json=first, headers=write_headers(client, f"consent-{denied_id}")
        ).status_code == 403
    assert client.post(f"/api/v1/participants/{ids['assigned']}/images").status_code == 404
    with Session(engine) as db:
        assert len(db.scalars(select(ConsentRecord)).all()) == 2


def test_screening_unknown_never_becomes_safe(intake_api) -> None:
    client, engine, ids = intake_api
    login(client)
    path = f"/api/v1/participants/{ids['assigned']}/screenings"
    assert client.get(path).json() == {"review_state": "not_assessed", "records": []}
    first = {"item_code": "SYN-ITEM-01", "answer": "unknown"}
    assert client.post(
        path, json=first, headers=write_headers(client, "screen-0000000000")
    ).status_code == 403
    consent_path = f"/api/v1/participants/{ids['assigned']}/consents"
    consent = {
        "document_version": "SYN-FORM-V1",
        "purpose_code": "SYN-DEMO-USE",
        "decision": "granted",
        "photo_scope": False,
    }
    assert client.post(
        consent_path, json=consent, headers=write_headers(client, "consent-000000011")
    ).status_code == 201
    assert client.post(
        path, json=first, headers=write_headers(client, "screen-0000000001")
    ).status_code == 201
    assert client.get(path).json()["review_state"] == "needs_review"
    assert client.post(
        path,
        json={**first, "answer": "no"},
        headers=write_headers(client, "screen-0000000002"),
    ).status_code == 422
    assert client.post(
        path,
        json={**first, "answer": "no", "change_reason": "SYN-CORRECTION"},
        headers=write_headers(client, "screen-0000000003"),
    ).status_code == 201
    history = client.get(path).json()
    assert history["review_state"] == "needs_review"
    assert {row["answer"] for row in history["records"]} == {"unknown", "no"}
    assert "safe" not in str(history).lower()
    assert client.post(
        consent_path,
        json={**consent, "decision": "withdrawn", "change_reason": "SYN-WITHDRAWAL"},
        headers=write_headers(client, "consent-000000012"),
    ).status_code == 201
    assert client.post(
        path,
        json={"item_code": "SYN-ITEM-02", "answer": "yes"},
        headers=write_headers(client, "screen-0000000004"),
    ).status_code == 403
    for denied_id in (ids["unassigned"], ids["cross_study"]):
        denied_path = f"/api/v1/participants/{denied_id}/screenings"
        assert client.get(denied_path).status_code == 403
        assert client.post(
            denied_path, json=first, headers=write_headers(client, f"screen-{denied_id}")
        ).status_code == 403
    with Session(engine) as db:
        assert len(db.scalars(select(ScreeningRecord)).all()) == 2


def test_production_environment_cannot_open_intake_database(monkeypatch) -> None:
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("ALLOW_SYNTHETIC_ONLY", "true")
    with pytest.raises(HTTPException) as error:
        next(get_db())
    assert error.value.status_code == 503
