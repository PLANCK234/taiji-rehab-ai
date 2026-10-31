"""Descriptive manual-total history for an authorized coded participant."""

import uuid
from collections import defaultdict

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Assessment, AssessmentRevision
from app.schemas import AssessmentRevisionView, AssessmentTrend, AssessmentTrendEntry


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
