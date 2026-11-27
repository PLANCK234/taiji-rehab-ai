"""Real PostgreSQL commits, concurrent revisions, constraints and guarded rollback."""

import os
import subprocess
import sys
import uuid
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from threading import Barrier

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db import get_engine
from app.main import app
from app.models import (
    ConsentRecord,
    Participant,
    ParticipantAssignment,
    PoseAnalysis,
    SppbMeasurement,
    SppbReview,
    Study,
    StudyAssignment,
    User,
)
from app.pose_analysis import analyze_pose
from app.pose_schemas import PoseInput
from app.security import password_hash
from app.sppb_measure import measure_sit_to_stand
from tests.test_sppb_measure import trajectory

pytestmark = pytest.mark.skipif(
    os.environ.get("ENG04_INTEGRATION") != "1", reason="disposable PostgreSQL only",
)


def seed(engine, *, authorized=False):
    suffix = uuid.uuid4().hex[:10]
    with Session(engine) as db:
        user = User(email=f"sppb-{suffix}@example.org", role="clinician",
                    password_hash=password_hash.hash("synthetic-sppb-pg-password"))
        study = Study(code=f"SYN-SPPB-{suffix}")
        db.add_all([user, study])
        db.flush()
        participant = Participant(study_id=study.id, study_code=f"SYN-SPPB-{suffix}")
        db.add(participant)
        db.flush()
        payload = PoseInput(**trajectory())
        pose = PoseAnalysis(participant_id=participant.id,
                            input_data=payload.model_dump(mode="json"),
                            input_sha256="e" * 64, algorithm_version="pose-geometry-v3",
                            result=analyze_pose(payload), created_by=user.id)
        db.add(pose)
        if authorized:
            db.add_all([
                StudyAssignment(user_id=user.id, study_id=study.id),
                ParticipantAssignment(user_id=user.id, participant_id=participant.id),
                ConsentRecord(participant_id=participant.id, decision="granted", photo_scope=False,
                              document_version="SYN-V1", purpose_code="SYN-DEMO-USE",
                              recorded_by=user.id),
            ])
        db.flush()
        result = (str(participant.id), str(pose.id), user.email, user.id)
        db.commit()
        return result


def test_sppb_persistence_concurrent_review_and_constraints():
    engine = get_engine()
    with engine.connect() as connection:
        assert connection.scalar(text("select current_database()")) == "taiji_eng04"
    pid, source_id, email, uid = seed(engine, authorized=True)
    path = f"/api/v1/participants/{pid}/sppb-measurements"

    def login(client):
        response = client.post("/api/v1/auth/login", json={
            "email": email, "password": "synthetic-sppb-pg-password",
        })
        assert response.status_code == 200

    def headers(client, key=None):
        return {"X-CSRF-Token": client.cookies["taiji_csrf"],
                "Idempotency-Key": key or str(uuid.uuid4())}

    with TestClient(app) as client:
        login(client)
        payload = {"source_analysis_id": source_id}
        key = str(uuid.uuid4())
        saved = client.post(path, json=payload, headers=headers(client, key))
        assert saved.status_code == 201, saved.text
        original = saved.json()
        assert original["result"]["elapsed_seconds"] == 10
        assert client.post(path, json=payload, headers=headers(client, key)
                           ).json()["id"] == original["id"]
        detail_path = f'/api/v1/sppb-measurements/{original["id"]}'
    with TestClient(app) as client:
        login(client)
        assert client.get(detail_path).json()["result"] == original["result"]
        modified = client.post(f"{detail_path}/reviews", headers=headers(client), json={
            "expected_revision": 0, "decision": "modified_timing", "reason": "人工核对起止",
            "start_ms": 0, "fifth_stand_ms": 10000,
        })
        assert modified.status_code == 201, modified.text
        confirmed = client.get(detail_path).json()["human_confirmation"]
        assert confirmed["start_ms"] == 0 and confirmed["recorded_by"] == str(uid)

    # A real race: one row lock winner and one stale revision, never two revision-2 rows.
    with TestClient(app) as a, TestClient(app) as b:
        login(a)
        login(b)
        barrier = Barrier(2)

        def submit(client):
            barrier.wait(timeout=10)
            return client.post(f"{detail_path}/reviews", headers=headers(client), json={
                "expected_revision": 1, "decision": "needs_retake", "reason": "并发复核",
            })

        with ThreadPoolExecutor(max_workers=2) as pool:
            futures = [pool.submit(submit, client) for client in (a, b)]
            assert sorted(f.result(timeout=30).status_code for f in futures) == [201, 409]
    with TestClient(app) as client:
        login(client)
        detail = client.get(detail_path).json()
        assert detail["result"] == original["result"]
        assert len(detail["reviews"]) == 2
        assert detail["reviews"][0]["start_ms"] == 0
        assert detail["human_confirmation"] is None
        assert client.get(path).json()["total"] == 1
    with Session(engine) as db:
        db.add(SppbReview(measurement_id=uuid.UUID(original["id"]), revision_no=3,
                          decision="modified_timing", start_ms=0, fifth_stand_ms=None,
                          reason="数据库拒绝不完整修正", recorded_by=uid))
        with pytest.raises(IntegrityError):
            db.commit()


