"""Synthetic seed recovery and environment gate."""

import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app import seed_demo
from app.db import Base
from app.models import (
    AuditEvent,
    DemoPatientBinding,
    LoginSession,
    Participant,
    ParticipantAssignment,
    Study,
    StudyAssignment,
    SyntheticStaffChange,
    User,
    utc_now,
)
from app.security import issue_session, password_hash


def test_seed_refuses_nonlocal_mode(monkeypatch) -> None:
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("ALLOW_SYNTHETIC_ONLY", "true")
    monkeypatch.setenv("DEMO_PASSWORD", "synthetic-password-123")
    with pytest.raises(RuntimeError, match="restricted to synthetic local mode"):
        seed_demo.main()


def test_explicit_demo_reset_revokes_sessions_and_audits(monkeypatch) -> None:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    monkeypatch.setattr(seed_demo, "get_engine", lambda: engine)
    monkeypatch.setenv("APP_ENV", "local")
    monkeypatch.setenv("ALLOW_SYNTHETIC_ONLY", "true")
    monkeypatch.setenv("DEMO_PASSWORD", "synthetic-password-old")
    seed_demo.main()

    with Session(engine) as db:
        user = db.scalar(select(User).where(User.email == "demo-clinician-a@example.org"))
        assert user is not None
        _, _, login_session = issue_session(db, user)
        session_id = login_session.id
        db.commit()

    monkeypatch.setenv("DEMO_PASSWORD", "synthetic-password-new")
    with pytest.raises(RuntimeError, match="RESET_DEMO_PASSWORD"):
        seed_demo.main()
    monkeypatch.setenv("RESET_DEMO_PASSWORD", "true")
    seed_demo.main()

    with Session(engine) as db:
        user = db.scalar(select(User).where(User.email == "demo-clinician-a@example.org"))
        assert user is not None
        assert password_hash.verify("synthetic-password-new", user.password_hash)
        old_session = db.get(LoginSession, session_id)
        assert old_session is not None and old_session.revoked_at is not None
        resets = db.scalars(
            select(AuditEvent).where(AuditEvent.action == "demo_password_reset")
        ).all()
        assert len(resets) == 4
        patient = db.scalar(select(User).where(User.email == "demo-patient@example.org"))
        assert patient is not None and patient.role == "patient"
        patient_id = patient.id
        binding = db.get(DemoPatientBinding, patient_id)
        assert binding is not None and binding.revoked_at is None
        binding.revoked_at = utc_now()
        db.commit()

    monkeypatch.delenv("RESET_DEMO_PASSWORD")
    seed_demo.main()
    with Session(engine) as db:
        binding = db.get(DemoPatientBinding, patient_id)
        assert binding is not None and binding.revoked_at is not None
    engine.dispose()


def test_seed_opt_in_admin_and_preserves_revoked_staff_scope(monkeypatch) -> None:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    monkeypatch.setattr(seed_demo, "get_engine", lambda: engine)
    monkeypatch.setenv("APP_ENV", "local")
    monkeypatch.setenv("ALLOW_SYNTHETIC_ONLY", "true")
    monkeypatch.setenv("DEMO_PASSWORD", "synthetic-password-123")
    monkeypatch.delenv("SEED_DEMO_ADMIN", raising=False)
    seed_demo.main()
    with Session(engine) as db:
        assert db.scalar(select(User).where(User.email == "demo-admin@example.org")) is None

    monkeypatch.setenv("SEED_DEMO_ADMIN", "true")
    seed_demo.main()
    with Session(engine) as db:
        admin = db.scalar(select(User).where(User.email == "demo-admin@example.org"))
        clinician = db.scalar(select(User).where(User.email == "demo-clinician-a@example.org"))
        study = db.scalar(select(Study).where(Study.code == "SYN-STUDY-A"))
        participant = db.scalar(select(Participant).where(Participant.study_code == "SYN-001"))
        assert admin is not None and clinician is not None
        assert study is not None and participant is not None
        db.delete(db.get(StudyAssignment, (clinician.id, study.id)))
        db.delete(db.get(ParticipantAssignment, (clinician.id, participant.id)))
        db.add_all(
            [
                SyntheticStaffChange(
                    target_user_id=clinician.id,
                    action="study_revoke",
                    scope_id=study.id,
                    actor_id=admin.id,
                ),
                SyntheticStaffChange(
                    target_user_id=clinician.id,
                    action="participant_revoke",
                    scope_id=participant.id,
                    actor_id=admin.id,
                ),
            ]
        )
        ids = clinician.id, study.id, participant.id
        db.commit()
    seed_demo.main()
    with Session(engine) as db:
        assert db.get(StudyAssignment, ids[:2]) is None
        assert db.get(ParticipantAssignment, (ids[0], ids[2])) is None
        assert db.scalar(select(User).where(User.email == "demo-admin@example.org")) is not None
    engine.dispose()
