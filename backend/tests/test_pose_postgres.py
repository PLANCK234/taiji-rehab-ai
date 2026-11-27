"""Pose create/replay/read/review against migrated disposable PostgreSQL."""

import os
import uuid
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db import get_engine
from app.main import app
from app.models import (
    ConsentRecord,
    Participant,
    ParticipantAssignment,
    PoseAnalysis,
    Study,
    StudyAssignment,
    User,
)
from app.pose_analysis import analyze_pose_v1
from app.pose_schemas import PoseInput
from app.security import password_hash
from tests.test_pose_analysis import input_payload

pytestmark = pytest.mark.skipif(
    os.environ.get("ENG04_INTEGRATION") != "1", reason="disposable PostgreSQL only",
)


def test_pose_commits_and_reloads_in_postgres():
    engine = get_engine()
    with engine.connect() as connection:
        assert connection.scalar(text("select current_database()")) == "taiji_eng04"
    suffix = uuid.uuid4().hex[:8]
    email, password = f"pose-{suffix}@example.org", "synthetic-pose-postgres-password"
    with Session(engine) as db:
        study = Study(code=f"SYN-POSE-{suffix}")
        user = User(email=email, password_hash=password_hash.hash(password), role="clinician")
        db.add_all([study, user])
        db.flush()
        participant = Participant(study_id=study.id, study_code=f"SYN-POSE-{suffix}")
        db.add(participant)
        db.flush()
        db.add_all([
            StudyAssignment(user_id=user.id, study_id=study.id),
            ParticipantAssignment(user_id=user.id, participant_id=participant.id),
            ConsentRecord(participant_id=participant.id, document_version="SYN-POSE-V1",
                          purpose_code="SYN-DEMO-USE", decision="granted", photo_scope=False,
                          recorded_by=user.id),
        ])
        participant_id = str(participant.id)
        original = analyze_pose_v1(PoseInput(**input_payload()))
        legacy = PoseAnalysis(
            participant_id=participant.id, input_data=input_payload(), input_sha256="b" * 64,
            algorithm_version="pose-geometry-v1", result=original, created_by=user.id,
        )
        db.add(legacy)
        db.flush()
        legacy_id = str(legacy.id)
        db.commit()
    with TestClient(app) as client:
        login = client.post("/api/v1/auth/login", json={"email": email, "password": password})
        assert login.status_code == 200
        headers = {
            "X-CSRF-Token": client.cookies["taiji_csrf"], "Idempotency-Key": str(uuid.uuid4()),
        }
        path = f"/api/v1/participants/{participant_id}/pose-analyses"
        created = client.post(path, json=input_payload(), headers=headers)
        assert created.status_code == 201, created.text
        analysis_id = created.json()["id"]
        assert client.post(path, json=input_payload(), headers=headers).json()["id"] == analysis_id
        headers["Idempotency-Key"] = str(uuid.uuid4())
        review = client.post(f"/api/v1/pose-analyses/{analysis_id}/reviews", headers=headers, json={
            "expected_revision": 0, "decision": "accepted_observations", "reason": "合成几何已核对",
        })
        assert review.status_code == 201, review.text
    with TestClient(app) as client:
        client.post("/api/v1/auth/login", json={"email": email, "password": password})
        detail = client.get(f"/api/v1/pose-analyses/{analysis_id}").json()
        assert detail["result"]["metrics"]["left_elbow"]["median_deg"] == 92
        assert detail["reviews"][0]["revision_no"] == 1
        assert detail["reviews"][0]["corrections"] == []
        assert detail["human_confirmation"]["metrics"]["left_elbow"]["median_deg"] == 92
        assert detail["algorithm_version"] == "pose-geometry-v3"
        assert detail["result"]["series"][0]["smoothed_angles"]["left_elbow"] is not None
        legacy_detail = client.get(f"/api/v1/pose-analyses/{legacy_id}").json()
        assert legacy_detail["algorithm_version"] == "pose-geometry-v1"
        assert legacy_detail["result"] == original
        csrf = client.cookies["taiji_csrf"]
        modified = client.post(f"/api/v1/pose-analyses/{analysis_id}/reviews", headers={
            "X-CSRF-Token": csrf, "Idempotency-Key": str(uuid.uuid4()),
        }, json={
            "expected_revision": 1, "decision": "modified_observations", "reason": "逐项核对",
            "corrections": [{"joint": "left_elbow", "metric": "median_deg", "validity": "valid",
                             "value": 0, "reason": "合成零值修正"}],
        })
        assert modified.status_code == 201, modified.text
    with TestClient(app) as client:
        client.post("/api/v1/auth/login", json={"email": email, "password": password})
        detail = client.get(f"/api/v1/pose-analyses/{analysis_id}").json()
        assert detail["result"]["metrics"]["left_elbow"]["median_deg"] == 92
        assert detail["human_confirmation"]["metrics"]["left_elbow"]["median_deg"] == 0
        assert len(detail["reviews"]) == 2
    # Two independent authenticated sessions submit the same expected revision
    # concurrently. PostgreSQL row locks must permit exactly one new snapshot.
    with TestClient(app) as tab_a, TestClient(app) as tab_b:
        for tab in (tab_a, tab_b):
            response = tab.post("/api/v1/auth/login", json={"email": email, "password": password})
            assert response.status_code == 200
        barrier = Barrier(2)

        def submit(tab):
            barrier.wait(timeout=10)
            return tab.post(f"/api/v1/pose-analyses/{analysis_id}/reviews", headers={
                "X-CSRF-Token": tab.cookies["taiji_csrf"], "Idempotency-Key": str(uuid.uuid4()),
            }, json={"expected_revision": 2, "decision": "needs_retake", "reason": "并发复核"})

        with ThreadPoolExecutor(max_workers=2) as pool:
            statuses = sorted(response.status_code for response in pool.map(submit, (tab_a, tab_b)))
        assert statuses == [201, 409]
        current = tab_a.get(f"/api/v1/pose-analyses/{analysis_id}").json()
        assert len(current["reviews"]) == 3 and current["human_confirmation"] is None
        assert current["reviews"][1]["corrections"][0]["value"] == 0
    engine.dispose()
    get_engine.cache_clear()