def test_populated_0023_upgrade_and_0024_evidence_rollback_guard():
    # Sibling DB lives inside the runner's disposable tmpfs server.
    with get_engine().connect() as connection:
        assert connection.scalar(text("select current_database()")) == "taiji_eng04"
    name = f"taiji_sppb_upgrade_{uuid.uuid4().hex[:10]}"
    original_url = make_url(os.environ["DATABASE_URL"])
    admin = create_engine(original_url, isolation_level="AUTOCOMMIT")
    with admin.connect() as connection:
        connection.exec_driver_sql(f'CREATE DATABASE "{name}"')
    admin.dispose()
    url = original_url.set(database=name)
    env = {**os.environ, "DATABASE_URL": url.render_as_string(hide_password=False)}

    def migrate(*args):
        return subprocess.run([sys.executable, "-m", "alembic", *args], env=env,
                               cwd=Path(__file__).resolve().parents[1], capture_output=True,
                               text=True, encoding="utf-8", errors="replace", check=False)

    before = migrate("upgrade", "0023_pose_v3_free_text_reasons")
    assert before.returncode == 0, before.stderr
    engine = create_engine(url)
    try:
        _, source_id, _, uid = seed(engine)
        with Session(engine) as db:
            original = db.get(PoseAnalysis, uuid.UUID(source_id)).result
        upgraded = migrate("upgrade", "head")
        assert upgraded.returncode == 0, upgraded.stderr
        checked = migrate("check")
        assert checked.returncode == 0, checked.stderr
        # Empty new tables are reversible without touching populated source evidence.
        empty_rollback = migrate("downgrade", "0023_pose_v3_free_text_reasons")
        assert empty_rollback.returncode == 0, empty_rollback.stderr
        assert migrate("upgrade", "head").returncode == 0
        with Session(engine) as db:
            assert db.get(PoseAnalysis, uuid.UUID(source_id)).result == original
        # Write through ORM to keep rollback coverage independent of HTTP/auth fixtures.
        with Session(engine) as db:
            row = SppbMeasurement(source_analysis_id=uuid.UUID(source_id), created_by=uid,
                                  algorithm_version="sppb-measure-v1",
                                  result=measure_sit_to_stand(PoseInput(**trajectory())))
            db.add(row)
            db.flush()
            db.add(SppbReview(measurement_id=row.id, revision_no=1, decision="modified_timing",
                              start_ms=0, fifth_stand_ms=10000,
                              reason="保留人工起止", recorded_by=uid))
            db.commit()
        refused = migrate("downgrade", "0023_pose_v3_free_text_reasons")
        assert refused.returncode != 0
        assert "SPPB measurement evidence exists; downgrade refused" in refused.stderr
        with engine.connect() as connection:
            assert connection.scalar(text("SELECT version_num FROM alembic_version")) == (
                "0024_sppb_measurements"
            )
            assert connection.scalar(text("SELECT count(*) FROM sppb_reviews")) == 1
            assert connection.scalar(text("SELECT count(*) FROM pose_analyses")) == 1
    finally:
        engine.dispose()
