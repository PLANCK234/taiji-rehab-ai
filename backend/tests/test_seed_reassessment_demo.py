"""Repeatable synthetic reassessment fixture and its visible API states."""

import os

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select, text
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app import seed_demo, seed_reassessment_demo
from app.db import Base, get_db, get_engine
from app.main import app
from app.models import Assessment, AssessmentRevision, Participant, ScreeningRecord, Study

PASSWORD = "synthetic-eng01a-password"


def _assert_api(client: TestClient) -> None:
    login = client.post(
        "/api/v1/auth/login",
        json={"email": "demo-clinician-a@example.org", "password": PASSWORD},
        headers={"Origin": "http://localhost:3000"},
    )
    assert login.status_code == 200, login.text
    listed = client.get("/api/v1/participants")
    assert listed.status_code == 200
    fixture = {
        row["study_code"]: row["id"]
        for row in listed.json()
        if row["study_code"] in seed_reassessment_demo.COHORT_CODES
    }
    assert set(fixture) == set(seed_reassessment_demo.COHORT_CODES)
    first, second = (fixture[code] for code in seed_reassessment_demo.COHORT_CODES)
    assert client.get(f"/api/v1/participants/{first}/consents").json()["state"] == "granted"
    assert client.get(f"/api/v1/participants/{first}/screenings").json()["review_state"] == (
        "needs_review"
    )
    assert client.get(f"/api/v1/participants/{second}/screenings").json()["review_state"] == (
        "not_assessed"
    )
    for participant_id, baseline, revisit in ((first, 5, None), (second, None, 8)):
        response = client.get(f"/api/v1/participants/{participant_id}/assessments")
        assert response.status_code == 200
        assessments = {row["visit_kind"]: row for row in response.json()}
        assert set(assessments) == {"baseline", "revisit"}
        assert assessments["baseline"]["current"]["raw_value"] == baseline
        assert assessments["revisit"]["current"]["raw_value"] == revisit
        assert all(row["current"]["state"] == "confirmed" for row in assessments.values())
        assert all("grade" not in row for row in assessments.values())
        trend = client.get(f"/api/v1/participants/{participant_id}/assessment-trend")
        assert trend.status_code == 200, trend.text
        by_kind = {row["visit_kind"]: row for row in trend.json()["entries"]}
        assert set(by_kind) == {"baseline", "revisit"}
        assert by_kind["baseline"]["latest_confirmed"]["raw_value"] == baseline
        assert by_kind["revisit"]["latest_confirmed"]["raw_value"] == revisit
        assert all(row["current"]["state"] == "confirmed" for row in by_kind.values())
    first_baseline_id = next(
        row["id"]
        for row in client.get(f"/api/v1/participants/{first}/assessments").json()
        if row["visit_kind"] == "baseline"
    )
    history = client.get(f"/api/v1/assessments/{first_baseline_id}").json()["history"]
    assert [row["raw_value"] for row in history] == [5, 5, 0, 0, None]
    assert history[1]["change_reason"] == "SYN-CORRECTION"
    assert next(
        row for row in client.get(f"/api/v1/participants/{first}/assessments").json()
        if row["visit_kind"] == "revisit"
    )["current"]["validity"] == "missing"


def test_seed_is_repeatable_and_refuses_to_overwrite(monkeypatch: pytest.MonkeyPatch) -> None:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    monkeypatch.setenv("APP_ENV", "local")
    monkeypatch.setenv("ALLOW_SYNTHETIC_ONLY", "true")
    monkeypatch.setenv("DEMO_PASSWORD", PASSWORD)
    monkeypatch.setenv("APP_PUBLIC_URL", "http://localhost:3000")
    monkeypatch.setenv("SESSION_SECRET", "synthetic-eng01a-local-secret-32-characters")
    monkeypatch.setattr(seed_demo, "get_engine", lambda: engine)
    monkeypatch.setattr(seed_reassessment_demo, "get_engine", lambda: engine)
    seed_reassessment_demo.main()
    seed_reassessment_demo.main()
    with Session(engine) as db:
        study = db.scalar(select(Study).where(Study.code == "SYN-STUDY-A"))
        fixture = db.scalars(
            select(Participant).where(
                Participant.study_id == study.id,
                Participant.study_code.in_(seed_reassessment_demo.COHORT_CODES),
            )
        ).all()
        assert len(fixture) == 2
        ids = [row.id for row in fixture]
        assessments = db.scalars(select(Assessment).where(Assessment.participant_id.in_(ids))).all()
        assert len(assessments) == 4
        assert len(db.scalars(
            select(AssessmentRevision).where(
                AssessmentRevision.assessment_id.in_([row.id for row in assessments])
            )
        ).all()) == 14

    def override_db():
        with Session(engine) as db:
            yield db

    app.dependency_overrides[get_db] = override_db
    try:
        with TestClient(app) as client:
            _assert_api(client)
    finally:
        app.dependency_overrides.clear()

    with Session(engine) as db:
        participant = db.scalar(
            select(Participant).where(Participant.study_code == "SYN-ENG01A-001")
        )
        screen = db.scalar(
            select(ScreeningRecord).where(ScreeningRecord.participant_id == participant.id)
        )
        screen.answer = "yes"
        db.commit()
    with pytest.raises(RuntimeError, match="fixture changed"):
        seed_reassessment_demo.main()
    engine.dispose()


@pytest.mark.skipif(
    os.environ.get("ENG04_INTEGRATION") != "1",
    reason="requires isolated taiji_eng04 PostgreSQL database",
)
def test_seed_on_migrated_postgres(monkeypatch: pytest.MonkeyPatch) -> None:
    assert os.environ.get("ALLOW_SYNTHETIC_ONLY") == "true"
    get_engine.cache_clear()
    engine = get_engine()
    assert engine.dialect.name == "postgresql"
    with engine.connect() as connection:
        assert connection.scalar(text("select current_database()")) == "taiji_eng04"
        assert connection.scalar(text("select version_num from alembic_version")) == (
            "0004_manual_assessments"
        )
    monkeypatch.setenv("APP_ENV", "local")
    monkeypatch.setenv("DEMO_PASSWORD", PASSWORD)
    seed_reassessment_demo.main()
    seed_reassessment_demo.main()
    with TestClient(app) as client:
        _assert_api(client)
    engine.dispose()
    get_engine.cache_clear()
