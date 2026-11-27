"""A populated v1 snapshot survives upgrade; v2 evidence prevents unsafe rollback."""

import os
import subprocess
import sys
import uuid
from pathlib import Path

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session

from app.db import get_engine
from app.models import Participant, PoseAnalysis, PoseReview, Study, User
from app.pose_analysis import analyze_pose, analyze_pose_v1
from app.pose_schemas import PoseInput
from tests.test_pose_analysis import input_payload

pytestmark = pytest.mark.skipif(
    os.environ.get("ENG04_INTEGRATION") != "1", reason="disposable PostgreSQL only",
)


def test_populated_v1_upgrade_and_v2_rollback_refusal():
    # The parent runner owns a tmpfs server. Only create a sibling fixture DB
    # after checking its exact test name; its lifecycle ends with that container.
    with get_engine().connect() as connection:
        assert connection.scalar(text("select current_database()")) == "taiji_eng04"
    name = f"taiji_pose_upgrade_{uuid.uuid4().hex[:10]}"
    original_url = make_url(os.environ["DATABASE_URL"])
    admin = create_engine(original_url, isolation_level="AUTOCOMMIT")
    with admin.connect() as connection:
        connection.exec_driver_sql(f'CREATE DATABASE "{name}"')
    admin.dispose()
    url = original_url.set(database=name)
    env = {**os.environ, "DATABASE_URL": url.render_as_string(hide_password=False)}
    backend = Path(__file__).resolve().parents[1]

    def migrate(*args):
        return subprocess.run(
            [sys.executable, "-m", "alembic", *args], cwd=backend, env=env,
            capture_output=True, text=True, encoding="utf-8", errors="replace", check=False,
        )

    first = migrate("upgrade", "0020_pose_analyses")
    assert first.returncode == 0, first.stderr
    engine = create_engine(url)
    payload = PoseInput(**input_payload())
    old_result = analyze_pose_v1(payload)
    try:
        with Session(engine) as db:
            user = User(
                email=f"{name}@example.org", password_hash="synthetic-unused", role="clinician",
            )
            study = Study(code=f"SYN-{name}")
            db.add_all([user, study])
            db.flush()
            participant = Participant(study_id=study.id, study_code="SYN-POSE-UPGRADE")
            db.add(participant)
            db.flush()
            row = PoseAnalysis(
                participant_id=participant.id, input_data=payload.model_dump(mode="json"),
                input_sha256="c" * 64, result=old_result, algorithm_version="pose-geometry-v1",
                created_by=user.id,
            )
            db.add(row)
            db.flush()
            record_id, participant_id, user_id = row.id, participant.id, user.id
            legacy_review_id = uuid.uuid4()
            db.execute(text(
                "INSERT INTO pose_reviews "
                "(id, analysis_id, revision_no, decision, reason, recorded_by, recorded_at) "
                "VALUES (:id, :analysis_id, 1, 'accepted_observations', "
                "'原始合成复核', :user_id, CURRENT_TIMESTAMP)"
            ), {"id": legacy_review_id, "analysis_id": record_id, "user_id": user_id})
            db.commit()
        upgraded = migrate("upgrade", "head")
        assert upgraded.returncode == 0, upgraded.stderr
        with Session(engine) as db:
            row = db.get(PoseAnalysis, record_id)
            assert row.result == old_result and row.input_sha256 == "c" * 64
            assert row.algorithm_version == "pose-geometry-v1"
            old_review = db.get(PoseReview, legacy_review_id)
            assert old_review.reason == "原始合成复核" and old_review.corrections == []
            db.add(PoseAnalysis(
                participant_id=participant_id, input_data=payload.model_dump(mode="json"),
                input_sha256="d" * 64, result=analyze_pose(payload),
                algorithm_version="pose-geometry-v2", created_by=user_id,
            ))
            db.commit()
        rollback = migrate("downgrade", "0020_pose_analyses")
        assert rollback.returncode != 0
        assert "v2 evidence exists" in rollback.stderr
        with engine.connect() as connection:
            assert connection.scalar(text("SELECT version_num FROM alembic_version")) == (
                "0023_pose_v3_free_text_reasons"
            )
            assert connection.scalar(text("SELECT count(*) FROM pose_analyses")) == 2
        with Session(engine) as db:
            db.add(PoseReview(
                analysis_id=record_id, revision_no=2, decision="modified_observations",
                reason="合成逐项复核", recorded_by=user_id, corrections=[{
                    "joint": "left_elbow", "metric": "median_deg", "validity": "valid",
                    "value": 0, "reason": "保留人工观察零值",
                }],
            ))
            db.commit()
        structured_rollback = migrate("downgrade", "0021_pose_geometry_v2")
        assert structured_rollback.returncode != 0
        assert "structured review evidence exists" in structured_rollback.stderr
        with engine.connect() as connection:
            assert connection.scalar(text("SELECT version_num FROM alembic_version")) == (
                "0023_pose_v3_free_text_reasons"
            )
            assert connection.scalar(text("SELECT count(*) FROM pose_reviews")) == 2
    finally:
        engine.dispose()
