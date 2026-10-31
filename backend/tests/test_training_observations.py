"""REAL-01D0: durable, scoped manual observations without prescription logic."""

import uuid

import pytest
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
    SafetyEvent,
    Study,
    StudyAssignment,
    TrainingFeedbackRevision,
    TrainingSession,
    User,
)
from app.security import password_hash

PASSWORD = "synthetic-training-password"
AT = "2026-10-01T09:30:00+08:00"


@pytest.fixture
def training_api(monkeypatch):
    monkeypatch.setenv("APP_PROFILE", "demo")
    monkeypatch.setenv("APP_ENV", "test")
    monkeypatch.setenv("ALLOW_SYNTHETIC_ONLY", "true")
    monkeypatch.setenv("SESSION_SECRET", "synthetic-training-test-secret-32-chars")
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        study = Study(code="SYN-TRAIN")
        clinician = User(
            email="training-clinician@example.org",
            password_hash=password_hash.hash(PASSWORD),
            role="clinician",
        )
        outsider = User(
            email="training-outsider@example.org",
            password_hash=password_hash.hash(PASSWORD),
            role="clinician",
        )
        analyst = User(
            email="training-analyst@example.org",
            password_hash=password_hash.hash(PASSWORD),
            role="analyst",
        )
        db.add_all([study, clinician, outsider, analyst])
        db.flush()
        participant = Participant(study_id=study.id, study_code="SYN-TRAIN-001")
        db.add(participant)
        db.flush()
        db.add_all([
            StudyAssignment(user_id=clinician.id, study_id=study.id),
            StudyAssignment(user_id=outsider.id, study_id=study.id),
            StudyAssignment(user_id=analyst.id, study_id=study.id),
            ParticipantAssignment(user_id=clinician.id, participant_id=participant.id),
            ParticipantAssignment(user_id=analyst.id, participant_id=participant.id),
        ])
        participant_id, clinician_id = participant.id, clinician.id
        db.commit()

    def override_db():
        with Session(engine) as db:
            yield db

    app.dependency_overrides[get_db] = override_db
    with TestClient(app) as client:
        yield client, engine, participant_id, clinician_id
    app.dependency_overrides.clear()
    engine.dispose()


def login(client: TestClient, who: str) -> None:
    response = client.post(
        "/api/v1/auth/login",
        json={"email": f"training-{who}@example.org", "password": PASSWORD},
    )
    assert response.status_code == 200, response.text


def headers(client: TestClient, key: str | None = None) -> dict[str, str]:
    return {
        "X-CSRF-Token": client.cookies["taiji_csrf"],
        "Idempotency-Key": key or str(uuid.uuid4()),
    }


def consent(engine, participant_id: uuid.UUID, clinician_id: uuid.UUID, decision="granted"):
    with Session(engine) as db:
        db.add(ConsentRecord(
            participant_id=participant_id, document_version="SYN-FORM-V1",
            purpose_code="SYN-DEMO-USE", decision=decision, photo_scope=False,
            recorded_by=clinician_id,
        ))
        db.commit()


def session_payload() -> dict:
    return {
        "session_at": AT,
        "action_label": "合成演示：已观察到的太极动作",
        "actual_minutes": 0,
        "completion_status": "interrupted",
        "notes": None,
    }


