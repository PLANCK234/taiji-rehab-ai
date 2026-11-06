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
    Assessment,
    AuditEvent,
    ConsentRecord,
    DemoPatientBinding,
    DemoPatientPublication,
    DemoPatientReportRevision,
    LoginRateLimit,
    LoginSession,
    Participant,
    ParticipantAssignment,
    Study,
    StudyAssignment,
    TrainingSession,
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
        assert [event.outcome for event in events] == ["allowed", "denied", "denied", "denied"]
        assert all(event.actor_id == ids["clinician"] for event in events)


def test_role_denial(seeded_api) -> None:
    client, _, ids = seeded_api
    assert login(client, "analyst@example.org").status_code == 200
    response = client.get(f"/api/v1/participants/{ids['assigned']}")
    assert response.status_code == 403
    assert "SYN-001" not in response.text


def test_synthetic_staff_admin_grants_and_revocation(seeded_api) -> None:
    client, engine, ids = seeded_api
    with Session(engine) as db:
        admin = User(
            email="demo-admin@example.org",
            password_hash=password_hash.hash("synthetic-password-123"),
            role="admin",
        )
        db.add(admin)
        db.commit()

    assert login(client).status_code == 200
    assert client.get("/api/v1/admin/staff").status_code == 403
    assert login(client, "demo-admin@example.org").status_code == 200
    assert client.get("/api/v1/admin/staff").status_code == 200
    headers = {
        "X-CSRF-Token": client.cookies.get("taiji_csrf"),
        "Idempotency-Key": "synthetic-staff-1",
    }
    created = client.post(
        "/api/v1/admin/staff",
        json={"email": "demo-new@example.org", "role": "clinician", "password": "new-password-123"},
        headers=headers,
    )
    assert created.status_code == 201, created.text
    target = created.json()["id"]
    assert (
        client.post(
            "/api/v1/admin/staff",
            json={
                "email": "demo-new@example.org",
                "role": "clinician",
                "password": "new-password-123",
            },
            headers=headers,
        ).json()["id"]
        == target
    )

    def change(scope: str, scope_id: str, operation: str, expected: bool, key: str):
        return client.post(
            f"/api/v1/admin/staff/{target}/assignments",
            json={
                "scope": scope,
                "scope_id": scope_id,
                "operation": operation,
                "expected_assigned": expected,
            },
            headers={
                "X-CSRF-Token": client.cookies.get("taiji_csrf"),
                "Idempotency-Key": f"synthetic-{key}-key",
            },
        )

    assert change("participant", str(ids["assigned"]), "grant", False, "obj-0").status_code == 403
    assert change("study", str(ids["study_a"]), "grant", False, "study-1").status_code == 200
    assert change("participant", str(ids["assigned"]), "grant", False, "obj-1").status_code == 200
    assert (
        change("participant", str(ids["other_study"]), "grant", False, "obj-2").status_code == 403
    )
    with TestClient(app) as staff_client:
        assert (
            staff_client.post(
                "/api/v1/auth/login",
                json={
                    "email": "demo-new@example.org",
                    "password": "new-password-123",
                },
                headers={"Origin": "http://localhost:3000"},
            ).status_code
            == 200
        )
        assert staff_client.get(f"/api/v1/participants/{ids['assigned']}").status_code == 200
        assert staff_client.get(f"/api/v1/participants/{ids['other_study']}").status_code == 403
        assert change("study", str(ids["study_a"]), "revoke", True, "study-2").status_code == 200
        assert staff_client.get(f"/api/v1/participants/{ids['assigned']}").status_code == 403
    with Session(engine) as db:
        assert db.get(StudyAssignment, (uuid.UUID(target), ids["study_a"])) is None
        assert db.get(ParticipantAssignment, (uuid.UUID(target), ids["assigned"])) is None

    with TestClient(app) as staff_client:
        assert (
            staff_client.post(
                "/api/v1/auth/login",
                json={
                    "email": "demo-new@example.org",
                    "password": "new-password-123",
                },
                headers={"Origin": "http://localhost:3000"},
            ).status_code
            == 200
        )
        changed_role = client.post(
            f"/api/v1/admin/staff/{target}",
            json={
                "operation": "role",
                "expected_role": "clinician",
                "expected_active": True,
                "role": "analyst",
            },
            headers={
                "X-CSRF-Token": client.cookies.get("taiji_csrf"),
                "Idempotency-Key": "synthetic-role-change-1",
            },
        )
        assert changed_role.status_code == 200, changed_role.text
        assert changed_role.json()["role"] == "analyst"
        assert staff_client.get("/api/v1/auth/me").status_code == 401
        assert (
            staff_client.post(
                "/api/v1/auth/login",
                json={
                    "email": "demo-new@example.org",
                    "password": "new-password-123",
                },
                headers={"Origin": "http://localhost:3000"},
            ).status_code
            == 200
        )
        assert staff_client.get("/api/v1/auth/me").json()["role"] == "analyst"
        deactivated = client.post(
            f"/api/v1/admin/staff/{target}",
            json={"operation": "deactivate", "expected_role": "analyst", "expected_active": True},
            headers={
                "X-CSRF-Token": client.cookies.get("taiji_csrf"),
                "Idempotency-Key": "synthetic-deactivate-1",
            },
        )
        assert deactivated.status_code == 200, deactivated.text
        assert deactivated.json()["is_active"] is False
        assert staff_client.get("/api/v1/auth/me").status_code == 401
    assert (
        client.post(
            "/api/v1/auth/login",
            json={
                "email": "demo-new@example.org",
                "password": "new-password-123",
            },
            headers={"Origin": "http://localhost:3000"},
        ).status_code
        == 401
    )


