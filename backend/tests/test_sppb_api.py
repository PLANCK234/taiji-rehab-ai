"""Candidate/confirmation isolation, access, unknown timing, retries and revisions."""

import uuid

import pytest
from pydantic import ValidationError
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import (
    Assessment,
    AuditEvent,
    DemoGradeResult,
    Participant,
    ParticipantAssignment,
    PoseAnalysis,
    SppbMeasurement,
    SppbReview,
    StudyAssignment,
    User,
)
from app.sppb_schemas import SppbCreate, SppbReviewInput
from tests.test_pose_analysis import input_payload
from tests.test_sppb_measure import trajectory
from tests.test_training_observations import consent, headers, login, training_api  # noqa: F401


def source(client, participant_id, data=None):
    response = client.post(f"/api/v1/participants/{participant_id}/pose-analyses",
                           json=data or trajectory(), headers=headers(client))
    assert response.status_code == 201, response.text
    return response.json()


def body(**changes):
    return {"expected_revision": 0, "decision": "accepted_timing", "reason": "核对坐站计时",
            **changes}


@pytest.mark.parametrize("changes", [
    {"decision": "modified_timing"},
    {"decision": "modified_timing", "start_ms": 0},
    {"decision": "modified_timing", "start_ms": 100, "fifth_stand_ms": 100},
    {"decision": "modified_timing", "start_ms": 0, "fifth_stand_ms": float("inf")},
    {"start_ms": 0}, {"reason": "  "}, {"expected_revision": True},
    {"decision": "modified_timing", "start_ms": "0", "fifth_stand_ms": 200},
    {"decision": "modified_timing", "start_ms": False, "fifth_stand_ms": 200},
])
def test_invalid_review_contract(changes):
    with pytest.raises(ValidationError):
        SppbReviewInput(**body(**changes))


def test_create_contract_only_accepts_registered_source_and_manual_start():
    for changes in ({"manual_start_ms": -1}, {"manual_start_ms": float("nan")},
                    {"result": {}}, {"algorithm_version": "fake"}):
        with pytest.raises(ValidationError):
            SppbCreate(source_analysis_id=uuid.uuid4(), **changes)


