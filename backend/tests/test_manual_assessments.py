"""S2-01 synthetic manual total, missingness, revisions and scope."""

import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.db import Base, get_db
from app.main import app
from app.models import (
    Assessment,
    AssessmentRevision,
    AuditEvent,
    ConsentRecord,
    Participant,
    ParticipantAssignment,
    Study,
    StudyAssignment,
    User,
)
from app.security import password_hash


@pytest.fixture
def assessment_api(monkeypatch):
    monkeypatch.setenv("ALLOW_SYNTHETIC_ONLY", "true")
    monkeypatch.setenv("APP_ENV", "test")
    monkeypatch.setenv("SESSION_SECRET", "synthetic-assessment-test-secret-32-characters")
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
            email="assessment-clinician@example.org",
            password_hash=password_hash.hash("synthetic-password-123"),
            role="clinician",
        )
        assistant = User(
            email="assessment-assistant@example.org",
            password_hash=password_hash.hash("synthetic-password-123"),
            role="research_assistant",
        )
        analyst = User(
            email="assessment-analyst@example.org",
            password_hash=password_hash.hash("synthetic-password-123"),
            role="analyst",
        )
        db.add_all([study_a, study_b, clinician, assistant, analyst])
        db.flush()
        assigned = Participant(study_id=study_a.id, study_code="SYN-ASSIGNED")
        unassigned = Participant(study_id=study_a.id, study_code="SYN-HIDDEN")
        cross = Participant(study_id=study_b.id, study_code="SYN-CROSS")
        db.add_all([assigned, unassigned, cross])
        db.flush()
        db.add_all(
            [
                StudyAssignment(user_id=clinician.id, study_id=study_a.id),
                StudyAssignment(user_id=assistant.id, study_id=study_a.id),
                StudyAssignment(user_id=analyst.id, study_id=study_a.id),
                ParticipantAssignment(user_id=clinician.id, participant_id=assigned.id),
                ParticipantAssignment(user_id=clinician.id, participant_id=cross.id),
                ParticipantAssignment(user_id=assistant.id, participant_id=assigned.id),
            ]
        )
        ids = {
            "assigned": assigned.id,
            "unassigned": unassigned.id,
            "cross": cross.id,
            "clinician": clinician.id,
            "assistant": assistant.id,
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


def login(client: TestClient, role: str = "clinician") -> None:
    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": f"assessment-{role}@example.org",
            "password": "synthetic-password-123",
        },
        headers={"Origin": "http://localhost:3000"},
    )
    assert response.status_code == 200


def headers(client: TestClient, key: str) -> dict[str, str]:
    return {"X-CSRF-Token": client.cookies["taiji_csrf"], "Idempotency-Key": key}


def consent(db_engine, participant_id: uuid.UUID, actor_id: uuid.UUID) -> None:
    with Session(db_engine) as db:
        db.add(
            ConsentRecord(
                participant_id=participant_id,
                document_version="SYN-FORM-V1",
                purpose_code="SYN-DEMO-USE",
                decision="granted",
                photo_scope=False,
                recorded_by=actor_id,
            )
        )
        db.commit()


def create(client: TestClient, participant_id: uuid.UUID, kind: str = "baseline"):
    return client.post(
        "/api/v1/assessments",
        json={"participant_id": str(participant_id), "visit_kind": kind},
        headers=headers(client, str(uuid.uuid4())),
    )


def valid_payload(expected_revision: int, value: int, reason: str | None = None) -> dict:
    return {
        "expected_revision": expected_revision,
        "validity": "valid",
        "raw_value": value,
        "missing_reason": None,
        "performed_at": "2026-10-01T09:30:00+08:00",
        "change_reason": reason,
    }


