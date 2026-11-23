"""Exact-revision review, source preservation, authorization and retry regression."""

import uuid
from datetime import datetime, timezone

import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session
from test_auth_scope import login, seeded_api  # noqa: F401

from app.models import (
    AuditEvent,
    ConsentRecord,
    DemoPatientPublication,
    DemoPatientReportRevision,
    User,
)


@pytest.fixture
def review_api(seeded_api):  # noqa: F811
    client, engine, ids = seeded_api
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
        db.add(
            DemoPatientPublication(
                participant_id=ids["assigned"],
                version=1,
                state="published",
                marker="SYNTHETIC_PROCESS_ONLY",
                recorded_by=ids["clinician"],
            )
        )
        db.flush()
        source = DemoPatientReportRevision(
            report_id=uuid.uuid4(),
            participant_id=ids["assigned"],
            revision_no=1,
            publication_version=1,
            pose_summary={"sample_count": 5, "detected_count": 0, "framing_check_pass_count": 0},
            observed_at=datetime.now(timezone.utc),
            activity_state="unknown",
            discomfort_state="unknown",
            recorded_by=ids["clinician"],
        )
        db.add(source)
        db.commit()
        source_id = str(source.id)
    path = f"/api/v1/participants/{ids['assigned']}/patient-report-reviews"
    payload = {
        "report_revision_id": source_id,
        "expected_review_no": 0,
        "result": "unable",
        "note": "SYN-只有计数，无法判定动作表现",
    }
    return client, engine, ids, path, payload


def headers(client, key="synthetic-review-0001"):
    return {
        "Origin": "http://localhost:3000",
        "X-CSRF-Token": client.cookies["taiji_csrf"],
        "Idempotency-Key": key,
    }


def test_review_history_retry_and_stale_source(review_api):
    client, engine, ids, path, payload = review_api
    assert client.get(path).status_code == 401
    login(client)
    assert client.get(path).json() == []
    assert client.post(path, json=payload, headers={
        "Idempotency-Key": "synthetic-review-no-csrf"
    }).status_code == 403
    first = client.post(path, json=payload, headers=headers(client))
    assert first.status_code == 201
    assert client.post(path, json=payload, headers=headers(client)).json() == first.json()
    changed = {**payload, "expected_review_no": 1, "result": "reviewed", "note": "SYN-仅核对计数"}
    assert client.post(path, json=changed, headers=headers(client)).status_code == 409
    second = client.post(path, json=changed, headers=headers(client, "synthetic-review-0002"))
    assert second.status_code == 201
    assert second.json()["review_no"] == 2
    assert (
        client.post(
            path, json=payload, headers=headers(client, "synthetic-review-0003")
        ).status_code
        == 409
    )
    assert len(client.get(path).json()) == 2
    source_path = f"/api/v1/participants/{ids['assigned']}/patient-reports"
    original = client.get(source_path).json()[0]
    assert original["activity_state"] == "unknown"
    assert original["actual_minutes"] is None
    assert original["pose_summary"]["detected_count"] == 0
    with Session(engine) as db:
        source = db.get(DemoPatientReportRevision, uuid.UUID(payload["report_revision_id"]))
        db.add(
            DemoPatientReportRevision(
                report_id=source.report_id,
                participant_id=source.participant_id,
                revision_no=2,
                publication_version=1,
                pose_summary=source.pose_summary,
                observed_at=source.observed_at,
                activity_state="not_performed",
                discomfort_state="unknown",
                change_reason="SYN-CORRECTION",
                recorded_by=ids["clinician"],
            )
        )
        db.commit()
    assert (
        client.post(
            path,
            json={**changed, "expected_review_no": 2},
            headers=headers(client, "synthetic-review-0004"),
        ).status_code
        == 409
    )
    # Retry of an already committed operation remains idempotent after correction.
    assert client.post(path, json=payload, headers=headers(client)).json() == first.json()
    current = client.get(source_path).json()[0]
    assert current["id"] != payload["report_revision_id"]
    assert (
        client.post(
            path,
            json={**payload, "report_revision_id": current["id"]},
            headers=headers(client, "synthetic-review-0005"),
        ).status_code
        == 201
    )
    with Session(engine) as db:
        audits = db.scalars(
            select(AuditEvent).where(AuditEvent.resource_type == "patient_report_review")
        ).all()
        assert audits
        assert payload["note"] not in str([a.__dict__ for a in audits])


@pytest.mark.parametrize("role", ["patient", "analyst", "admin", "clinical_approver"])
def test_review_role_boundary(review_api, role):
    client, engine, ids, path, payload = review_api
    with Session(engine) as db:
        db.get(User, ids["clinician"]).role = role
        db.commit()
    login(client)
    assert client.post(path, json=payload, headers=headers(client)).status_code == 403
    assert client.get(path).status_code == (200 if role == "clinical_approver" else 403)


def test_review_scope_validation_consent_and_assistant(review_api):
    client, engine, ids, path, payload = review_api
    login(client)
    for target in [ids["same_study_unassigned"], ids["other_study"], uuid.uuid4()]:
        other = f"/api/v1/participants/{target}/patient-report-reviews"
        assert client.get(other).status_code == 403
        assert client.post(other, json=payload, headers=headers(client)).status_code == 403
    assert (
        client.post(
            path, json={**payload, "report_revision_id": str(uuid.uuid4())}, headers=headers(client)
        ).status_code
        == 403
    )
    for invalid in [
        {"note": " "},
        {"note": "x" * 501},
        {"result": "safe"},
        {"expected_review_no": True},
        {"pose_summary": {}},
    ]:
        assert (
            client.post(path, json={**payload, **invalid}, headers=headers(client)).status_code
            == 422
        )
    with Session(engine) as db:
        db.get(User, ids["clinician"]).role = "research_assistant"
        db.commit()
    assert client.post(path, json=payload, headers=headers(client)).status_code == 201
    with Session(engine) as db:
        db.add(
            ConsentRecord(
                participant_id=ids["assigned"],
                document_version="SYN-V1",
                purpose_code="SYN-DEMO",
                decision="withdrawn",
                photo_scope=False,
                recorded_by=ids["clinician"],
            )
        )
        db.commit()
    assert client.get(path).status_code == 200
    assert (
        client.post(
            path,
            json={**payload, "expected_review_no": 1},
            headers=headers(client, "synthetic-review-0002"),
        ).status_code
        == 403
    )
