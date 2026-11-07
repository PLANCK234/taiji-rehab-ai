"""REAL-01F0 coded CSV accuracy, authorization and audit on disposable PostgreSQL."""

import csv
import hashlib
import io
import os
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_engine
from app.main import app
from app.models import (
    AuditEvent,
    ConsentRecord,
    Participant,
    ParticipantAssignment,
    Study,
    StudyAssignment,
    User,
)
from app.security import password_hash

pytestmark = pytest.mark.skipif(
    os.environ.get("ENG04_INTEGRATION") != "1",
    reason="requires the isolated taiji_eng04 PostgreSQL database",
)

PASSWORD = "synthetic-export-postgres-password"
AT = "2026-10-01T09:30:00+08:00"


def _headers(client: TestClient) -> dict[str, str]:
    return {
        "X-CSRF-Token": client.cookies["taiji_csrf"],
        "Idempotency-Key": str(uuid.uuid4()),
    }


def _login(client: TestClient, email: str) -> None:
    response = client.post("/api/v1/auth/login", json={"email": email, "password": PASSWORD})
    assert response.status_code == 200, response.text


def _assessment(client: TestClient, participant_id: uuid.UUID, kind: str, value: int | None):
    created = client.post(
        "/api/v1/assessments",
        json={"participant_id": str(participant_id), "visit_kind": kind},
        headers=_headers(client),
    )
    assert created.status_code == 201, created.text
    assessment_id = created.json()["id"]
    payload = {
        "expected_revision": 1,
        "validity": "valid" if value is not None else "missing",
        "raw_value": value,
        "missing_reason": None if value is not None else "declined",
        "performed_at": AT if value is not None else None,
    }
    revised = client.put(
        f"/api/v1/assessments/{assessment_id}/measurements",
        json=payload,
        headers=_headers(client),
    )
    assert revised.status_code == 200, revised.text
    confirmed = client.post(
        f"/api/v1/assessments/{assessment_id}/confirm",
        json={"expected_revision": 2},
        headers=_headers(client),
    )
    assert confirmed.status_code == 200, confirmed.text