def test_zero_confirm_correction_and_append_only_history(assessment_api) -> None:
    client, engine, ids = assessment_api
    consent(engine, ids["assigned"], ids["clinician"])
    login(client)
    created = create(client, ids["assigned"])
    assert created.status_code == 201, created.text
    assessment_id = created.json()["id"]
    assert created.json()["current"]["validity"] == "unrecorded"
    assert created.json()["current"]["raw_value"] is None
    path = f"/api/v1/assessments/{assessment_id}"
    assert client.post(
        path + "/confirm", json={"expected_revision": 1},
        headers=headers(client, "confirm-unrecorded-01"),
    ).status_code == 422
    recorded = client.put(
        path + "/measurements", json=valid_payload(1, 0),
        headers=headers(client, "measurement-zero-01"),
    )
    assert recorded.status_code == 200, recorded.text
    assert recorded.json()["revision_no"] == 2
    assert recorded.json()["state"] == "draft"
    assert recorded.json()["raw_value"] == 0
    assert recorded.json()["performed_at"].startswith("2026-10-01T01:30:00")
    confirmed = client.post(
        path + "/confirm", json={"expected_revision": 2},
        headers=headers(client, "confirm-zero-0001"),
    )
    assert confirmed.status_code == 200, confirmed.text
    assert confirmed.json()["state"] == "confirmed"
    assert confirmed.json()["revision_no"] == 3
    correction = client.put(
        path + "/measurements", json=valid_payload(3, 12, "SYN-CORRECTION"),
        headers=headers(client, "measurement-correct-01"),
    )
    assert correction.status_code == 200
    assert correction.json()["state"] == "draft"
    assert correction.json()["revision_no"] == 4
    assert client.post(
        path + "/confirm", json={"expected_revision": 4},
        headers=headers(client, "confirm-correct-01"),
    ).status_code == 200
    detail = client.get(path)
    assert detail.status_code == 200
    history = detail.json()["history"]
    assert [row["revision_no"] for row in history] == [5, 4, 3, 2, 1]
    assert [row["raw_value"] for row in history] == [12, 12, 0, 0, None]
    assert history[1]["change_reason"] == "SYN-CORRECTION"
    assert all(row["recorded_by"] == str(ids["clinician"]) for row in history)
    listing = client.get(f"/api/v1/participants/{ids['assigned']}/assessments")
    assert listing.status_code == 200
    assert listing.json()[0]["current"]["revision_no"] == 5
    with Session(engine) as db:
        assert len(db.scalars(select(AssessmentRevision)).all()) == 5
        events = db.scalars(
            select(AuditEvent).where(AuditEvent.resource_type == "assessment")
        ).all()
        assert {event.action for event in events} >= {"create", "revise", "confirm", "read"}


def test_missing_and_invalid_are_not_zero_or_confirmed_score(assessment_api) -> None:
    client, engine, ids = assessment_api
    consent(engine, ids["assigned"], ids["clinician"])
    login(client)
    created = create(client, ids["assigned"], "revisit")
    assert created.status_code == 201
    path = f"/api/v1/assessments/{created.json()['id']}"
    missing = client.put(
        path + "/measurements",
        json={"expected_revision": 1, "validity": "missing", "missing_reason": "declined"},
        headers=headers(client, "measurement-missing-01"),
    )
    assert missing.status_code == 200, missing.text
    assert missing.json()["raw_value"] is None
    assert missing.json()["performed_at"] is None
    confirmed = client.post(
        path + "/confirm", json={"expected_revision": 2},
        headers=headers(client, "confirm-missing-01"),
    )
    assert confirmed.status_code == 200
    assert confirmed.json()["validity"] == "missing"
    assert confirmed.json()["raw_value"] is None
    invalid = client.put(
        path + "/measurements",
        json={
            "expected_revision": 3, "validity": "invalid", "raw_value": 13,
            "missing_reason": "technical_failure", "change_reason": "SYN-CORRECTION",
        },
        headers=headers(client, "measurement-invalid-01"),
    )
    assert invalid.status_code == 200
    assert invalid.json()["raw_value"] == 13
    assert invalid.json()["validity"] == "invalid"
    assert client.get(path).json()["current"]["state"] == "draft"
    for payload in (
        {"expected_revision": 4, "validity": "valid", "raw_value": 13,
         "performed_at": "2026-10-01T09:30:00+08:00"},
        {"expected_revision": 4, "validity": "missing", "raw_value": 0,
         "missing_reason": "declined"},
        {"expected_revision": 4, "validity": "valid", "raw_value": 5,
         "performed_at": "2026-10-01T09:30:00"},
        {"expected_revision": 4, "validity": "invalid", "raw_value": None},
    ):
        assert client.put(
            path + "/measurements", json=payload,
            headers=headers(client, str(uuid.uuid4())),
        ).status_code == 422


