"""Read-only, scoped synthetic research summaries."""

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api import AuthContext, audit, authorized_participant, current_auth
from app.db import get_db
from app.intake_api import READ_ROLES
from app.research_trends import assessment_trend, training_timeline
from app.schemas import AssessmentTrend
from app.training_schemas import TrainingTimeline

router = APIRouter(prefix="/api/v1")


@router.get("/participants/{participant_id}/assessment-trend", response_model=AssessmentTrend)
def get_assessment_trend(
    participant_id: uuid.UUID,
    auth: AuthContext = Depends(current_auth),
    db: Session = Depends(get_db),
) -> AssessmentTrend:
    authorized_participant(
        db, auth, participant_id, action="read", allowed_roles=READ_ROLES, audit_success=False
    )
    result = assessment_trend(db, participant_id)
    audit(db, "read", "assessment_trend", "allowed", auth.user.id, participant_id)
    db.commit()
    return result


@router.get("/participants/{participant_id}/training-timeline", response_model=TrainingTimeline)
def get_training_timeline(
    participant_id: uuid.UUID,
    auth: AuthContext = Depends(current_auth),
    db: Session = Depends(get_db),
) -> TrainingTimeline:
    authorized_participant(
        db, auth, participant_id, action="read", allowed_roles=READ_ROLES, audit_success=False
    )
    result = training_timeline(db, participant_id)
    audit(db, "read", "training_timeline", "allowed", auth.user.id, participant_id)
    db.commit()
    return result