def test_saved_measurement_human_history_replay_and_original_immutable(training_api):  # noqa: F811
    client, engine, pid, uid = training_api
    login(client, "clinician")
    consent(engine, pid, uid)
    original = source(client, pid)
    path = f"/api/v1/participants/{pid}/sppb-measurements"
    payload = {"source_analysis_id": original["id"], "manual_start_ms": 0}
    key = str(uuid.uuid4())
    created = client.post(path, json=payload, headers=headers(client, key))
    assert created.status_code == 201, created.text
    row = created.json()
    assert row["result"]["elapsed_seconds"] == 10.6
    assert row["created_by"] == str(uid)
    assert client.post(path, json=payload, headers=headers(client, key)).json()["id"] == row["id"]
    assert client.post(path, json={**payload, "manual_start_ms": 200},
                       headers=headers(client, key)).status_code == 409
    detail_path = f'/api/v1/sppb-measurements/{row["id"]}'
    assert client.get(detail_path).json()["human_confirmation"] is None
    review_key = str(uuid.uuid4())
    first = client.post(f"{detail_path}/reviews", json=body(), headers=headers(client, review_key))
    assert first.status_code == 201, first.text
    assert client.get(detail_path).json()["human_confirmation"]["elapsed_seconds"] == 10.6
    modified = body(expected_revision=1, decision="modified_timing", start_ms=0,
                    fifth_stand_ms=10_000)
    second = client.post(f"{detail_path}/reviews", json=modified, headers=headers(client))
    assert second.status_code == 201, second.text
    # Replay an earlier successful response, even after a subsequent revision.
    assert client.post(f"{detail_path}/reviews", json=body(),
                       headers=headers(client, review_key)).json()["id"] == first.json()["id"]
    assert client.post(f"{detail_path}/reviews", json=modified,
                       headers=headers(client)).status_code == 409
    for revision, decision in [(2, "needs_retake"), (3, "accepted_timing"), (4, "rejected")]:
        saved = client.post(f"{detail_path}/reviews", headers=headers(client),
                            json=body(expected_revision=revision, decision=decision))
        assert saved.status_code == 201, saved.text
        current = client.get(detail_path).json()
        assert current["result"] == row["result"]
        if decision == "accepted_timing":
            # Acceptance restores AI timing; it never silently inherits an older override.
            assert current["human_confirmation"]["elapsed_seconds"] == 10.6
        else:
            assert current["human_confirmation"] is None
    history = client.get(detail_path).json()["reviews"]
    assert len(history) == 5 and history[1]["start_ms"] == 0
    assert all(r["recorded_by"] == str(uid) and r["recorded_at"] for r in history)
    saved_source = client.get(f'/api/v1/pose-analyses/{original["id"]}').json()
    assert saved_source["result"] == original["result"]
    page = client.get(path, params={"limit": 1, "offset": 0}).json()
    assert page["total"] == 1 and page["items"][0]["id"] == row["id"]
    assert client.get(path, params={"offset": 1}).json()["items"] == []
    assert client.get(path, params={"limit": 101}).status_code == 422
    with Session(engine) as db:
        assert db.scalar(select(func.count()).select_from(SppbMeasurement)) == 1
        assert db.scalar(select(func.count()).select_from(SppbReview)) == 5
        assert db.scalar(select(func.count()).select_from(Assessment)) == 0
        assert db.scalar(select(func.count()).select_from(DemoGradeResult)) == 0
        assert db.scalar(select(func.count()).select_from(AuditEvent).where(
            AuditEvent.resource_type == "sppb_measurement", AuditEvent.outcome == "allowed",
        )) > 0


def test_unknown_cannot_be_accepted_but_explicit_human_timing_is_independent(training_api):  # noqa: F811
    client, engine, pid, uid = training_api
    login(client, "clinician")
    consent(engine, pid, uid)
    original = source(client, pid, input_payload())
    path = f"/api/v1/participants/{pid}/sppb-measurements"
    row = client.post(path, json={"source_analysis_id": original["id"]},
                      headers=headers(client)).json()
    assert row["result"]["elapsed_seconds"] is None
    detail = f'/api/v1/sppb-measurements/{row["id"]}'
    key = str(uuid.uuid4())
    assert client.post(f"{detail}/reviews", json=body(),
                       headers=headers(client, key)).status_code == 422
    assert client.post(f"{detail}/reviews", headers=headers(client), json=body(
        decision="modified_timing", start_ms=0, fifth_stand_ms=2001,
    )).status_code == 422  # source ends at 2000ms
    response = client.post(f"{detail}/reviews", headers=headers(client, key), json=body(
        decision="modified_timing", start_ms=0, fifth_stand_ms=1000,
    ))
    assert response.status_code == 201, response.text  # Failed writes reserve no receipt.
    current = client.get(detail).json()
    assert current["human_confirmation"]["elapsed_seconds"] == 1
    assert current["result"]["elapsed_seconds"] is None
    assert current["result"]["sppb_score"] is None
    assert len(current["reviews"]) == 1
    assert client.post(path, headers=headers(client), json={
        "source_analysis_id": original["id"], "manual_start_ms": 2001,
    }).status_code == 422


