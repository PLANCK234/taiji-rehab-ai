"""Synthetic seed recovery and environment gate."""

import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app import seed_demo
from app.db import Base
from app.models import AuditEvent, LoginSession, User
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
        assert len(resets) == 3
    engine.dispose()
