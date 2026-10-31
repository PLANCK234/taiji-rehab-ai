"""Synthetic intake and manual reassessment against migrated, disposable PostgreSQL."""

import os
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.db import get_engine
from app.main import app
from app.models import (
    Assessment,
    AssessmentRevision,
    AuditEvent,
    Participant,
    ParticipantAssignment,
    Study,
    StudyAssignment,
    User,
)
from app.security import password_hash

pytestmark = pytest.mark.skipif(
    os.environ.get("ENG04_INTEGRATION") != "1",
    reason="requires an isolated taiji_eng04 PostgreSQL database",
)

PASSWORD = "synthetic-eng04-password"


def _login(client: TestClient, email: str) -> None:
    response = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": PASSWORD},
        headers={"Origin": "http://localhost:3000"},
    )
    assert response.status_code == 200, response.text


def _headers(client: TestClient) -> dict[str, str]:
    return {
        "X-CSRF-Token": client.cookies["taiji_csrf"],
        "Idempotency-Key": str(uuid.uuid4()),
    }


def _measure(client: TestClient, assessment_id: str, payload: dict) -> dict:
    response = client.put(
        f"/api/v1/assessments/{assessment_id}/measurements",
        json=payload,
        headers=_headers(client),
    )
    assert response.status_code == 200, response.text
    return response.json()


def _confirm(client: TestClient, assessment_id: str, revision: int) -> dict:
    response = client.post(
        f"/api/v1/assessments/{assessment_id}/confirm",
        json={"expected_revision": revision},
        headers=_headers(client),
    )
    assert response.status_code == 200, response.text
    return response.json()