def test_csrf_logout_and_revocation(seeded_api) -> None:
    client, engine, _ = seeded_api
    assert login(client).status_code == 200
    assert client.post("/api/v1/auth/logout").status_code == 403
    assert client.post("/api/v1/auth/logout", headers={"X-CSRF-Token": "wrong"}).status_code == 403
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


def test_local_origin_remains_allowed_with_temporary_public_url(seeded_api, monkeypatch) -> None:
    client, _, _ = seeded_api
    monkeypatch.setenv("APP_PUBLIC_URL", "https://temporary.example.org")
    monkeypatch.setenv("APP_LOCAL_URL", "http://127.0.0.1:3000")
    payload = {"email": "clinician@example.org", "password": "synthetic-password-123"}
    for origin, expected in (
        ("http://127.0.0.1:3000", 200),
        ("https://temporary.example.org", 200),
        ("https://other.example.org", 403),
    ):
        response = client.post("/api/v1/auth/login", json=payload, headers={"Origin": origin})
        assert response.status_code == expected
    monkeypatch.setenv("APP_ENV", "staging")
    response = client.post(
        "/api/v1/auth/login", json=payload, headers={"Origin": "http://127.0.0.1:3000"}
    )
    assert response.status_code == 403


def test_synthetic_patient_self_scope_and_revocation(seeded_api) -> None:
    client, engine, ids = seeded_api
    with Session(engine) as db:
        patient = User(
            email="demo-patient@example.org",
            password_hash=password_hash.hash("synthetic-password-123"),
            role="patient",
        )
        db.add(patient)
        db.flush()
        db.add(DemoPatientBinding(user_id=patient.id, participant_id=ids["assigned"]))
        db.commit()

    assert login(client, "demo-patient@example.org").status_code == 200
    assert client.get("/api/v1/patient/me").json() == {
        "study_code": "SYN-001",
        "publication": None,
    }
    assert client.get("/api/v1/studies").status_code == 403
    assert client.get("/api/v1/participants").status_code == 403
    assert client.get(f"/api/v1/participants/{ids['assigned']}").status_code == 403
    assert client.get(f"/api/v1/participants/{ids['other_study']}").status_code == 403
    assert client.get(f"/api/v1/participants/{ids['assigned']}/demo-plan").status_code == 403
    assert (
        client.post(
            f"/api/v1/participants/{ids['assigned']}/demo-patient-binding/revoke",
            headers={
                "Origin": "http://localhost:3000",
                "X-CSRF-Token": client.cookies.get("taiji_csrf"),
            },
        ).status_code
        == 403
    )

    with TestClient(app) as staff:
        assert login(staff).status_code == 200
        csrf = staff.cookies.get("taiji_csrf")
        assert (
            staff.post(
                f"/api/v1/participants/{ids['assigned']}/demo-patient-binding/revoke",
                headers={"Origin": "http://localhost:3000", "X-CSRF-Token": csrf},
            ).status_code
            == 204
        )
    assert client.get("/api/v1/patient/me").status_code == 401
    assert login(client, "demo-patient@example.org").status_code == 200
    assert client.get("/api/v1/patient/me").status_code == 403

    with Session(engine) as db:
        binding = db.scalar(select(DemoPatientBinding))
        assert binding is not None and binding.revoked_at is not None
        assert (
            db.scalar(
                select(AuditEvent).where(
                    AuditEvent.action == "revoke",
                    AuditEvent.resource_type == "demo_patient_binding",
                )
            )
            is not None
        )


