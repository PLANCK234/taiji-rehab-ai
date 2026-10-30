"""Idempotent synthetic-only staff and coded-record seed for local demos."""

import os

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_engine
from app.models import (
    AuditEvent,
    LoginSession,
    Participant,
    ParticipantAssignment,
    Study,
    StudyAssignment,
    User,
    utc_now,
)
from app.security import password_hash


def main() -> None:
    if os.environ.get("APP_ENV") != "local" or os.environ.get("ALLOW_SYNTHETIC_ONLY") != "true":
        raise RuntimeError("demo seed is restricted to synthetic local mode")
    password = os.environ.get("DEMO_PASSWORD", "")
    reset_password = os.environ.get("RESET_DEMO_PASSWORD") == "true"
    if len(password) < 12:
        raise RuntimeError("set DEMO_PASSWORD to a local-only value of at least 12 characters")
    with Session(get_engine()) as db, db.begin():
        studies = {}
        for code in ("SYN-STUDY-A", "SYN-STUDY-B"):
            row = db.scalar(select(Study).where(Study.code == code))
            if row is None:
                row = Study(code=code)
                db.add(row)
                db.flush()
            studies[code] = row

        users = {}
        for email, role in (
            ("demo-clinician-a@example.org", "clinician"),
            ("demo-clinician-b@example.org", "clinician"),
            ("demo-analyst@example.org", "analyst"),
        ):
            row = db.scalar(select(User).where(User.email == email))
            if row is None:
                row = User(email=email, role=role, password_hash=password_hash.hash(password))
                db.add(row)
                db.flush()
            elif row.role != role:
                raise RuntimeError("existing demo account role mismatch")
            elif not password_hash.verify(password, row.password_hash):
                if not reset_password:
                    raise RuntimeError(
                        "existing demo account password differs; set RESET_DEMO_PASSWORD=true"
                    )
                row.password_hash = password_hash.hash(password)
                active_sessions = db.scalars(
                    select(LoginSession).where(
                        LoginSession.user_id == row.id,
                        LoginSession.revoked_at.is_(None),
                    )
                ).all()
                for login_session in active_sessions:
                    login_session.revoked_at = utc_now()
                db.add(
                    AuditEvent(
                        actor_id=None,
                        action="demo_password_reset",
                        resource_type="user",
                        resource_id=row.id,
                        outcome="allowed",
                    )
                )
            users[email] = row

        participants = {}
        for study_key, code in (
            ("SYN-STUDY-A", "SYN-001"),
            ("SYN-STUDY-B", "SYN-002"),
            ("SYN-STUDY-A", "SYN-003"),
        ):
            study = studies[study_key]
            row = db.scalar(
                select(Participant).where(
                    Participant.study_id == study.id, Participant.study_code == code
                )
            )
            if row is None:
                row = Participant(study_id=study.id, study_code=code)
                db.add(row)
                db.flush()
            participants[code] = row

        for email, study_key in (
            ("demo-clinician-a@example.org", "SYN-STUDY-A"),
            ("demo-clinician-b@example.org", "SYN-STUDY-B"),
            ("demo-analyst@example.org", "SYN-STUDY-A"),
        ):
            user, study = users[email], studies[study_key]
            if db.get(StudyAssignment, (user.id, study.id)) is None:
                db.add(StudyAssignment(user_id=user.id, study_id=study.id))

        for email, code in (
            ("demo-clinician-a@example.org", "SYN-001"),
            ("demo-clinician-b@example.org", "SYN-002"),
        ):
            user, participant = users[email], participants[code]
            if db.get(ParticipantAssignment, (user.id, participant.id)) is None:
                db.add(ParticipantAssignment(user_id=user.id, participant_id=participant.id))
    print("SYNTHETIC demo accounts and coded records are ready")


if __name__ == "__main__":
    main()