def test_migrated_postgres_synthetic_workflow() -> None:
    assert os.environ.get("APP_ENV") == "test"
    assert os.environ.get("ALLOW_SYNTHETIC_ONLY") == "true"
    get_engine.cache_clear()
    engine = get_engine()
    assert engine.dialect.name == "postgresql"
    with engine.connect() as connection:
        assert connection.scalar(text("select current_database()")) == "taiji_eng04"
        assert connection.scalar(text("select version_num from alembic_version")) == (
            "0005_training_observations"
        )

    suffix = uuid.uuid4().hex[:10].upper()
    clinician_email = f"eng04-clinician-{suffix.lower()}@example.org"
    outsider_email = f"eng04-outsider-{suffix.lower()}@example.org"
    peer_email = f"eng04-peer-{suffix.lower()}@example.org"
    analyst_email = f"eng04-analyst-{suffix.lower()}@example.org"
    with Session(engine) as db:
        study, other_study = Study(code=f"SYN-ENG04-{suffix}"), Study(code=f"SYN-OTHER-{suffix}")
        clinician = User(
            email=clinician_email, password_hash=password_hash.hash(PASSWORD), role="clinician"
        )
        outsider = User(
            email=outsider_email, password_hash=password_hash.hash(PASSWORD), role="clinician"
        )
        peer = User(email=peer_email, password_hash=password_hash.hash(PASSWORD), role="clinician")
        analyst = User(
            email=analyst_email, password_hash=password_hash.hash(PASSWORD), role="analyst"
        )
        db.add_all([study, other_study, clinician, outsider, peer, analyst])
        db.flush()
        db.add_all(
            [
                StudyAssignment(user_id=clinician.id, study_id=study.id),
                StudyAssignment(user_id=outsider.id, study_id=other_study.id),
                StudyAssignment(user_id=peer.id, study_id=study.id),
                StudyAssignment(user_id=analyst.id, study_id=study.id),
            ]
        )
        study_id, other_study_id = study.id, other_study.id
        clinician_id = clinician.id
        analyst_id = analyst.id
        db.commit()

    with TestClient(app) as client:
        assert client.get("/api/v1/participants").status_code == 401
        _login(client, clinician_email)
        create_body = {"study_id": str(study_id), "study_code": f"SYN-ENG04-P-{suffix}"}
        created = client.post("/api/v1/participants", json=create_body, headers=_headers(client))
        assert created.status_code == 201, created.text
        participant_id = created.json()["id"]
        with Session(engine) as db:
            db.add(
                ParticipantAssignment(user_id=analyst_id, participant_id=uuid.UUID(participant_id))
            )
            db.commit()
        assert client.post(
            "/api/v1/participants",
            json={**create_body, "study_id": str(other_study_id)},
            headers=_headers(client),
        ).status_code == 403
        consent_path = f"/api/v1/participants/{participant_id}/consents"
        screen_path = f"/api/v1/participants/{participant_id}/screenings"
        assert client.get(consent_path).json()["state"] == "not_recorded"
        assert client.post(
            screen_path,
            json={"item_code": "SYN-SCREEN-01", "answer": "unknown"},
            headers=_headers(client),
        ).status_code == 403
        consent = client.post(
            consent_path,
            json={
                "document_version": "SYN-FORM-V1",
                "purpose_code": "SYN-DEMO-USE",
                "decision": "granted",
            },
            headers=_headers(client),
        )
        assert consent.status_code == 201, consent.text
        screen = client.post(
            screen_path,
            json={"item_code": "SYN-SCREEN-01", "answer": "unknown"},
            headers=_headers(client),
        )
        assert screen.status_code == 201, screen.text
        assert client.get(screen_path).json()["review_state"] == "needs_review"

        assessment_ids = {}
        for kind in ("baseline", "revisit"):
            response = client.post(
                "/api/v1/assessments",
                json={"participant_id": participant_id, "visit_kind": kind},
                headers=_headers(client),
            )
            assert response.status_code == 201, response.text
            assert response.json()["current"]["raw_value"] is None
            assessment_ids[kind] = response.json()["id"]

        baseline_id = assessment_ids["baseline"]
        revisit_id = assessment_ids["revisit"]
        baseline = _measure(
            client,
            baseline_id,
            {
                "expected_revision": 1,
                "validity": "valid",
                "raw_value": 0,
                "performed_at": "2026-10-01T09:30:00+08:00",
            },
        )
        assert baseline["raw_value"] == 0
        assert _confirm(client, baseline_id, 2)["state"] == "confirmed"
        revisit = _measure(
            client,
            revisit_id,
            {"expected_revision": 1, "validity": "missing", "missing_reason": "declined"},
        )
        assert revisit["raw_value"] is None
        assert _confirm(client, revisit_id, 2)["raw_value"] is None
        corrected = _measure(
            client,
            baseline_id,
            {
                "expected_revision": 3,
                "validity": "valid",
                "raw_value": 5,
                "performed_at": "2026-10-01T09:30:00+08:00",
                "change_reason": "SYN-CORRECTION",
            },
        )
        assert corrected["revision_no"] == 4
        _confirm(client, baseline_id, 4)

    # A new client proves the records survived request sessions and are scoped by the DB.
    with TestClient(app) as client:
        _login(client, clinician_email)
        detail = client.get(f"/api/v1/assessments/{baseline_id}")
        assert detail.status_code == 200
        assert [row["raw_value"] for row in detail.json()["history"]] == [5, 5, 0, 0, None]
        assessments = client.get(f"/api/v1/participants/{participant_id}/assessments")
        assert assessments.status_code == 200
        assert {row["visit_kind"] for row in assessments.json()} == {"baseline", "revisit"}
        assert next(
            row for row in assessments.json() if row["visit_kind"] == "revisit"
        )["current"]["raw_value"] is None

    with TestClient(app) as client:
        _login(client, outsider_email)
        assert client.get(f"/api/v1/participants/{participant_id}").status_code == 403
        assert client.get(f"/api/v1/assessments/{baseline_id}").status_code == 403
    with TestClient(app) as client:
        _login(client, peer_email)
        assert client.get(f"/api/v1/participants/{participant_id}").status_code == 403
        assert client.get(f"/api/v1/assessments/{baseline_id}").status_code == 403
    with TestClient(app) as client:
        _login(client, analyst_email)
        assert client.get(f"/api/v1/assessments/{baseline_id}").status_code == 403

    with Session(engine) as db:
        assert db.scalar(select(Participant).where(Participant.id == uuid.UUID(participant_id)))
        assessments = db.scalars(
            select(Assessment).where(Assessment.participant_id == uuid.UUID(participant_id))
        ).all()
        assert len(assessments) == 2
        assert len(
            db.scalars(
                select(AssessmentRevision).where(
                    AssessmentRevision.assessment_id.in_([row.id for row in assessments])
                )
            ).all()
        ) == 8
        events = db.scalars(select(AuditEvent)).all()
        assert any(
            row.actor_id == clinician_id and row.action == "confirm" and row.outcome == "allowed"
            for row in events
        )
        assert any(row.outcome == "denied" for row in events)
    engine.dispose()
    get_engine.cache_clear()
