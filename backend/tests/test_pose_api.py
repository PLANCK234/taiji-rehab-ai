"""Permission, persistence, original evidence and versioned human review."""

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import PoseAnalysis
from tests.test_pose_analysis import input_payload
from tests.test_training_observations import consent, headers, login, training_api  # noqa: F401


def test_pose_history_permissions_idempotency_and_reviews(training_api):  # noqa: F811
    client, engine, participant_id, clinician_id = training_api
    path = f"/api/v1/participants/{participant_id}/pose-analyses"
    payload = input_payload()
    assert client.get(path).status_code == 401
    login(client, "clinician")
    assert client.post(path, json=payload, headers=headers(client)).status_code == 403
    consent(engine, participant_id, clinician_id)
    key = str(uuid.uuid4())
    saved = client.post(path, json=payload, headers=headers(client, key))
    assert saved.status_code == 201, saved.text
    record = saved.json()
    assert record["result"]["metrics"]["left_elbow"]["median_deg"] == 92
    replay = client.post(path, json=payload, headers=headers(client, key))
    assert replay.json()["id"] == record["id"]
    changed = {**payload, "support": "standing"}
    assert client.post(path, json=changed, headers=headers(client, key)).status_code == 409
    no_csrf = client.post(path, json=payload, headers={"Idempotency-Key": str(uuid.uuid4())})
    assert no_csrf.status_code == 403
    detail = f'/api/v1/pose-analyses/{record["id"]}'
    assert client.get(detail).json()["input_data"] == payload
    assert "series" in client.get(detail).json()["result"]
    assert "series" not in client.get(path).json()[0]["result"]
    review = {"expected_revision": 0, "decision": "needs_retake", "reason": "部分下肢遮挡"}
    review_key = str(uuid.uuid4())
    reviewed = client.post(f"{detail}/reviews", json=review, headers=headers(client, review_key))
    assert reviewed.status_code == 201, reviewed.text
    replay_review = client.post(
        f"{detail}/reviews", json=review, headers=headers(client, review_key),
    )
    assert replay_review.json() == reviewed.json()
    assert client.post(f"{detail}/reviews", json=review, headers=headers(client)).status_code == 409
    assert client.get(detail).json()["result"] == record["result"]
    assert client.get(detail).json()["reviews"][0]["revision_no"] == 1
    login(client, "outsider")
    assert client.get(path).status_code == 403
    assert client.get(detail).status_code == 403
    assert client.post(f"{detail}/reviews", json=review, headers=headers(client)).status_code == 403
    login(client, "analyst")
    assert client.get(path).status_code == 403
    with Session(engine) as db:
        assert len(db.scalars(select(PoseAnalysis)).all()) == 1