def test_training_feedback_history_idempotency_and_missingness(training_api):
    client, engine, participant_id, clinician_id = training_api
    path = f"/api/v1/participants/{participant_id}/training-sessions"
    assert client.get(path).status_code == 401
    login(client, "clinician")
    assert client.post(path, json=session_payload(), headers=headers(client)).status_code == 403
    consent(engine, participant_id, clinician_id)

    key = str(uuid.uuid4())
    created = client.post(path, json=session_payload(), headers=headers(client, key))
    assert created.status_code == 201, created.text
    session_id = created.json()["id"]
    assert created.json()["actual_minutes"] == 0
    replay = client.post(path, json=session_payload(), headers=headers(client, key))
    assert replay.status_code == 201 and replay.json()["id"] == session_id
    changed = {**session_payload(), "actual_minutes": 10}
    assert client.post(path, json=changed, headers=headers(client, key)).status_code == 409
    assert len(client.get(path).json()) == 1

    feedback_path = f"/api/v1/training-sessions/{session_id}/feedback"
    assert client.get(feedback_path).json() == []  # unfilled is not zero or symptom-free
    missing = {
        "expected_revision": 0, "state": "missing", "missing_reason": "interrupted",
    }
    feedback_key = str(uuid.uuid4())
    first = client.put(feedback_path, json=missing, headers=headers(client, feedback_key))
    assert first.status_code == 200, first.text
    assert first.json()["rpe"] is None and first.json()["revision_no"] == 1
    replay_feedback = client.put(
        feedback_path, json=missing, headers=headers(client, feedback_key)
    )
    assert replay_feedback.status_code == 200
    assert replay_feedback.json()["id"] == first.json()["id"]
    assert client.put(
        feedback_path,
        json={**missing, "expected_revision": 1, "rpe": 6},
        headers=headers(client),
    ).status_code == 422
    assert client.put(
        feedback_path,
        json={"expected_revision": 1, "state": "recorded", "rpe": 0},
        headers=headers(client),
    ).status_code == 422
    correction = {
        "expected_revision": 1, "state": "recorded", "rpe": 6,
        "fatigue": "已记录：主诉疲劳", "change_reason": "SYN-事后补录",
    }
    assert client.put(
        feedback_path, json={**correction, "change_reason": None},
        headers=headers(client),
    ).status_code == 422
    corrected = client.put(feedback_path, json=correction, headers=headers(client))
    assert corrected.status_code == 200, corrected.text
    assert corrected.json()["revision_no"] == 2 and corrected.json()["rpe"] == 6
    assert client.put(feedback_path, json=correction, headers=headers(client)).status_code == 409
    history = client.get(feedback_path).json()
    assert [(row["revision_no"], row["state"]) for row in history] == [
        (1, "missing"), (2, "recorded")
    ]
    with Session(engine) as db:
        assert len(db.scalars(select(TrainingSession)).all()) == 1
        assert len(db.scalars(select(TrainingFeedbackRevision)).all()) == 2
        assert any(row.action == "revise" for row in db.scalars(select(AuditEvent)).all())


def test_safety_event_before_feedback_and_scope(training_api):
    client, engine, participant_id, clinician_id = training_api
    login(client, "clinician")
    consent(engine, participant_id, clinician_id)
    path = f"/api/v1/participants/{participant_id}/training-sessions"
    session_id = client.post(
        path, json=session_payload(), headers=headers(client)
    ).json()["id"]
    event_path = f"/api/v1/participants/{participant_id}/safety-events"
    report = {"event_at": AT, "session_id": session_id, "description": "合成事件：训练中断"}
    key = str(uuid.uuid4())
    event = client.post(event_path, json=report, headers=headers(client, key))
    assert event.status_code == 201, event.text
    assert client.post(event_path, json=report, headers=headers(client, key)).json()["id"] == (
        event.json()["id"]
    )
    assert client.get(f"/api/v1/training-sessions/{session_id}/feedback").json() == []
    assert len(client.get(event_path).json()) == 1
    consent(engine, participant_id, clinician_id, "withdrawn")
    # An authorized staff member can still report a later event without new training consent.
    assert client.post(
        event_path,
        json={"event_at": AT, "description": "合成事件：撤回后补报"},
        headers=headers(client),
    ).status_code == 201
    assert client.post(path, json=session_payload(), headers=headers(client)).status_code == 403
    with Session(engine) as db:
        assert len(db.scalars(select(SafetyEvent)).all()) == 2

    client.post("/api/v1/auth/logout", headers={"X-CSRF-Token": client.cookies["taiji_csrf"]})
    login(client, "outsider")
    assert client.get(event_path).status_code == 403
    assert client.get(f"/api/v1/training-sessions/{session_id}").status_code == 403
    assert client.post(event_path, json=report, headers=headers(client)).status_code == 403
    client.post("/api/v1/auth/logout", headers={"X-CSRF-Token": client.cookies["taiji_csrf"]})
    login(client, "analyst")
    assert client.get(event_path).status_code == 403
