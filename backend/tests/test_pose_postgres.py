"""Pose create/replay/read/review against migrated disposable PostgreSQL."""

import os
import uuid

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
        assert detail["algorithm_version"] == "pose-geometry-v2"
        assert detail["result"]["series"][0]["smoothed_angles"]["left_elbow"] is not None
        legacy_detail = client.get(f"/api/v1/pose-analyses/{legacy_id}").json()
        assert legacy_detail["algorithm_version"] == "pose-geometry-v1"
        assert legacy_detail["result"] == original
    engine.dispose()
    get_engine.cache_clear()
