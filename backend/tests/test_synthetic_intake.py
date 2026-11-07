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
    DemoParticipantProfile,
    DemoProfileRevision,
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
    assert [row["study_code"] for row in client.get("/api/v1/participants").json()] == ["SYN-BASE"]
    assert (
        client.post(
            "/api/v1/participants", json=payload, headers={"Idempotency-Key": "create-0000000001"}
        ).status_code
        == 403
    )
    assert (
        client.post(
            "/api/v1/participants",
            json={**payload, "study_id": str(ids["study_b"])},
            headers=write_headers(client, "create-0000000002"),
        ).status_code
        == 403
    )
    created = client.post(
        "/api/v1/participants", json=payload, headers=write_headers(client, "create-0000000003")
    )
    assert created.status_code == 201
    assert created.json()["study_code"] == "SYN-NEW001"
    replay = client.post(
        "/api/v1/participants", json=payload, headers=write_headers(client, "create-0000000003")
    )
    assert replay.status_code == 201 and replay.json()["id"] == created.json()["id"]
    assert (
        client.post(
            "/api/v1/participants",
            json={**payload, "study_code": "SYN-DIFFERENT"},
            headers=write_headers(client, "create-0000000003"),
        ).status_code
        == 409
    )
    assert (
        client.post(
            "/api/v1/participants", json=payload, headers=write_headers(client, "create-0000000004")
        ).status_code
        == 409
    )
    assert (
        client.post(
            "/api/v1/participants",
            json={**payload, "name": "synthetic forbidden field"},
            headers=write_headers(client, "create-0000000005"),
        ).status_code
        == 422
    )
    visible = [row["study_code"] for row in client.get("/api/v1/participants").json()]
    assert visible == ["SYN-BASE", "SYN-NEW001"]
    with Session(engine) as db:
        assert (
            db.scalar(
                select(ParticipantAssignment).where(
                    ParticipantAssignment.participant_id == uuid.UUID(created.json()["id"])
                )
            )
            is not None
        )
        assert (
            len(db.scalars(select(Participant).where(Participant.study_code == "SYN-NEW001")).all())
            == 1
        )
        create_events = db.scalars(select(AuditEvent).where(AuditEvent.action == "create")).all()
        assert {event.outcome for event in create_events} == {"allowed", "denied"}

    login(client, "intake-analyst@example.org")
    assert client.get("/api/v1/participants").status_code == 403
    assert (
        client.post(
            "/api/v1/participants", json=payload, headers=write_headers(client, "create-0000000006")
        ).status_code
        == 403
    )


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
    assert (
        client.post(path, json=first, headers={"Idempotency-Key": "consent-000000001"}).status_code
        == 403
    )
    created = client.post(path, json=first, headers=write_headers(client, "consent-000000001"))
    assert created.status_code == 201
    assert (
        client.post(path, json=first, headers=write_headers(client, "consent-000000001")).json()[
            "id"
        ]
        == created.json()["id"]
    )
    assert (
        client.post(
            path,
            json={**first, "decision": "withdrawn", "photo_scope": False},
            headers=write_headers(client, "consent-000000002"),
        ).status_code
        == 422
    )
    withdrawal = {
        **first,
        "decision": "withdrawn",
        "photo_scope": False,
        "change_reason": "SYN-DEMO-CHANGE",
    }
    assert (
        client.post(
            path, json=withdrawal, headers=write_headers(client, "consent-000000003")
        ).status_code
        == 201
    )
    history = client.get(path).json()
    assert history["state"] == "withdrawn"
    assert len(history["records"]) == 2
    assert (
        client.post(
            path,
            json={**first, "decision": "refused"},
            headers=write_headers(client, "consent-000000004"),
        ).status_code
        == 422
    )
    for denied_id in (ids["unassigned"], ids["cross_study"]):
        denied_path = f"/api/v1/participants/{denied_id}/consents"
        assert client.get(denied_path).status_code == 403
        assert (
            client.post(
                denied_path, json=first, headers=write_headers(client, f"consent-{denied_id}")
            ).status_code
            == 403
        )
    assert client.post(f"/api/v1/participants/{ids['assigned']}/images").status_code == 404
    with Session(engine) as db:
        assert len(db.scalars(select(ConsentRecord)).all()) == 2


