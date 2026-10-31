"""Opt-in, synthetic-only cohort for the existing manual assessment workflow."""

import os
import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app import seed_demo
from app.assessment import SYNTHETIC_PROTOCOL, confirmed_copy, initial_draft, measurement_draft
from app.db import get_engine
from app.models import (
    Assessment,
    AssessmentRevision,
    AuditEvent,
    ConsentRecord,
    Participant,
    ParticipantAssignment,
    ScreeningRecord,
    Study,
    User,
)
from app.runtime import demo_enabled
from app.schemas import MeasurementWrite

COHORT_CODES = ("SYN-ENG01A-001", "SYN-ENG01A-002")
ACTOR_EMAIL = "demo-clinician-a@example.org"


def _valid(revision: int, value: int, when: str, reason: str | None = None) -> MeasurementWrite:
    return MeasurementWrite(
        expected_revision=revision,
        validity="valid",
        raw_value=value,
        performed_at=datetime.fromisoformat(when),
        change_reason=reason,
    )


def _missing(revision: int, reason: str) -> MeasurementWrite:
    return MeasurementWrite(
        expected_revision=revision,
        validity="missing",
        missing_reason=reason,
    )


# Synthetic raw entries are examples, not clinical outcomes or treatment effects.
COHORT = {
    "SYN-ENG01A-001": {
        "screening": "unknown",
        "baseline": [
            _valid(1, 0, "2026-10-01T09:30:00+08:00"),
            _valid(3, 5, "2026-10-01T09:30:00+08:00", "SYN-CORRECTION"),
        ],
        "revisit": [_missing(1, "declined")],
    },
    "SYN-ENG01A-002": {
        "screening": None,
        "baseline": [_missing(1, "not_attempted")],
        "revisit": [_valid(1, 8, "2026-10-29T09:30:00+08:00")],
    },
}


def _history(db: Session, assessment_id: uuid.UUID) -> list[AssessmentRevision]:
    return db.scalars(
        select(AssessmentRevision)
        .where(AssessmentRevision.assessment_id == assessment_id)
        .order_by(AssessmentRevision.revision_no)
    ).all()


def _expected(writes: list[MeasurementWrite]) -> list[tuple]:
    expected = [(1, "draft", "unrecorded", None, None, None, None)]
    for payload in writes:
        performed_at = (
            payload.performed_at.astimezone(timezone.utc) if payload.performed_at else None
        )
        expected.extend(
            [
                (
                    payload.expected_revision + 1,
                    "draft", payload.validity, payload.raw_value,
                    payload.missing_reason, payload.change_reason, performed_at,
                ),
                (
                    payload.expected_revision + 2,
                    "confirmed", payload.validity, payload.raw_value,
                    payload.missing_reason, None, performed_at,
                ),
            ]
        )
    return expected


def _validate_existing(db: Session, study_id: uuid.UUID, actor_id: uuid.UUID) -> bool:
    participants = {
        row.study_code: row
        for row in db.scalars(
            select(Participant).where(
                Participant.study_id == study_id, Participant.study_code.in_(COHORT_CODES)
            )
        )
    }
    if not participants:
        return False
    if set(participants) != set(COHORT_CODES):
        raise RuntimeError("partial ENG-01A fixture exists; no records were changed")
    for code, spec in COHORT.items():
        participant = participants[code]
        if db.get(ParticipantAssignment, (actor_id, participant.id)) is None:
            raise RuntimeError("ENG-01A fixture assignment changed; no records were changed")
        consents = db.scalars(
            select(ConsentRecord).where(ConsentRecord.participant_id == participant.id)
        ).all()
        screens = db.scalars(
            select(ScreeningRecord).where(ScreeningRecord.participant_id == participant.id)
        ).all()
        assessments = db.scalars(
            select(Assessment).where(Assessment.participant_id == participant.id)
        ).all()
        if (
            len(consents) != 1
            or consents[0].decision != "granted"
            or consents[0].photo_scope
            or consents[0].document_version != "SYN-FORM-V1"
            or consents[0].purpose_code != "SYN-DEMO-USE"
            or consents[0].recorded_by != actor_id
            or len(screens) != (1 if spec["screening"] else 0)
            or (
                screens and (
                    screens[0].answer != spec["screening"]
                    or screens[0].item_code != "SYN-SCREEN-01"
                    or screens[0].recorded_by != actor_id
                )
            )
            or len(assessments) != 2
            or {row.visit_kind for row in assessments} != {"baseline", "revisit"}
        ):
            raise RuntimeError("ENG-01A fixture changed; no records were changed")
        for assessment in assessments:
            if (
                assessment.visit_kind not in {"baseline", "revisit"}
                or assessment.protocol_version != SYNTHETIC_PROTOCOL
                or assessment.created_by != actor_id
            ):
                raise RuntimeError("ENG-01A assessment changed; no records were changed")
            rows = _history(db, assessment.id)
            actual = [
                (
                    row.revision_no, row.state, row.validity, row.raw_value,
                    row.missing_reason, row.change_reason,
                    (
                        row.performed_at.replace(tzinfo=timezone.utc)
                        if row.performed_at and row.performed_at.tzinfo is None
                        else row.performed_at.astimezone(timezone.utc)
                        if row.performed_at
                        else None
                    ),
                )
                for row in rows
            ]
            if actual != _expected(spec[assessment.visit_kind]) or any(
                row.recorded_by != actor_id for row in rows
            ):
                raise RuntimeError("ENG-01A history changed; no records were changed")
    return True


