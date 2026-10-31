"""Authorized descriptive trend keeps confirmed data separate from drafts."""

import uuid
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.db import Base, get_db
from app.main import app
from app.models import (
    Assessment,
    AssessmentRevision,
    AuditEvent,
    Participant,
    ParticipantAssignment,
    Study,
    StudyAssignment,
    User,
)
from app.security import password_hash

PASSWORD = "synthetic-trend-password"


def _add_assessment(
    db: Session,
    participant_id: uuid.UUID,
    actor_id: uuid.UUID,
    kind: str,
    day: int,
    revisions: list[tuple[str, str, int | None, str | None]],
) -> uuid.UUID:
    assessment_id = uuid.uuid4()
    db.add(
        Assessment(
            id=assessment_id,
            participant_id=participant_id,
            visit_kind=kind,
            protocol_version="SYN-MANUAL-V1",
            created_by=actor_id,
            created_at=datetime(2026, 10, day, tzinfo=timezone.utc),
        )
    )
    for number, (state, validity, value, reason) in enumerate(revisions, 1):
        db.add(
            AssessmentRevision(
                assessment_id=assessment_id,
                revision_no=number,
                state=state,
                metric_code="sppb_total",
                raw_value=value,
                unit="points",
                validity=validity,
                missing_reason=reason,
                performed_at=(
                    datetime(2026, 10, day, 9, tzinfo=timezone.utc)
                    if validity == "valid" else None
                ),
                source="manual_staff_entry",
                change_reason="SYN-CORRECTION" if number == 4 else None,
                recorded_by=actor_id,
            )
        )
    return assessment_id


@pytest.fixture
def trend_api(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("APP_ENV", "test")
    monkeypatch.setenv("ALLOW_SYNTHETIC_ONLY", "true")
    monkeypatch.setenv("SESSION_SECRET", "synthetic-research-trend-secret-32-characters")
    monkeypatch.setenv("APP_PUBLIC_URL", "http://localhost:3000")
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        study, other_study = Study(code="SYN-TREND-A"), Study(code="SYN-TREND-B")
        users = {
            name: User(
                email=f"trend-{name}@example.org",
                password_hash=password_hash.hash(PASSWORD),
                role="analyst" if name == "analyst" else "clinician",
            )
            for name in ("clinician", "peer", "outsider", "analyst")
        }
        db.add_all([study, other_study, *users.values()])
        db.flush()
        assigned = Participant(study_id=study.id, study_code="SYN-TREND-001")
        hidden = Participant(study_id=study.id, study_code="SYN-TREND-HIDDEN")
        cross = Participant(study_id=other_study.id, study_code="SYN-TREND-CROSS")
        db.add_all([assigned, hidden, cross])
        db.flush()
        db.add_all(
            [
                StudyAssignment(user_id=users["clinician"].id, study_id=study.id),
                StudyAssignment(user_id=users["peer"].id, study_id=study.id),
                StudyAssignment(user_id=users["analyst"].id, study_id=study.id),
                StudyAssignment(user_id=users["outsider"].id, study_id=other_study.id),
                ParticipantAssignment(user_id=users["clinician"].id, participant_id=assigned.id),
                ParticipantAssignment(user_id=users["analyst"].id, participant_id=assigned.id),
            ]
        )
        baseline = _add_assessment(
            db, assigned.id, users["clinician"].id, "baseline", 1,
            [
                ("draft", "unrecorded", None, None),
                ("draft", "valid", 0, None),
                ("confirmed", "valid", 0, None),
                ("draft", "valid", 5, None),
            ],
        )
        _add_assessment(
            db, assigned.id, users["clinician"].id, "revisit", 8,
            [
                ("draft", "unrecorded", None, None),
                ("draft", "missing", None, "declined"),
                ("confirmed", "missing", None, "declined"),
            ],
        )
        _add_assessment(
            db, assigned.id, users["clinician"].id, "revisit", 15,
            [
                ("draft", "unrecorded", None, None),
                ("draft", "invalid", 13, "technical_failure"),
                ("confirmed", "invalid", 13, "technical_failure"),
            ],
        )
        _add_assessment(
            db, assigned.id, users["clinician"].id, "revisit", 22,
            [("draft", "unrecorded", None, None)],
        )
        ids = {"assigned": assigned.id, "hidden": hidden.id, "cross": cross.id,
               "baseline": baseline, "actor": users["clinician"].id}
        db.commit()

    def override_db():
        with Session(engine) as db:
            yield db

    app.dependency_overrides[get_db] = override_db
    try:
        with TestClient(app) as client:
            yield client, engine, ids
    finally:
        app.dependency_overrides.clear()
        engine.dispose()


def _login(client: TestClient, name: str) -> None:
    response = client.post(
        "/api/v1/auth/login",
        json={"email": f"trend-{name}@example.org", "password": PASSWORD},
        headers={"Origin": "http://localhost:3000"},
    )
    assert response.status_code == 200


def test_trend_uses_last_confirmed_and_preserves_missing_and_drafts(trend_api) -> None:
    client, engine, ids = trend_api
    path = f"/api/v1/participants/{ids['assigned']}/assessment-trend"
    assert client.get(path).status_code == 401
    _login(client, "clinician")
    response = client.get(path)
    assert response.status_code == 200, response.text
    assert response.headers["Cache-Control"] == "no-store"
    entries = response.json()["entries"]
    assert len(entries) == 4
    assert [row["visit_kind"] for row in entries] == ["baseline", "revisit", "revisit", "revisit"]
    assert entries[0]["assessment_id"] == str(ids["baseline"])
    assert entries[0]["current"]["state"] == "draft"
    assert entries[0]["current"]["raw_value"] == 5
    assert entries[0]["latest_confirmed"]["raw_value"] == 0
    assert entries[0]["latest_confirmed"]["revision_no"] == 3
    assert entries[1]["latest_confirmed"]["validity"] == "missing"
    assert entries[1]["latest_confirmed"]["raw_value"] is None
    assert entries[2]["latest_confirmed"]["validity"] == "invalid"
    assert entries[2]["latest_confirmed"]["raw_value"] == 13
    assert entries[3]["latest_confirmed"] is None
    assert entries[3]["current"]["validity"] == "unrecorded"
    assert all("grade" not in row for row in entries)
    with Session(engine) as db:
        assert db.scalar(
            select(AuditEvent).where(
                AuditEvent.action == "read",
                AuditEvent.resource_type == "assessment_trend",
                AuditEvent.actor_id == ids["actor"],
                AuditEvent.outcome == "allowed",
            )
        )


def test_trend_enforces_study_participant_and_role_scope(trend_api) -> None:
    client, engine, ids = trend_api
    path = f"/api/v1/participants/{ids['assigned']}/assessment-trend"
    _login(client, "clinician")
    assert client.get(f"/api/v1/participants/{ids['hidden']}/assessment-trend").status_code == 403
    assert client.get(f"/api/v1/participants/{ids['cross']}/assessment-trend").status_code == 403
    _login(client, "peer")
    assert client.get(path).status_code == 403
    _login(client, "outsider")
    assert client.get(path).status_code == 403
    _login(client, "analyst")
    assert client.get(path).status_code == 403
    with Session(engine) as db:
        denied = db.scalars(
            select(AuditEvent).where(AuditEvent.action == "read", AuditEvent.outcome == "denied")
        ).all()
        assert len(denied) >= 5