def test_synthetic_profile_correction_history_and_scope(intake_api) -> None:
    client, engine, ids = intake_api
    path = f"/api/v1/participants/{ids['assigned']}/demo-profile"
    assert client.get(f"{path}/revisions").status_code == 401
    login(client)
    assert client.get(f"{path}/revisions").json() == {
        "participant_id": str(ids["assigned"]),
        "current_revision": 0,
        "records": [],
    }
    original = {"age": 67, "sex": "unknown", "needs_assistance": None, "note": None}
    assert client.post(path, json=original, headers={}).status_code == 403
    created = client.post(
        path, json=original, headers=write_headers(client, "profile-create-00001")
    )
    assert created.status_code == 200
    history = client.get(f"{path}/revisions").json()
    assert history["current_revision"] == 1
    assert history["records"][0]["source"] == "created"
    assert history["records"][0]["recorded_by"] is not None
    correction = {
        **original,
        "age": 68,
        "sex": "female",
        "expected_revision": 1,
        "change_reason": "SYN-PROFILE-CORRECTION",
    }
    revised = client.post(
        f"{path}/revisions",
        json=correction,
        headers=write_headers(client, "profile-correction-00001"),
    )
    assert revised.status_code == 201, revised.text
    assert revised.json()["revision_no"] == 2
    assert revised.json()["recorded_by"] is not None
    assert (
        client.post(
            f"{path}/revisions",
            json=correction,
            headers=write_headers(client, "profile-correction-00001"),
        ).json()["id"]
        == revised.json()["id"]
    )
    assert client.get(path).json()["age"] == 68
    history = client.get(f"{path}/revisions").json()
    assert [row["age"] for row in history["records"]] == [67, 68]
    assert (
        client.post(
            f"{path}/revisions",
            json={**correction, "age": 69},
            headers=write_headers(client, "profile-correction-00001"),
        ).status_code
        == 409
    )
    assert (
        client.post(
            f"{path}/revisions",
            json={**correction, "age": 69},
            headers=write_headers(client, "profile-correction-00002"),
        ).status_code
        == 409
    )
    assert (
        client.post(
            f"{path}/revisions",
            json={**correction, "age": 69, "expected_revision": 2, "change_reason": "invalid"},
            headers=write_headers(client, "profile-correction-00003"),
        ).status_code
        == 422
    )
    assert (
        client.post(
            f"{path}/revisions",
            json={**correction, "age": 121, "expected_revision": 2},
            headers=write_headers(client, "profile-correction-00004"),
        ).status_code
        == 422
    )
    for denied_id in (ids["unassigned"], ids["cross_study"]):
        other = f"/api/v1/participants/{denied_id}/demo-profile/revisions"
        assert client.get(other).status_code == 403
        assert (
            client.post(
                other, json=correction, headers=write_headers(client, f"profile-{denied_id}")
            ).status_code
            == 403
        )
    with Session(engine) as db:
        assert db.get(DemoParticipantProfile, ids["assigned"]).age == 67
        assert len(db.scalars(select(DemoProfileRevision)).all()) == 2
        assert db.scalar(select(AuditEvent).where(AuditEvent.action == "correct")) is not None

    login(client, "intake-analyst@example.org")
    assert client.get(f"{path}/revisions").status_code == 403
    assert (
        client.post(
            f"{path}/revisions",
            json=correction,
            headers=write_headers(client, "profile-correction-analyst"),
        ).status_code
        == 403
    )