def test_synthetic_publication_version_withdrawal_and_consent(seeded_api) -> None:
    _, engine, ids = seeded_api
    with Session(engine) as db:
        patient = User(
            email="demo-patient@example.org",
            password_hash=password_hash.hash("synthetic-password-123"),
            role="patient",
        )
        db.add(patient)
        db.flush()
        db.add_all(
            [
                DemoPatientBinding(user_id=patient.id, participant_id=ids["assigned"]),
                ConsentRecord(
                    participant_id=ids["assigned"],
                    document_version="SYN-V1",
                    purpose_code="SYN-DEMO",
                    decision="granted",
                    photo_scope=False,
                    recorded_by=ids["clinician"],
                ),
            ]
        )
        db.commit()

    path = f"/api/v1/participants/{ids['assigned']}/demo-patient-publications"
    with TestClient(app) as staff, TestClient(app) as patient_client:
        assert login(staff).status_code == 200
        assert login(patient_client, "demo-patient@example.org").status_code == 200
        assert staff.get(path).json() == []
        assert patient_client.get(path).status_code == 403
        payload = {
            "operation": "publish",
            "expected_version": 0,
            "synthetic_only_acknowledged": True,
        }
        headers = {
            "Origin": "http://localhost:3000",
            "X-CSRF-Token": staff.cookies.get("taiji_csrf"),
            "Idempotency-Key": "synthetic-publish-0001",
        }
        no_csrf = {k: v for k, v in headers.items() if k != "X-CSRF-Token"}
        assert staff.post(path, json=payload, headers=no_csrf).status_code == 403
        denied = staff.post(
            f"/api/v1/participants/{ids['same_study_unassigned']}/demo-patient-publications",
            json=payload,
            headers=headers,
        )
        assert denied.status_code == 403
        first = staff.post(path, json=payload, headers=headers)
        assert first.status_code == 201
        assert first.json()["version"] == 1
        assert first.json()["marker"] == "SYNTHETIC_PROCESS_ONLY"
        assert staff.post(path, json=payload, headers=headers).json() == first.json()
        demo_path = f"/api/v1/participants/{ids['assigned']}/demo-plan"
        assert patient_client.get(demo_path).status_code == 403
        home = patient_client.get("/api/v1/patient/me").json()
        assert home["publication"] == first.json()
        assert "训练计划" in home["publication"]["message"]
        stale = staff.post(
            path,
            json={**payload, "expected_version": 0},
            headers={**headers, "Idempotency-Key": "synthetic-publish-0002"},
        )
        assert stale.status_code == 409
        withdrawn = staff.post(
            path,
            json={**payload, "operation": "withdraw", "expected_version": 1},
            headers={**headers, "Idempotency-Key": "synthetic-withdraw-0001"},
        )
        assert withdrawn.status_code == 201
        assert withdrawn.json()["version"] == 2
        assert patient_client.get("/api/v1/patient/me").json()["publication"] is None
        republished = staff.post(
            path,
            json={**payload, "expected_version": 2},
            headers={**headers, "Idempotency-Key": "synthetic-publish-0003"},
        )
        assert republished.status_code == 201
        assert republished.json()["version"] == 3
        assert [row["state"] for row in staff.get(path).json()] == [
            "published",
            "withdrawn",
            "published",
        ]
        with Session(engine) as db:
            db.add(
                ConsentRecord(
                    participant_id=ids["assigned"],
                    document_version="SYN-V1",
                    purpose_code="SYN-DEMO",
                    decision="withdrawn",
                    photo_scope=False,
                    change_reason="SYN-WITHDRAW",
                    recorded_by=ids["clinician"],
                )
            )
            db.commit()
        assert patient_client.get("/api/v1/patient/me").json()["publication"] is None
        after_consent_withdrawal = staff.post(
            path,
            json={**payload, "operation": "withdraw", "expected_version": 3},
            headers={**headers, "Idempotency-Key": "synthetic-withdraw-0002"},
        )
        assert after_consent_withdrawal.status_code == 201
        assert after_consent_withdrawal.json()["version"] == 4
        blocked_publish = staff.post(
            path,
            json={**payload, "expected_version": 4},
            headers={**headers, "Idempotency-Key": "synthetic-publish-0004"},
        )
        assert blocked_publish.status_code == 403

    with Session(engine) as db:
        assert len(db.scalars(select(DemoPatientPublication)).all()) == 4
        assert (
            db.scalar(
                select(AuditEvent).where(
                    AuditEvent.resource_type == "demo_patient_publication",
                    AuditEvent.action == "withdraw",
                )
            )
            is not None
        )


