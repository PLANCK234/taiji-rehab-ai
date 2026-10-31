"""Scoped manual activity feedback and unclassified event reporting."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api import AuthContext, audit, authorized_participant, current_auth, require_csrf
from app.db import get_db
from app.intake import reserve_write
from app.intake_api import READ_ROLES, WRITE_ROLES, idempotency_header
from app.models import SafetyEvent, TrainingFeedbackRevision, TrainingSession
from app.training import feedback_history, has_current_synthetic_consent
from app.training_schemas import (
    SafetyEventCreate,
    SafetyEventView,
    TrainingFeedbackView,
    TrainingFeedbackWrite,
    TrainingSessionCreate,
    TrainingSessionView,
)

router = APIRouter(prefix="/api/v1")


def scoped_session(
    db: Session, auth: AuthContext, session_id: uuid.UUID, *, action: str, write: bool = False
) -> TrainingSession:
    row = db.get(TrainingSession, session_id)
    if row is None:
        audit(db, action, "training_session", "denied", auth.user.id, session_id)
        db.commit()
        raise HTTPException(status_code=403, detail="access denied")
    authorized_participant(
        db, auth, row.participant_id, action=action,
        allowed_roles=WRITE_ROLES if write else READ_ROLES,
        audit_success=False, lock_for_write=write,
    )
    return row


@router.get(
    "/participants/{participant_id}/training-sessions",
    response_model=list[TrainingSessionView],
)
def list_training_sessions(
    participant_id: uuid.UUID,
    auth: AuthContext = Depends(current_auth),
    db: Session = Depends(get_db),
) -> list[TrainingSession]:
    authorized_participant(
        db, auth, participant_id, action="list", allowed_roles=READ_ROLES, audit_success=False
    )
    rows = list(
        db.scalars(
            select(TrainingSession)
            .where(TrainingSession.participant_id == participant_id)
            .order_by(TrainingSession.session_at.desc(), TrainingSession.id.desc())
        ).all()
    )
    audit(db, "list", "training_session", "allowed", auth.user.id, participant_id)
    db.commit()
    return rows


@router.post(
    "/participants/{participant_id}/training-sessions",
    response_model=TrainingSessionView,
    status_code=201,
)
def create_training_session(
    participant_id: uuid.UUID,
    payload: TrainingSessionCreate,
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: Session = Depends(get_db),
    key: str = Depends(idempotency_header),
) -> TrainingSession:
    require_csrf(request, auth, db, "create", "training_session", participant_id)
    authorized_participant(
        db, auth, participant_id, action="create", allowed_roles=WRITE_ROLES,
        audit_success=False, lock_for_write=True,
    )
    if not has_current_synthetic_consent(db, participant_id):
        audit(db, "create", "training_session", "denied", auth.user.id, participant_id)
        db.commit()
        raise HTTPException(status_code=403, detail="synthetic consent required")
    row_id, fresh = reserve_write(
        db, auth.user.id, f"training_session:create:{participant_id}", key, payload
    )
    if not fresh:
        row = db.get(TrainingSession, row_id)
        if row is None:
            raise HTTPException(status_code=503, detail="receipt target missing")
        return row
    row = TrainingSession(
        id=row_id, participant_id=participant_id, source="manual_staff_entry",
        recorded_by=auth.user.id, **payload.model_dump()
    )
    db.add(row)
    audit(db, "create", "training_session", "allowed", auth.user.id, row_id)
    db.commit()
    db.refresh(row)
    return row


@router.get("/training-sessions/{session_id}", response_model=TrainingSessionView)
def get_training_session(
    session_id: uuid.UUID,
    auth: AuthContext = Depends(current_auth),
    db: Session = Depends(get_db),
) -> TrainingSession:
    row = scoped_session(db, auth, session_id, action="read")
    audit(db, "read", "training_session", "allowed", auth.user.id, row.id)
    db.commit()
    return row


@router.get(
    "/training-sessions/{session_id}/feedback",
    response_model=list[TrainingFeedbackView],
)
def list_training_feedback(
    session_id: uuid.UUID,
    auth: AuthContext = Depends(current_auth),
    db: Session = Depends(get_db),
) -> list[TrainingFeedbackRevision]:
    scoped_session(db, auth, session_id, action="read")
    rows = feedback_history(db, session_id)
    audit(db, "read", "training_feedback", "allowed", auth.user.id, session_id)
    db.commit()
    return rows


@router.put("/training-sessions/{session_id}/feedback", response_model=TrainingFeedbackView)
def write_training_feedback(
    session_id: uuid.UUID,
    payload: TrainingFeedbackWrite,
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: Session = Depends(get_db),
    key: str = Depends(idempotency_header),
) -> TrainingFeedbackRevision:
    require_csrf(request, auth, db, "revise", "training_feedback", session_id)
    row = scoped_session(db, auth, session_id, action="revise", write=True)
    if not has_current_synthetic_consent(db, row.participant_id):
        audit(db, "revise", "training_feedback", "denied", auth.user.id, session_id)
        db.commit()
        raise HTTPException(status_code=403, detail="synthetic consent required")
    revision_id, fresh = reserve_write(
        db, auth.user.id, f"training_feedback:{session_id}", key, payload
    )
    if not fresh:
        existing = db.get(TrainingFeedbackRevision, revision_id)
        if existing is None:
            raise HTTPException(status_code=503, detail="receipt target missing")
        return existing
    history = feedback_history(db, session_id)
    current_no = history[-1].revision_no if history else 0
    if payload.expected_revision != current_no:
        raise HTTPException(status_code=409, detail="stale feedback revision")
    if current_no and not payload.change_reason:
        raise HTTPException(status_code=422, detail="correction reason required")
    revision = TrainingFeedbackRevision(
        id=revision_id, session_id=session_id, revision_no=current_no + 1,
        recorded_by=auth.user.id,
        **payload.model_dump(exclude={"expected_revision"}),
    )
    db.add(revision)
    audit(db, "revise", "training_feedback", "allowed", auth.user.id, session_id)
    db.commit()
    db.refresh(revision)
    return revision


@router.get(
    "/participants/{participant_id}/safety-events",
    response_model=list[SafetyEventView],
)
def list_safety_events(
    participant_id: uuid.UUID,
    auth: AuthContext = Depends(current_auth),
    db: Session = Depends(get_db),
) -> list[SafetyEvent]:
    authorized_participant(
        db, auth, participant_id, action="list", allowed_roles=READ_ROLES, audit_success=False
    )
    rows = list(
        db.scalars(
            select(SafetyEvent)
            .where(SafetyEvent.participant_id == participant_id)
            .order_by(SafetyEvent.event_at.desc(), SafetyEvent.id.desc())
        ).all()
    )
    audit(db, "list", "safety_event", "allowed", auth.user.id, participant_id)
    db.commit()
    return rows


@router.post(
    "/participants/{participant_id}/safety-events",
    response_model=SafetyEventView,
    status_code=201,
)
def create_safety_event(
    participant_id: uuid.UUID,
    payload: SafetyEventCreate,
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: Session = Depends(get_db),
    key: str = Depends(idempotency_header),
) -> SafetyEvent:
    require_csrf(request, auth, db, "report", "safety_event", participant_id)
    authorized_participant(
        db, auth, participant_id, action="report", allowed_roles=WRITE_ROLES,
        audit_success=False, lock_for_write=True,
    )
    if payload.session_id is not None:
        session = db.get(TrainingSession, payload.session_id)
        if session is None or session.participant_id != participant_id:
            audit(db, "report", "safety_event", "denied", auth.user.id, participant_id)
            db.commit()
            raise HTTPException(status_code=403, detail="access denied")
    row_id, fresh = reserve_write(
        db, auth.user.id, f"safety_event:create:{participant_id}", key, payload
    )
    if not fresh:
        row = db.get(SafetyEvent, row_id)
        if row is None:
            raise HTTPException(status_code=503, detail="receipt target missing")
        return row
    row = SafetyEvent(
        id=row_id, participant_id=participant_id, recorded_by=auth.user.id,
        **payload.model_dump(),
    )
    db.add(row)
    audit(db, "report", "safety_event", "allowed", auth.user.id, row_id)
    db.commit()
    db.refresh(row)
    return row