def test_live_coded_csv_is_scoped_complete_and_audited() -> None:
    engine = get_engine()
    suffix = uuid.uuid4().hex[:10]
    clinician_email = f"export-clinician-{suffix}@example.org"
    peer_email = f"export-peer-{suffix}@example.org"
    analyst_email = f"export-analyst-{suffix}@example.org"
    with Session(engine) as db:
        study = Study(code=f"SYN-EXPORT-{suffix.upper()}")
        users = [
            User(email=email, password_hash=password_hash.hash(PASSWORD), role=role)
            for email, role in [
                (clinician_email, "clinician"),
                (peer_email, "clinician"),
                (analyst_email, "analyst"),
            ]
        ]
        db.add(study)
        db.add_all(users)
        db.flush()
        participant = Participant(study_id=study.id, study_code=f"SYN-EXP-{suffix.upper()}")
        db.add(participant)
        db.flush()
        for user in users:
            db.add(StudyAssignment(user_id=user.id, study_id=study.id))
        for user in (users[0], users[2]):
            db.add(ParticipantAssignment(user_id=user.id, participant_id=participant.id))
        db.add(
            ConsentRecord(
                participant_id=participant.id,
                document_version="SYN-FORM-V1",
                purpose_code="SYN-DEMO-USE",
                decision="granted",
                photo_scope=False,
                recorded_by=users[0].id,
            )
        )
        participant_id = participant.id
        participant_code = participant.study_code
        db.commit()

    path = f"/api/v1/participants/{participant_id}"
    export_path = f"{path}/research-export.csv"
    with TestClient(app) as client:
        assert client.get(export_path).status_code == 401
        _login(client, clinician_email)
        _assessment(client, participant_id, "baseline", 0)
        _assessment(client, participant_id, "revisit", None)
        raw_path = f"{path}/manual-observations"
        raw_payloads = [
            ("gait_4m_seconds", "s", "4.120", "valid", None, AT, "unknown"),
            ("sit_to_stand_5_seconds", "s", "0", "valid", None, AT, "unknown"),
            ("tug_seconds", "s", None, "missing", "declined", None, "unknown"),
            ("grip_strength_kg", "kg", "0.25", "invalid", "technical_failure", AT, "left"),
        ]
        raw_ids = []
        for metric, unit, value, validity, reason, performed_at, side in raw_payloads:
            created_raw = client.post(
                raw_path,
                json={
                    "metric_code": metric,
                    "unit": unit,
                    "raw_value": value,
                    "validity": validity,
                    "missing_reason": reason,
                    "performed_at": performed_at,
                    "side": side,
                    "context_note": "SYN-PRIVATE-RAW-TEXT",
                    "expected_revision": 0,
                },
                headers=_headers(client),
            )
            assert created_raw.status_code == 201, created_raw.text
            raw_ids.append(created_raw.json()["observation_id"])
        corrected_raw = client.post(
            f"{raw_path}/{raw_ids[0]}",
            json={
                "metric_code": "gait_4m_seconds",
                "unit": "s",
                "raw_value": "4.250",
                "validity": "valid",
                "performed_at": AT,
                "expected_revision": 1,
                "change_reason": "SYN-RAW-CORRECTION",
                "context_note": "SYN-PRIVATE-RAW-TEXT",
            },
            headers=_headers(client),
        )
        assert corrected_raw.status_code == 201, corrected_raw.text
        session = client.post(
            f"{path}/training-sessions",
            json={
                "session_at": AT,
                "action_label": "SYN-OBSERVED",
                "actual_minutes": 0,
                "completion_status": "interrupted",
            },
            headers=_headers(client),
        )
        assert session.status_code == 201, session.text
        session_id = session.json()["id"]
        feedback_path = f"/api/v1/training-sessions/{session_id}/feedback"
        first = client.put(
            feedback_path,
            json={"expected_revision": 0, "state": "missing", "missing_reason": "interrupted"},
            headers=_headers(client),
        )
        assert first.status_code == 200, first.text
        second = client.put(
            feedback_path,
            json={
                "expected_revision": 1,
                "state": "recorded",
                "rpe": 6,
                "fatigue": "SYN-PRIVATE-TEXT",
                "change_reason": "SYN-CORRECTION",
            },
            headers=_headers(client),
        )
        assert second.status_code == 200, second.text
        event = client.post(
            f"{path}/safety-events",
            json={
                "event_at": AT,
                "session_id": session_id,
                "description": "SYN-PRIVATE-EVENT-TEXT",
            },
            headers=_headers(client),
        )
        assert event.status_code == 201, event.text
        exported = client.get(export_path)
        assert exported.status_code == 200, exported.text
        assert exported.headers["x-export-mode"] == "live-demo"
        assert exported.headers["cache-control"] == "no-store"
        assert exported.headers["content-disposition"].endswith('-live-demo.csv"')
        rows = list(csv.DictReader(io.StringIO(exported.text)))
        assert len(rows) == 15
        assert exported.headers["x-row-count"] == str(len(rows))
        assert exported.headers["x-content-sha256"] == hashlib.sha256(exported.content).hexdigest()
        assert {row["participant_code"] for row in rows} == {participant_code}
        assert [row["record_type"] for row in rows].count("assessment_revision") == 6
        raw_rows = [row for row in rows if row["record_type"] == "manual_observation_revision"]
        assert len(raw_rows) == 5
        assert {row["metric_code"] for row in raw_rows} == {
            "gait_4m_seconds",
            "sit_to_stand_5_seconds",
            "tug_seconds",
            "grip_strength_kg",
        }
        gait = sorted(
            (row for row in raw_rows if row["metric_code"] == "gait_4m_seconds"),
            key=lambda row: int(row["revision_no"]),
        )
        assert [row["metric_value"] for row in gait] == ["4.120", "4.250"]
        assert [row["revision_no"] for row in gait] == ["1", "2"]
        assert gait[0]["parent_id"] == gait[1]["parent_id"] == raw_ids[0]
        assert all(row["measurement_source"] == "manual_staff_entry" for row in raw_rows)
        assert any(
            row["metric_code"] == "sit_to_stand_5_seconds" and row["metric_value"] == "0"
            for row in raw_rows
        )
        assert any(
            row["metric_code"] == "tug_seconds"
            and row["metric_value"] == ""
            and row["event_at_utc"] == ""
            and row["missing_reason"] == "declined"
            for row in raw_rows
        )
        assert any(
            row["metric_code"] == "grip_strength_kg"
            and row["metric_unit"] == "kg"
            and row["validity"] == "invalid"
            and row["measurement_side"] == "left"
            for row in raw_rows
        )
        assert any(row["metric_value"] == "0" and row["validity"] == "valid" for row in rows)
        assert any(
            row["validity"] == "missing"
            and row["metric_value"] == ""
            and row["missing_reason"] == "declined"
            for row in rows
        )
        assert any(
            row["record_type"] == "training_session" and row["actual_minutes"] == "0"
            for row in rows
        )
        assert any(
            row["record_type"] == "training_feedback_revision"
            and row["feedback_state"] == "missing"
            and row["rpe"] == ""
            for row in rows
        )
        assert any(
            row["record_type"] == "training_feedback_revision"
            and row["feedback_state"] == "recorded"
            and row["rpe"] == "6"
            for row in rows
        )
        assert not any(
            text in exported.text
            for text in [
                clinician_email,
                PASSWORD,
                "SYN-PRIVATE-TEXT",
                "SYN-PRIVATE-EVENT-TEXT",
                "SYN-PRIVATE-RAW-TEXT",
                "SYN-RAW-CORRECTION",
            ]
        )
        assert client.get(export_path).content == exported.content
    with TestClient(app) as client:
        _login(client, peer_email)
        assert client.get(export_path).status_code == 403
    with TestClient(app) as client:
        _login(client, analyst_email)
        assert client.get(export_path).status_code == 403
    with Session(engine) as db:
        assert any(
            row.action == "export"
            and row.outcome == "allowed"
            and row.resource_id == participant_id
            for row in db.scalars(select(AuditEvent)).all()
        )
        assert any(
            row.action == "export" and row.outcome == "denied"
            for row in db.scalars(select(AuditEvent)).all()
        )
    engine.dispose()
    get_engine.cache_clear()