def test_synthetic_patient_report_history_scope_and_missingness(seeded_api) -> None:
    _, engine, ids = seeded_api
    with Session(engine) as db:
        patient = User(
            email="demo-patient@example.org",
            password_hash=password_hash.hash("synthetic-password-123"),
            role="patient",
        )
        db.add(patient)
        db.flush()
        db.add(DemoPatientBinding(user_id=patient.id, participant_id=ids["assigned"]))
        db.commit()
    with TestClient(app) as staff, TestClient(app) as patient_client:
        assert login(staff).status_code == 200
        assert login(patient_client, "demo-patient@example.org").status_code == 200
        path = "/api/v1/patient/reports"
        staff_path = f"/api/v1/participants/{ids['assigned']}/patient-reports"
        assert patient_client.get(path).json() == []
        assert staff.get(staff_path).json() == []
        assert patient_client.get(staff_path).status_code == 403
        assert staff.get(path).status_code == 403
        assert (
            staff.get(
                f"/api/v1/participants/{ids['same_study_unassigned']}/patient-reports"
            ).status_code
            == 403
        )
        payload = {
            "expected_revision": 0,
            "observed_at": "2026-11-05T10:00:00+08:00",
            "activity_state": "unknown",
            "actual_minutes": None,
            "discomfort_state": "reported",
            "discomfort_note": "SYN-训练后感到不适",
            "change_reason": None,
        }
        headers = {
            "Origin": "http://localhost:3000",
            "X-CSRF-Token": patient_client.cookies.get("taiji_csrf"),
            "Idempotency-Key": "patient-report-create-0001",
        }
        assert patient_client.post(path, json=payload, headers=headers).status_code == 403
        with Session(engine) as db:
            db.add(
                ConsentRecord(
                    participant_id=ids["assigned"],
                    document_version="SYN-V1",
                    purpose_code="SYN-DEMO",
                    decision="granted",
                    photo_scope=False,
                    recorded_by=ids["clinician"],
                )
            )
            db.commit()
        assert (
            patient_client.post(
                path,
                json=payload,
                headers={k: v for k, v in headers.items() if k != "X-CSRF-Token"},
            ).status_code
            == 403
        )
        assert (
            patient_client.post(
                path,
                json={
                    **payload,
                    "discomfort_state": "none",
                },
                headers=headers,
            ).status_code
            == 422
        )
        first = patient_client.post(path, json=payload, headers=headers)
        assert first.status_code == 201
        assert first.json()["revision_no"] == 1
        assert first.json()["activity_state"] == "unknown"
        assert first.json()["actual_minutes"] is None
        assert patient_client.post(path, json=payload, headers=headers).json() == first.json()
        assert staff.get(staff_path).json()[0]["id"] == first.json()["id"]
        correction_path = f"{path}/{first.json()['report_id']}"
        correction = {
            **payload,
            "expected_revision": 1,
            "activity_state": "performed",
            "actual_minutes": 12,
            "discomfort_state": "none",
            "discomfort_note": None,
            "change_reason": "SYN-CORRECTION",
        }
        changed = patient_client.post(
            correction_path,
            json=correction,
            headers={
                **headers,
                "Idempotency-Key": "patient-report-correct-0001",
            },
        )
        assert changed.status_code == 201
        assert changed.json()["revision_no"] == 2
        assert [row["revision_no"] for row in patient_client.get(path).json()] == [2, 1]
        assert (
            patient_client.post(
                correction_path,
                json=correction,
                headers={
                    **headers,
                    "Idempotency-Key": "patient-report-correct-0002",
                },
            ).status_code
            == 409
        )
        assert (
            patient_client.post(
                correction_path,
                json={
                    **correction,
                    "actual_minutes": -1,
                },
                headers={**headers, "Idempotency-Key": "patient-report-correct-0003"},
            ).status_code
            == 422
        )
        with Session(engine) as db:
            db.add(
                ConsentRecord(
                    participant_id=ids["assigned"],
                    document_version="SYN-V1",
                    purpose_code="SYN-DEMO",
                    decision="withdrawn",
                    photo_scope=False,
                    change_reason="SYN-WITHDRAW",
                    recorded_by=ids["clinician"],
                )
            )
            db.commit()
        assert (
            patient_client.post(
                path,
                json=payload,
                headers={
                    **headers,
                    "Idempotency-Key": "patient-report-create-0002",
                },
            ).status_code
            == 403
        )
        assert len(patient_client.get(path).json()) == 2
        assert (
            staff.post(
                f"/api/v1/participants/{ids['assigned']}/demo-patient-binding/revoke",
                headers={
                    "Origin": "http://localhost:3000",
                    "X-CSRF-Token": staff.cookies.get("taiji_csrf"),
                },
            ).status_code
            == 204
        )
        assert patient_client.get(path).status_code == 401
    with Session(engine) as db:
        assert len(db.scalars(select(DemoPatientReportRevision)).all()) == 2
        assert (
            db.scalar(
                select(AuditEvent).where(
                    AuditEvent.resource_type == "patient_report",
                    AuditEvent.action == "revise",
                )
            )
            is not None
        )