def test_scope_consent_and_confirmation_role(assessment_api) -> None:
    client, engine, ids = assessment_api
    assert client.get(f"/api/v1/participants/{ids['assigned']}/assessments").status_code == 401
    login(client)
    assert create(client, ids["assigned"]).status_code == 403
    consent(engine, ids["assigned"], ids["clinician"])
    assert create(client, ids["unassigned"]).status_code == 403
    assert create(client, ids["cross"]).status_code == 403
    created = create(client, ids["assigned"])
    assert created.status_code == 201
    assessment_id = created.json()["id"]
    path = f"/api/v1/assessments/{assessment_id}"
    assert client.get(f"/api/v1/assessments/{uuid.uuid4()}").status_code == 403
    assert client.put(
        path + "/measurements", json=valid_payload(1, 5),
        headers={"Idempotency-Key": "measurement-no-csrf-01"},
    ).status_code == 403
    login(client, "assistant")
    assert client.get(path).status_code == 200
    assert client.put(
        path + "/measurements", json=valid_payload(1, 5),
        headers=headers(client, "measurement-assistant-01"),
    ).status_code == 200
    assert client.post(
        path + "/confirm", json={"expected_revision": 2},
        headers=headers(client, "confirm-assistant-01"),
    ).status_code == 403
    login(client, "analyst")
    assert client.get(path).status_code == 403
    assert client.get(f"/api/v1/participants/{ids['assigned']}/assessments").status_code == 403
    login(client)
    assert client.post(
        path + "/confirm", json={"expected_revision": 2},
        headers=headers(client, "confirm-clinician-01"),
    ).status_code == 200
    with Session(engine) as db:
        db.add(
            ConsentRecord(
                participant_id=ids["assigned"], document_version="SYN-FORM-V1",
                purpose_code="SYN-DEMO-USE", decision="withdrawn", photo_scope=False,
                change_reason="SYN-WITHDRAWAL", recorded_by=ids["clinician"],
            )
        )
        db.commit()
    assert client.put(
        path + "/measurements", json=valid_payload(3, 6, "SYN-CORRECTION"),
        headers=headers(client, "measurement-withdrawn-01"),
    ).status_code == 403


def test_idempotency_conflict_and_database_constraint(assessment_api) -> None:
    client, engine, ids = assessment_api
    consent(engine, ids["assigned"], ids["clinician"])
    login(client)
    create_body = {"participant_id": str(ids["assigned"]), "visit_kind": "baseline"}
    key = headers(client, "assessment-create-replay-01")
    first = client.post("/api/v1/assessments", json=create_body, headers=key)
    replay = client.post("/api/v1/assessments", json=create_body, headers=key)
    assert first.status_code == replay.status_code == 201
    assert first.json()["id"] == replay.json()["id"]
    assert client.post(
        "/api/v1/assessments", json={**create_body, "visit_kind": "revisit"}, headers=key
    ).status_code == 409
    path = f"/api/v1/assessments/{first.json()['id']}"
    payload = valid_payload(1, 7)
    measure_key = headers(client, "measurement-replay-01")
    recorded = client.put(path + "/measurements", json=payload, headers=measure_key)
    replay_measure = client.put(path + "/measurements", json=payload, headers=measure_key)
    assert recorded.status_code == replay_measure.status_code == 200
    assert recorded.json()["id"] == replay_measure.json()["id"]
    assert client.put(
        path + "/measurements", json=valid_payload(1, 8, "SYN-CORRECTION"),
        headers=headers(client, "measurement-stale-01"),
    ).status_code == 409
    assert client.put(
        path + "/measurements", json=valid_payload(2, 8),
        headers=headers(client, "measurement-no-reason-01"),
    ).status_code == 422
    confirm_key = headers(client, "confirm-replay-0001")
    confirm_body = {"expected_revision": 2}
    confirmed = client.post(path + "/confirm", json=confirm_body, headers=confirm_key)
    replay_confirm = client.post(path + "/confirm", json=confirm_body, headers=confirm_key)
    assert confirmed.status_code == replay_confirm.status_code == 200
    assert confirmed.json()["id"] == replay_confirm.json()["id"]
    assert client.post(
        path + "/confirm", json={"expected_revision": 3},
        headers=headers(client, "confirm-again-0001"),
    ).status_code == 409
    with Session(engine) as db:
        assert len(db.scalars(select(Assessment)).all()) == 1
        assert len(db.scalars(select(AssessmentRevision)).all()) == 3
        db.add(
            AssessmentRevision(
                assessment_id=uuid.UUID(first.json()["id"]), revision_no=4,
                state="confirmed", metric_code="sppb_total", raw_value=13, unit="points",
                validity="valid", missing_reason=None, performed_at=None,
                source="manual_staff_entry", recorded_by=ids["clinician"],
            )
        )
        with pytest.raises(IntegrityError):
            db.commit()
        db.rollback()
