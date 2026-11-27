"""Explicit human values, missingness, snapshots and revisions stay separate from AI."""

import uuid

import pytest
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.models import User
from app.pose_schemas import PoseReviewInput
from tests.test_pose_analysis import input_payload
from tests.test_training_observations import consent, headers, login, training_api  # noqa: F401


def correction(**changes):
    return {
        "joint": "left_elbow", "metric": "median_deg", "validity": "valid", "value": 0,
        "reason": "合成角度人工核对", **changes,
    }


@pytest.mark.parametrize("changes", [
    {"value": None}, {"value": -1}, {"value": 181}, {"value": float("nan")},
    {"value": True}, {"value": "0"}, {"validity": "missing", "value": 0},
    {"reason": "  "}, {"joint": "unknown_joint"}, {"metric": "sppb_total"},
])
def test_invalid_correction_contract(changes):
    with pytest.raises(ValidationError):
        PoseReviewInput(expected_revision=0, decision="modified_observations", reason="测试",
                        corrections=[correction(**changes)])


def test_review_contract_requires_unique_explicit_modifications():
    with pytest.raises(ValidationError):
        PoseReviewInput(expected_revision=0, decision="modified_observations", reason="测试")
    with pytest.raises(ValidationError):
        PoseReviewInput(expected_revision=0, decision="accepted_observations", reason="测试",
                        corrections=[correction()])
    with pytest.raises(ValidationError):
        PoseReviewInput(expected_revision=0, decision="modified_observations", reason="测试",
                        corrections=[correction(), correction(value=45)])


def test_human_snapshot_zero_unknown_history_and_revocation(training_api):  # noqa: F811
    client, engine, participant_id, clinician_id = training_api
    login(client, "clinician")
    consent(engine, participant_id, clinician_id)
    created = client.post(f"/api/v1/participants/{participant_id}/pose-analyses",
                          json=input_payload(), headers=headers(client))
    assert created.status_code == 201, created.text
    original = created.json()["result"]
    path = f'/api/v1/pose-analyses/{created.json()["id"]}'
    assert client.get(path).json()["human_confirmation"] is None
    payload = {"expected_revision": 0, "decision": "modified_observations", "reason": "逐项核对",
               "corrections": [correction(), correction(
                   metric="range_p05_p95_deg", validity="missing", value=None,
                   reason="片段遮挡，无法判断幅度",
               )]}
    key = str(uuid.uuid4())
    saved = client.post(f"{path}/reviews", json=payload, headers=headers(client, key))
    assert saved.status_code == 201, saved.text
    assert saved.json()["recorded_by"] == str(clinician_id)
    assert client.post(f"{path}/reviews", json=payload,
                       headers=headers(client, key)).json()["id"] == saved.json()["id"]
    assert client.post(f"{path}/reviews", json=payload, headers=headers(client)).status_code == 409
    detail = client.get(path).json()
    human = detail["human_confirmation"]
    assert human["evidence_type"] == "HUMAN_CONFIRMATION"
    assert human["metrics"]["left_elbow"] == {"median_deg": 0, "range_p05_p95_deg": None}
    assert detail["result"] == original
    assert len(detail["reviews"]) == 1

    # A fresh correction snapshot does not silently inherit the first review's override.
    second = {"expected_revision": 1, "decision": "modified_observations", "reason": "新一轮复核",
              "corrections": [correction(joint="right_elbow", value=90)]}
    assert client.post(f"{path}/reviews", json=second, headers=headers(client)).status_code == 201
    assert client.get(path).json()["human_confirmation"]["metrics"]["left_elbow"] == {
        "median_deg": 92, "range_p05_p95_deg": 3.6,
    }
    for revision, decision in [(2, "needs_retake"), (3, "accepted_observations"), (4, "rejected")]:
        response = client.post(f"{path}/reviews", headers=headers(client), json={
            "expected_revision": revision, "decision": decision, "reason": "合成复核历史",
        })
        assert response.status_code == 201, response.text
        current = client.get(path).json()
        assert (current["human_confirmation"] is not None) == (decision == "accepted_observations")
        assert current["result"] == original
    assert len(client.get(path).json()["reviews"]) == 5
    assert client.get(path).json()["reviews"][0]["corrections"][0]["value"] == 0


def test_assistant_cannot_confirm_and_revoked_consent_blocks_corrections(training_api):  # noqa: F811
    client, engine, participant_id, clinician_id = training_api
    login(client, "clinician")
    consent(engine, participant_id, clinician_id)
    created = client.post(f"/api/v1/participants/{participant_id}/pose-analyses",
                          json=input_payload(), headers=headers(client)).json()
    path = f'/api/v1/pose-analyses/{created["id"]}/reviews'
    body = {"expected_revision": 0, "decision": "modified_observations", "reason": "核对",
            "corrections": [correction()]}
    with Session(engine) as db:
        db.get(User, clinician_id).role = "research_assistant"
        db.commit()
    assert client.post(path, json=body, headers=headers(client)).status_code == 403
    with Session(engine) as db:
        db.get(User, clinician_id).role = "clinical_approver"
        db.commit()
    assert client.post(path, json=body, headers=headers(client)).status_code == 201
    consent(engine, participant_id, clinician_id, decision="withdrawn")
    body["expected_revision"] = 1
    assert client.post(path, json=body, headers=headers(client)).status_code == 403