def test_synthetic_cycle_visit_versions_and_unknown(seeded_api) -> None:
    client, engine, ids = seeded_api
    assert login(client).status_code == 200
    path = f"/api/v1/participants/{ids['assigned']}/cycles"
    headers = {
        "Origin": "http://localhost:3000",
        "X-CSRF-Token": client.cookies.get("taiji_csrf"),
        "Idempotency-Key": "cycle-create-test-0001",
    }
    assert client.get(path).json() == []
    assert client.post(path, json={"label": "合成周期 A"}, headers=headers).status_code == 403
    with Session(engine) as db:
        db.add(
            ConsentRecord(
                participant_id=ids["assigned"],
                document_version="SYN-V1",
                purpose_code="SYN-DEMO",
                decision="granted",
                photo_scope=False,
                recorded_by=ids["clinician"],
            )
        )
        db.commit()
    created = client.post(path, json={"label": "合成周期 A"}, headers=headers)
    assert created.status_code == 201
    assert client.post(path, json={"label": "合成周期 A"}, headers=headers).json() == created.json()
    visit_path = f"/api/v1/cycles/{created.json()['id']}/visits"
    visit = {
        "expected_revision": 0,
        "label": "人工访视 A",
        "attendance": "unknown",
        "assessment_state": "unknown",
        "assessment_id": None,
        "training_session_ids": [],
        "change_reason": None,
    }
    first = client.post(
        visit_path,
        json=visit,
        headers={
            **headers,
            "Idempotency-Key": "visit-create-test-0001",
        },
    )
    assert first.status_code == 201
    assert first.json()["revision_no"] == 1
    assert first.json()["attendance"] == "unknown"
    assert client.get(path).json()[0]["visits"][0]["assessment_state"] == "unknown"
    revised = client.post(
        f"{visit_path}/{first.json()['visit_id']}",
        json={
            **visit,
            "expected_revision": 1,
            "attendance": "not_attended",
            "assessment_state": "not_measured",
            "change_reason": "SYN-CORRECTION",
        },
        headers={**headers, "Idempotency-Key": "visit-revise-test-0001"},
    )
    assert revised.status_code == 201
    assert [row["revision_no"] for row in client.get(path).json()[0]["visits"]] == [1, 2]
    assert (
        client.post(
            visit_path,
            json={
                **visit,
                "assessment_state": "recorded",
            },
            headers={**headers, "Idempotency-Key": "visit-invalid-test-0001"},
        ).status_code
        == 422
    )
    assert (
        client.get(f"/api/v1/participants/{ids['same_study_unassigned']}/cycles").status_code == 403
    )

    with Session(engine) as db:
        own_assessment = Assessment(
            participant_id=ids["assigned"],
            visit_kind="revisit",
            protocol_version="SYN-MANUAL-V1",
            created_by=ids["clinician"],
        )
        foreign_assessment = Assessment(
            participant_id=ids["same_study_unassigned"],
            visit_kind="revisit",
            protocol_version="SYN-MANUAL-V1",
            created_by=ids["clinician"],
        )
        own_session = TrainingSession(
            participant_id=ids["assigned"],
            session_at=datetime.now(timezone.utc),
            action_label="SYN observed",
            completion_status="partial",
            source="manual_staff_entry",
            recorded_by=ids["clinician"],
        )
        foreign_session = TrainingSession(
            participant_id=ids["same_study_unassigned"],
            session_at=datetime.now(timezone.utc),
            action_label="SYN other",
            completion_status="partial",
            source="manual_staff_entry",
            recorded_by=ids["clinician"],
        )
        db.add_all([own_assessment, foreign_assessment, own_session, foreign_session])
        db.commit()
        own_assessment_id = str(own_assessment.id)
        foreign_assessment_id = str(foreign_assessment.id)
        own_session_id, foreign_session_id = str(own_session.id), str(foreign_session.id)
    linked = {
        **visit,
        "assessment_state": "recorded",
        "assessment_id": own_assessment_id,
        "training_session_ids": [own_session_id],
    }
    assert (
        client.post(
            visit_path,
            json={
                **linked,
                "assessment_id": foreign_assessment_id,
            },
            headers={**headers, "Idempotency-Key": "visit-cross-assessment-0001"},
        ).status_code
        == 403
    )
    assert (
        client.post(
            visit_path,
            json={
                **linked,
                "training_session_ids": [foreign_session_id],
            },
            headers={**headers, "Idempotency-Key": "visit-cross-session-0001"},
        ).status_code
        == 403
    )
    allowed = client.post(
        visit_path,
        json=linked,
        headers={
            **headers,
            "Idempotency-Key": "visit-linked-records-0001",
        },
    )
    assert allowed.status_code == 201
    assert allowed.json()["assessment_id"] == own_assessment_id
    assert allowed.json()["training_session_ids"] == [own_session_id]
    assert (
        client.post(
            f"{visit_path}/{first.json()['visit_id']}",
            json={
                **visit,
                "expected_revision": 1,
                "change_reason": "SYN-STALE",
            },
            headers={**headers, "Idempotency-Key": "visit-stale-0001"},
        ).status_code
        == 409
    )


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
        assert (
            client.post(
                "/api/v1/auth/login",
                json={"email": "clinician@example.org", "password": "incorrect"},
            ).status_code
            == 401
        )
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
        "secure": True,
        "httponly": True,
        "samesite": "strict",
        "path": "/",
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
