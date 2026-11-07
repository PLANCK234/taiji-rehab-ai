"""Descriptive manual-total history for an authorized coded participant."""

import uuid
from collections import defaultdict

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Assessment, AssessmentRevision, TrainingFeedbackRevision, TrainingSession
from app.schemas import AssessmentRevisionView, AssessmentTrend, AssessmentTrendEntry
from app.training_schemas import TrainingTimeline, TrainingTimelineEntry


def assessment_trend(db: Session, participant_id: uuid.UUID) -> AssessmentTrend:
    assessments = db.scalars(
        select(Assessment)
        .where(Assessment.participant_id == participant_id)
        .order_by(Assessment.created_at, Assessment.id)
    ).all()
    if not assessments:
        return AssessmentTrend(participant_id=participant_id, entries=[])

    revisions: dict[uuid.UUID, list[AssessmentRevision]] = defaultdict(list)
    for row in db.scalars(
        select(AssessmentRevision)
        .where(AssessmentRevision.assessment_id.in_([row.id for row in assessments]))
        .order_by(AssessmentRevision.assessment_id, AssessmentRevision.revision_no)
    ):
        revisions[row.assessment_id].append(row)

    entries = []
    for assessment in assessments:
        history = revisions[assessment.id]
        if not history:
            raise RuntimeError("assessment has no initial draft revision")
        latest_confirmed = next(
            (row for row in reversed(history) if row.state == "confirmed"), None
        )
        entries.append(
            AssessmentTrendEntry(
                assessment_id=assessment.id,
                visit_kind=assessment.visit_kind,
                created_at=assessment.created_at,
                current=AssessmentRevisionView.model_validate(history[-1]),
                latest_confirmed=(
                    AssessmentRevisionView.model_validate(latest_confirmed)
                    if latest_confirmed else None
                ),
            )
        )
    return AssessmentTrend(participant_id=participant_id, entries=entries)


def training_timeline(db: Session, participant_id: uuid.UUID) -> TrainingTimeline:
    """Observed sessions with the latest feedback state; no planned denominator or advice."""
    sessions = db.scalars(
        select(TrainingSession)
        .where(TrainingSession.participant_id == participant_id)
        .order_by(TrainingSession.session_at, TrainingSession.id)
    ).all()
    if not sessions:
        return TrainingTimeline(participant_id=participant_id, entries=[])

    latest_feedback: dict[uuid.UUID, TrainingFeedbackRevision] = {}
    for feedback in db.scalars(
        select(TrainingFeedbackRevision)
        .where(TrainingFeedbackRevision.session_id.in_([row.id for row in sessions]))
        .order_by(TrainingFeedbackRevision.session_id, TrainingFeedbackRevision.revision_no)
    ):
        latest_feedback[feedback.session_id] = feedback

    return TrainingTimeline(
        participant_id=participant_id,
        entries=[
            TrainingTimelineEntry(
                session_id=row.id,
                session_at=row.session_at,
                completion_status=row.completion_status,
                actual_minutes=row.actual_minutes,
                feedback_state=(
                    latest_feedback[row.id].state if row.id in latest_feedback else None
                ),
                rpe=(latest_feedback[row.id].rpe if row.id in latest_feedback else None),
            )
            for row in sessions
        ],
    )
