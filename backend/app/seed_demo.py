"""Idempotent synthetic-only accounts and coded-record seed for local demos."""

import os

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_engine
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
from app.runtime import demo_enabled
from app.security import password_hash


def revoked(db: Session, user_id, scope_id, scope: str) -> bool:
    latest = db.scalar(
        select(SyntheticStaffChange)
        .where(
            SyntheticStaffChange.target_user_id == user_id,
            SyntheticStaffChange.scope_id == scope_id,
            SyntheticStaffChange.action.in_((f"{scope}_grant", f"{scope}_revoke")),
        )
        .order_by(SyntheticStaffChange.recorded_at.desc(), SyntheticStaffChange.id.desc())
    )
    return latest is not None and latest.action == f"{scope}_revoke"


def main() -> None:
    if os.environ.get("APP_ENV") != "local" or not demo_enabled():
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
        seed_users = [
            ("demo-clinician-a@example.org", "clinician"),
            ("demo-clinician-b@example.org", "clinician"),
            ("demo-analyst@example.org", "analyst"),
            ("demo-patient@example.org", "patient"),
        ]
        if os.environ.get("SEED_DEMO_ADMIN") == "true":
            seed_users.append(("demo-admin@example.org", "admin"))
        for email, role in seed_users:
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
            if db.get(StudyAssignment, (user.id, study.id)) is None and not revoked(
                db, user.id, study.id, "study"
            ):
                db.add(StudyAssignment(user_id=user.id, study_id=study.id))

        for email, code in (
            ("demo-clinician-a@example.org", "SYN-001"),
            ("demo-clinician-b@example.org", "SYN-002"),
        ):
            user, participant = users[email], participants[code]
            if (
                db.get(ParticipantAssignment, (user.id, participant.id)) is None
                and not revoked(db, user.id, participant.id, "participant")
                and db.get(StudyAssignment, (user.id, participant.study_id)) is not None
            ):
                db.add(ParticipantAssignment(user_id=user.id, participant_id=participant.id))
        patient, participant = users["demo-patient@example.org"], participants["SYN-001"]
        binding = db.get(DemoPatientBinding, patient.id)
        if binding is None:
            existing = db.scalar(
                select(DemoPatientBinding).where(
                    DemoPatientBinding.participant_id == participant.id
                )
            )
            if existing is not None:
                raise RuntimeError("synthetic participant already bound to another patient account")
            db.add(DemoPatientBinding(user_id=patient.id, participant_id=participant.id))
        elif binding.participant_id != participant.id:
            raise RuntimeError("existing demo patient binding differs; refusing to overwrite")
    print("SYNTHETIC demo accounts and coded records are ready")


if __name__ == "__main__":
    main()
