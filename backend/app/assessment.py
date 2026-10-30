"""Append-only manual-total assessment operations; no scoring or clinical rules."""

import uuid
from datetime import timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Assessment, AssessmentRevision, ConsentRecord
from app.schemas import (
    AssessmentDetail,
    AssessmentRevisionView,
    AssessmentSummary,
    MeasurementWrite,
)

SYNTHETIC_PROTOCOL = "SYN-MANUAL-V1"


def latest_consent_granted(db: Session, participant_id: uuid.UUID) -> bool:
    latest = db.scalar(
        select(ConsentRecord.decision)
        .where(ConsentRecord.participant_id == participant_id)
        .order_by(ConsentRecord.recorded_at.desc(), ConsentRecord.id.desc())
        .limit(1)
    )
    return latest == "granted"


def revisions(db: Session, assessment_id: uuid.UUID) -> list[AssessmentRevision]:
    return db.scalars(
        select(AssessmentRevision)
        .where(AssessmentRevision.assessment_id == assessment_id)
        .order_by(AssessmentRevision.revision_no.desc())
    ).all()


def current_revision(db: Session, assessment_id: uuid.UUID) -> AssessmentRevision:
    row = db.scalar(
        select(AssessmentRevision)
        .where(AssessmentRevision.assessment_id == assessment_id)
        .order_by(AssessmentRevision.revision_no.desc())
        .limit(1)
    )
    if row is None:
        raise RuntimeError("assessment has no initial draft revision")
    return row


def initial_draft(assessment_id: uuid.UUID, actor_id: uuid.UUID) -> AssessmentRevision:
    return AssessmentRevision(
        assessment_id=assessment_id,
        revision_no=1,
        state="draft",
        metric_code="sppb_total",
        raw_value=None,
        unit="points",
        validity="unrecorded",
        missing_reason=None,
        performed_at=None,
        source="manual_staff_entry",
        change_reason=None,
        recorded_by=actor_id,
    )


def measurement_draft(
    assessment_id: uuid.UUID,
    revision_id: uuid.UUID,
    prior: AssessmentRevision,
    payload: MeasurementWrite,
    actor_id: uuid.UUID,
) -> AssessmentRevision:
    return AssessmentRevision(
        id=revision_id,
        assessment_id=assessment_id,
        revision_no=prior.revision_no + 1,
        state="draft",
        metric_code="sppb_total",
        raw_value=payload.raw_value,
        unit="points",
        validity=payload.validity,
        missing_reason=payload.missing_reason,
        performed_at=(
            payload.performed_at.astimezone(timezone.utc) if payload.performed_at else None
        ),
        source="manual_staff_entry",
        change_reason=payload.change_reason,
        recorded_by=actor_id,
    )


def confirmed_copy(
    assessment_id: uuid.UUID,
    revision_id: uuid.UUID,
    prior: AssessmentRevision,
    actor_id: uuid.UUID,
) -> AssessmentRevision:
    return AssessmentRevision(
        id=revision_id,
        assessment_id=assessment_id,
        revision_no=prior.revision_no + 1,
        state="confirmed",
        metric_code=prior.metric_code,
        raw_value=prior.raw_value,
        unit=prior.unit,
        validity=prior.validity,
        missing_reason=prior.missing_reason,
        performed_at=prior.performed_at,
        source=prior.source,
        change_reason=None,
        recorded_by=actor_id,
    )


def summary(assessment: Assessment, current: AssessmentRevision) -> AssessmentSummary:
    return AssessmentSummary(
        id=assessment.id,
        participant_id=assessment.participant_id,
        visit_kind=assessment.visit_kind,
        protocol_version=assessment.protocol_version,
        created_by=assessment.created_by,
        created_at=assessment.created_at,
        current=AssessmentRevisionView.model_validate(current),
    )


def detail(assessment: Assessment, history: list[AssessmentRevision]) -> AssessmentDetail:
    if not history:
        raise RuntimeError("assessment has no revision history")
    return AssessmentDetail(
        **summary(assessment, history[0]).model_dump(),
        history=[AssessmentRevisionView.model_validate(row) for row in history],
    )