def test_legacy_profile_has_explicit_unknown_attribution(intake_api) -> None:
    client, engine, ids = intake_api
    with Session(engine) as db:
        db.add(DemoParticipantProfile(participant_id=ids["assigned"], age=60))
        db.commit()
    login(client)
    path = f"/api/v1/participants/{ids['assigned']}/demo-profile"
    history = client.get(f"{path}/revisions").json()
    assert history["records"] == [
        {
            "id": None,
            "participant_id": str(ids["assigned"]),
            "revision_no": 1,
            "age": 60,
            "sex": None,
            "needs_assistance": None,
            "note": None,
            "change_reason": None,
            "recorded_by": None,
            "recorded_at": None,
            "source": "legacy_initial",
        }
    ]
    correction = {
        "age": 61,
        "sex": None,
        "needs_assistance": None,
        "note": None,
        "expected_revision": 1,
        "change_reason": "SYN-LEGACY-CORRECTION",
    }
    assert (
        client.post(
            f"{path}/revisions",
            json=correction,
            headers=write_headers(client, "profile-legacy-00001"),
        ).status_code
        == 201
    )
    assert client.get(path).json()["age"] == 61
    assert [row["age"] for row in client.get(f"{path}/revisions").json()["records"]] == [60, 61]


def test_screening_unknown_never_becomes_safe(intake_api) -> None:
    client, engine, ids = intake_api
    login(client)
    path = f"/api/v1/participants/{ids['assigned']}/screenings"
    assert client.get(path).json() == {"review_state": "not_assessed", "records": []}
    first = {"item_code": "SYN-ITEM-01", "answer": "unknown"}
    assert (
        client.post(
            path, json=first, headers=write_headers(client, "screen-0000000000")
        ).status_code
        == 403
    )
    consent_path = f"/api/v1/participants/{ids['assigned']}/consents"
    consent = {
        "document_version": "SYN-FORM-V1",
        "purpose_code": "SYN-DEMO-USE",
        "decision": "granted",
        "photo_scope": False,
    }
    assert (
        client.post(
            consent_path, json=consent, headers=write_headers(client, "consent-000000011")
        ).status_code
        == 201
    )
    assert (
        client.post(
            path, json=first, headers=write_headers(client, "screen-0000000001")
        ).status_code
        == 201
    )
    assert client.get(path).json()["review_state"] == "needs_review"
    assert (
        client.post(
            path,
            json={**first, "answer": "no"},
            headers=write_headers(client, "screen-0000000002"),
        ).status_code
        == 422
    )
    assert (
        client.post(
            path,
            json={**first, "answer": "no", "change_reason": "SYN-CORRECTION"},
            headers=write_headers(client, "screen-0000000003"),
        ).status_code
        == 201
    )
    history = client.get(path).json()
    assert history["review_state"] == "needs_review"
    assert {row["answer"] for row in history["records"]} == {"unknown", "no"}
    assert "safe" not in str(history).lower()
    assert (
        client.post(
            consent_path,
            json={**consent, "decision": "withdrawn", "change_reason": "SYN-WITHDRAWAL"},
            headers=write_headers(client, "consent-000000012"),
        ).status_code
        == 201
    )
    assert (
        client.post(
            path,
            json={"item_code": "SYN-ITEM-02", "answer": "yes"},
            headers=write_headers(client, "screen-0000000004"),
        ).status_code
        == 403
    )
    for denied_id in (ids["unassigned"], ids["cross_study"]):
        denied_path = f"/api/v1/participants/{denied_id}/screenings"
        assert client.get(denied_path).status_code == 403
        assert (
            client.post(
                denied_path, json=first, headers=write_headers(client, f"screen-{denied_id}")
            ).status_code
            == 403
        )
    with Session(engine) as db:
        assert len(db.scalars(select(ScreeningRecord)).all()) == 2


def test_production_environment_cannot_open_intake_database(monkeypatch) -> None:
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("ALLOW_SYNTHETIC_ONLY", "true")
    with pytest.raises(HTTPException) as error:
        next(get_db())
    assert error.value.status_code == 503


