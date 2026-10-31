"""REAL-01D0 on the disposable migrated PostgreSQL database."""

import os
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.db import get_engine
from app.main import app
from app.models import (
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

pytestmark = pytest.mark.skipif(
    os.environ.get("ENG04_INTEGRATION") != "1",
    reason="requires the isolated taiji_eng04 PostgreSQL database",
)

PASSWORD = "synthetic-training-postgres-password"
AT = "2026-10-01T09:30:00+08:00"


def _login(client: TestClient, email: str) -> None:
    response = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": PASSWORD},
    )
    assert response.status_code == 200, response.text


def _headers(client: TestClient, key: str | None = None) -> dict[str, str]:
    return {
        "X-CSRF-Token": client.cookies["taiji_csrf"],
        "Idempotency-Key": key or str(uuid.uuid4()),
    }


def test_training_session_feedback_event_persist_and_isolate() -> None:
    engine = get_engine()
    with engine.connect() as connection:
        assert connection.scalar(text("select current_database()")) == "taiji_eng04"
        assert connection.scalar(text("select version_num from alembic_version")) == (
            "0005_training_observations"
        )
    suffix = uuid.uuid4().hex[:10]
    clinician_email = f"training-pg-{suffix}@example.org"
    peer_email = f"training-peer-{suffix}@example.org"
    with Session(engine) as db:
        study = Study(code=f"SYN-TRAIN-PG-{suffix.upper()}")
        clinician = User(
            email=clinician_email, password_hash=password_hash.hash(PASSWORD), role="clinician"
        )
        peer = User(
            email=peer_email, password_hash=password_hash.hash(PASSWORD), role="clinician"
        )
        db.add_all([study, clinician, peer])
        db.flush()
        participant = Participant(study_id=study.id, study_code=f"SYN-TPG-{suffix.upper()}")
        db.add(participant)
        db.flush()
        db.add_all([
            StudyAssignment(user_id=clinician.id, study_id=study.id),
            StudyAssignment(user_id=peer.id, study_id=study.id),
            ParticipantAssignment(user_id=clinician.id, participant_id=participant.id),
            ConsentRecord(
                participant_id=participant.id, document_version="SYN-FORM-V1",
                purpose_code="SYN-DEMO-USE", decision="granted", photo_scope=False,
                recorded_by=clinician.id,
            ),
        ])
        participant_id = participant.id
        db.commit()

    path = f"/api/v1/participants/{participant_id}"
    with TestClient(app) as client:
        _login(client, clinician_email)
        session = client.post(
            f"{path}/training-sessions",
            json={
                "session_at": AT, "action_label": "合成动作观察",
                "actual_minutes": 0, "completion_status": "interrupted",
            },
            headers=_headers(client),
        )
        assert session.status_code == 201, session.text
        session_id = session.json()["id"]
        event = client.post(
            f"{path}/safety-events",
            json={
                "event_at": AT, "session_id": session_id,
                "description": "合成测试事件：训练已中断",
            },
            headers=_headers(client),
        )
        assert event.status_code == 201, event.text
        feedback = client.put(
            f"/api/v1/training-sessions/{session_id}/feedback",
            json={"expected_revision": 0, "state": "recorded", "rpe": 6},
            headers=_headers(client),
        )
        assert feedback.status_code == 200, feedback.text
        assert feedback.json()["rpe"] == 6

    # A new request/session reads committed rows from PostgreSQL, not process state.
    with TestClient(app) as client:
        _login(client, clinician_email)
        assert len(client.get(f"{path}/training-sessions").json()) == 1
        assert len(client.get(f"{path}/safety-events").json()) == 1
        assert len(client.get(f"/api/v1/training-sessions/{session_id}/feedback").json()) == 1
    with TestClient(app) as client:
        _login(client, peer_email)
        assert client.get(f"{path}/training-sessions").status_code == 403
        assert client.get(f"/api/v1/training-sessions/{session_id}/feedback").status_code == 403
    with Session(engine) as db:
        assert db.scalar(select(TrainingSession).where(TrainingSession.id == uuid.UUID(session_id)))
        assert db.scalar(select(TrainingFeedbackRevision).where(
            TrainingFeedbackRevision.session_id == uuid.UUID(session_id)
        ))
        assert db.scalar(select(SafetyEvent).where(SafetyEvent.session_id == uuid.UUID(session_id)))
    engine.dispose()
    get_engine.cache_clear()