def _add_assessment(
    db: Session,
    participant_id: uuid.UUID,
    actor_id: uuid.UUID,
    kind: str,
    writes: list[MeasurementWrite],
) -> None:
    assessment_id = uuid.uuid4()
    db.add(
        Assessment(
            id=assessment_id,
            participant_id=participant_id,
            visit_kind=kind,
            protocol_version=SYNTHETIC_PROTOCOL,
            created_by=actor_id,
        )
    )
    prior = initial_draft(assessment_id, actor_id)
    db.add(prior)
    for payload in writes:
        if payload.expected_revision != prior.revision_no:
            raise RuntimeError("fixture revision sequence is invalid")
        draft = measurement_draft(assessment_id, uuid.uuid4(), prior, payload, actor_id)
        confirmed = confirmed_copy(assessment_id, uuid.uuid4(), draft, actor_id)
        db.add_all([draft, confirmed])
        prior = confirmed
    db.add(
        AuditEvent(
            actor_id=actor_id,
            action="demo_seed",
            resource_type="assessment",
            resource_id=assessment_id,
            outcome="allowed",
        )
    )


def main() -> None:
    if os.environ.get("APP_ENV") != "local" or not demo_enabled():
        raise RuntimeError("reassessment demo seed is restricted to synthetic local mode")
    if os.environ.get("RESET_DEMO_PASSWORD") == "true":
        raise RuntimeError("run the base demo password reset separately before this seed")
    seed_demo.main()
    with Session(get_engine()) as db, db.begin():
        study = db.scalar(select(Study).where(Study.code == "SYN-STUDY-A"))
        actor = db.scalar(select(User).where(User.email == ACTOR_EMAIL))
        if study is None or actor is None or actor.role != "clinician":
            raise RuntimeError("base synthetic demo seed is incomplete")
        if _validate_existing(db, study.id, actor.id):
            print("SYNTHETIC reassessment demo records are already ready")
            return
        for code, spec in COHORT.items():
            participant = Participant(study_id=study.id, study_code=code)
            db.add(participant)
            db.flush()
            db.add(ParticipantAssignment(user_id=actor.id, participant_id=participant.id))
            db.add(
                ConsentRecord(
                    participant_id=participant.id,
                    document_version="SYN-FORM-V1",
                    purpose_code="SYN-DEMO-USE",
                    decision="granted",
                    photo_scope=False,
                    recorded_by=actor.id,
                )
            )
            if spec["screening"]:
                db.add(
                    ScreeningRecord(
                        participant_id=participant.id,
                        item_code="SYN-SCREEN-01",
                        answer=spec["screening"],
                        recorded_by=actor.id,
                    )
                )
            for kind in ("baseline", "revisit"):
                _add_assessment(db, participant.id, actor.id, kind, spec[kind])
            db.add(
                AuditEvent(
                    actor_id=actor.id,
                    action="demo_seed",
                    resource_type="participant",
                    resource_id=participant.id,
                    outcome="allowed",
                )
            )
    print("SYNTHETIC reassessment demo records are ready")


if __name__ == "__main__":
    main()