def test_manual_observation_revisions(intake_api):
    client, engine, ids = intake_api
    path = f"/api/v1/participants/{ids['assigned']}/manual-observations"
    assert client.get(path).status_code == 401
    login(client)
    payload = {
        "metric_code": "gait_4m_seconds",
        "unit": "s",
        "raw_value": "4.120",
        "validity": "valid",
        "performed_at": "2026-11-07T01:00:00Z",
        "expected_revision": 0,
    }
    headers = write_headers(client, "manual-observation-0001")
    assert client.post(path, json=payload, headers=headers).status_code == 403
    assert (
        client.post(
            f"/api/v1/participants/{ids['assigned']}/consents",
            json={
                "document_version": "SYN-FORM-V1",
                "purpose_code": "SYN-DEMO-USE",
                "decision": "granted",
                "photo_scope": False,
            },
            headers=write_headers(client, "manual-consent-0001"),
        ).status_code
        == 201
    )
    first = client.post(path, json=payload, headers=headers)
    assert first.status_code == 201, first.text
    assert first.json()["snapshot"]["raw_value"] == "4.120"
    assert client.post(path, json=payload, headers=headers).json()["id"] == first.json()["id"]
    correction_path = path + "/" + first.json()["observation_id"]
    correction = {
        **payload,
        "raw_value": "0",
        "expected_revision": 1,
        "change_reason": "SYN-CORRECTION",
    }
    assert (
        client.post(
            correction_path,
            json=correction,
            headers=write_headers(client, "manual-correction-0001"),
        ).status_code
        == 201
    )
    assert (
        client.post(
            correction_path,
            json=correction,
            headers=write_headers(client, "manual-correction-0002"),
        ).status_code
        == 409
    )
    assert [r["snapshot"]["raw_value"] for r in client.get(path).json()] == ["4.120", "0"]
    for value in ("NaN", "Infinity", "garbage"):
        assert (
            client.post(path, json={**payload, "raw_value": value}, headers=headers).status_code
            == 422
        )
    assert client.post(path, json={**payload, "unit": "kg"}, headers=headers).status_code == 422
    assert (
        client.post(
            path, json={**payload, "metric_code": "frail_total"}, headers=headers
        ).status_code
        == 422
    )
    for index, (metric, unit) in enumerate(
        (("sit_to_stand_5_seconds", "s"), ("tug_seconds", "s"), ("grip_strength_kg", "kg")), start=2
    ):
        observed = client.post(
            path,
            json={
                **payload,
                "metric_code": metric,
                "unit": unit,
                "raw_value": "0.25",
                "side": "left" if unit == "kg" else "unknown",
            },
            headers=write_headers(client, f"manual-observation-000{index}"),
        )
        assert observed.status_code == 201, observed.text
        assert observed.json()["snapshot"]["raw_value"] == "0.25"
    missing = client.post(
        path,
        json={
            **payload,
            "validity": "missing",
            "raw_value": None,
            "performed_at": None,
            "missing_reason": "declined",
        },
        headers=write_headers(client, "manual-observation-missing"),
    )
    assert missing.status_code == 201
    assert missing.json()["snapshot"]["raw_value"] is None
    invalid = client.post(
        path,
        json={
            **payload,
            "validity": "invalid",
            "raw_value": "2.4",
            "missing_reason": "technical_failure",
        },
        headers=write_headers(client, "manual-observation-invalid"),
    )
    assert invalid.status_code == 201
    assert (
        client.post(
            path,
            json={**payload, "validity": "missing", "raw_value": None, "performed_at": None},
            headers=write_headers(client, "manual-missing-no-reason"),
        ).status_code
        == 422
    )
    assert (
        client.post(
            path,
            json={**payload, "validity": "valid", "performed_at": None},
            headers=write_headers(client, "manual-valid-no-time"),
        ).status_code
        == 422
    )
    for other in (ids["unassigned"], ids["cross_study"]):
        other_path = f"/api/v1/participants/{other}/manual-observations"
        assert client.get(other_path).status_code == 403
        assert client.post(other_path, json=payload, headers=headers).status_code == 403
    with Session(engine) as db:
        clinician = db.scalar(select(User).where(User.email == "intake-clinician@example.org"))
        db.delete(db.get(StudyAssignment, (clinician.id, ids["study_a"])))
        db.commit()
    assert client.get(path).status_code == 403
    assert (
        client.post(
            path, json=payload, headers=write_headers(client, "manual-after-revoke-01")
        ).status_code
        == 403
    )
    login(client, "intake-analyst@example.org")
    assert client.get(path).status_code == 403