def test_scopes_roles_csrf_consent_and_retry_reauthorization(training_api):  # noqa: F811
    client, engine, pid, uid = training_api
    path = f"/api/v1/participants/{pid}/sppb-measurements"
    assert client.get(path).status_code == 401
    login(client, "clinician")
    consent(engine, pid, uid)
    original = source(client, pid)
    payload = {"source_analysis_id": original["id"]}
    assert client.post(path, json=payload, headers={"Idempotency-Key": str(uuid.uuid4())}
                       ).status_code == 403
    assert client.post(path, json=payload,
                       headers={"X-CSRF-Token": client.cookies["taiji_csrf"]}).status_code == 422
    key = str(uuid.uuid4())
    row = client.post(path, json=payload, headers=headers(client, key)).json()
    detail = f'/api/v1/sppb-measurements/{row["id"]}'
    for who in ("outsider", "analyst"):
        login(client, who)
        for route in (path, detail):
            assert client.get(route).status_code == 403
        assert client.post(path, json=payload, headers=headers(client)).status_code == 403
        assert client.post(f"{detail}/reviews", json=body(),
                           headers=headers(client)).status_code == 403
    login(client, "clinician")
    with Session(engine) as db:
        db.get(User, uid).role = "research_assistant"
        db.commit()
    assert client.get(detail).status_code == 200
    assert client.post(f"{detail}/reviews", json=body(),
                       headers=headers(client)).status_code == 403
    with Session(engine) as db:
        db.get(User, uid).role = "clinical_approver"
        db.commit()
    assert client.post(f"{detail}/reviews", json=body(),
                       headers=headers(client)).status_code == 201
    with Session(engine) as db:
        db.get(User, uid).role = "clinician"
        db.commit()
    consent(engine, pid, uid, decision="withdrawn")
    assert client.post(path, json=payload, headers=headers(client, key)).status_code == 403
    assert client.post(f"{detail}/reviews", json=body(expected_revision=1),
                       headers=headers(client)).status_code == 403
    assert client.get(detail).status_code == 200  # History retained after withdrawal.
    with Session(engine) as db:
        assignment = db.get(StudyAssignment, (uid, db.get(Participant, pid).study_id))
        db.delete(assignment)
        db.commit()
    assert client.get(detail).status_code == 403


def test_other_participant_source_and_unknown_ids_denied(training_api):  # noqa: F811
    client, engine, pid, uid = training_api
    login(client, "clinician")
    consent(engine, pid, uid)
    original = source(client, pid)
    with Session(engine) as db:
        other = Participant(study_id=db.get(Participant, pid).study_id, study_code="SYN-OTHER")
        db.add(other)
        db.flush()
        db.add(ParticipantAssignment(user_id=uid, participant_id=other.id))
        other_id = other.id
        db.commit()
    consent(engine, other_id, uid)
    assert client.post(f"/api/v1/participants/{other_id}/sppb-measurements",
                       headers=headers(client), json={"source_analysis_id": original["id"]}
                       ).status_code == 403
    assert client.post(f"/api/v1/participants/{pid}/sppb-measurements", headers=headers(client),
                       json={"source_analysis_id": str(uuid.uuid4())}).status_code == 403
    assert client.get(f"/api/v1/sppb-measurements/{uuid.uuid4()}").status_code == 403
    with Session(engine) as db:
        assert db.scalar(select(func.count()).select_from(PoseAnalysis)) == 1
        assert db.scalar(select(func.count()).select_from(SppbMeasurement)) == 0


def test_database_rejects_inconsistent_review_rows(training_api):  # noqa: F811
    client, engine, pid, uid = training_api
    login(client, "clinician")
    consent(engine, pid, uid)
    original = source(client, pid)
    row = client.post(f"/api/v1/participants/{pid}/sppb-measurements", headers=headers(client),
                      json={"source_analysis_id": original["id"]}).json()
    for values in ({"decision": "modified_timing"},
                   {"decision": "accepted_timing", "start_ms": 0},
                   {"decision": "modified_timing", "start_ms": 2, "fifth_stand_ms": 1}):
        with Session(engine) as db:
            db.add(SppbReview(measurement_id=uuid.UUID(row["id"]), revision_no=1,
                              reason="测试数据库约束", recorded_by=uid, **values))
            with pytest.raises(IntegrityError):
                db.commit()
