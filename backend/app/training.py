"""Queries and consent checks for manual training observations."""

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import ConsentRecord, TrainingFeedbackRevision


def has_current_synthetic_consent(db: Session, participant_id: uuid.UUID) -> bool:
    latest = db.scalar(
        select(ConsentRecord)
        .where(ConsentRecord.participant_id == participant_id)
        .order_by(ConsentRecord.recorded_at.desc(), ConsentRecord.id.desc())
        .limit(1)
    )
    return latest is not None and latest.decision == "granted"


def feedback_history(db: Session, session_id: uuid.UUID) -> list[TrainingFeedbackRevision]:
    return list(
        db.scalars(
            select(TrainingFeedbackRevision)
            .where(TrainingFeedbackRevision.session_id == session_id)
            .order_by(TrainingFeedbackRevision.revision_no)
        ).all()
    )
