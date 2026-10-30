"""Synthetic-only coded intake routes; no clinical clearance or photo upload."""

import uuid

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api import AuthContext, audit, authorized_participant, current_auth, require_csrf
from app.db import get_db
from app.intake import require_reason_for_revision, reserve_write
from app.models import (
    ConsentRecord,
    Participant,
    ParticipantAssignment,
    ScreeningRecord,
    StudyAssignment,
)
from app.schemas import (
    ConsentCreate,
    ConsentHistory,
    ConsentView,
    ParticipantCreate,
    ParticipantView,
    ScreeningCreate,
    ScreeningHistory,
    ScreeningView,
)

router = APIRouter(prefix="/api/v1")
WRITE_ROLES = {"clinician", "research_assistant"}
READ_ROLES = WRITE_ROLES | {"clinical_approver"}


def idempotency_header(
    idempotency_key: str = Header(
        alias="Idempotency-Key", min_length=16, max_length=128, pattern=r"^[A-Za-z0-9._-]+$"
    ),
) -> str:
    return idempotency_key


@router.get("/participants", response_model=list[ParticipantView])
def list_participants(
    auth: AuthContext = Depends(current_auth), db: Session = Depends(get_db)
) -> list[ParticipantView]:
    if auth.user.role not in READ_ROLES:
        audit(db, "list", "participant", "denied", auth.user.id)
        db.commit()
        raise HTTPException(status_code=403, detail="access denied")
    rows = db.scalars(
        select(Participant)
        .join(StudyAssignment, StudyAssignment.study_id == Participant.study_id)
        .join(ParticipantAssignment, ParticipantAssignment.participant_id == Participant.id)
        .where(
            StudyAssignment.user_id == auth.user.id,
            ParticipantAssignment.user_id == auth.user.id,
        )
        .order_by(Participant.study_code)
    ).all()
    audit(db, "list", "participant", "allowed", auth.user.id)
    db.commit()
    return [
        ParticipantView(id=row.id, study_id=row.study_id, study_code=row.study_code)
        for row in rows
    ]


@router.post("/participants", status_code=201, response_model=ParticipantView)
def create_participant(
    payload: ParticipantCreate,
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: Session = Depends(get_db),
    key: str = Depends(idempotency_header),
) -> ParticipantView:
    require_csrf(request, auth, db, "create", "participant")
    assigned = db.get(StudyAssignment, (auth.user.id, payload.study_id))
    if auth.user.role not in WRITE_ROLES or assigned is None:
        audit(db, "create", "participant", "denied", auth.user.id)
        db.commit()
        raise HTTPException(status_code=403, detail="access denied")
    participant_id, fresh = reserve_write(db, auth.user.id, "participant:create", key, payload)
    if not fresh:
        existing = db.get(Participant, participant_id)
        if existing is None:
            raise HTTPException(status_code=503, detail="receipt target missing")
        return ParticipantView(
            id=existing.id, study_id=existing.study_id, study_code=existing.study_code
        )
    row = Participant(id=participant_id, study_id=payload.study_id, study_code=payload.study_code)
    db.add(row)
    db.add(ParticipantAssignment(user_id=auth.user.id, participant_id=participant_id))
    audit(db, "create", "participant", "allowed", auth.user.id, participant_id)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="coded record already exists") from exc
    return ParticipantView(id=row.id, study_id=row.study_id, study_code=row.study_code)


@router.get("/participants/{participant_id}/consents", response_model=ConsentHistory)
def list_consents(
    participant_id: uuid.UUID,
    auth: AuthContext = Depends(current_auth),
    db: Session = Depends(get_db),
) -> ConsentHistory:
    authorized_participant(db, auth, participant_id)
    rows = db.scalars(
        select(ConsentRecord)
        .where(ConsentRecord.participant_id == participant_id)
        .order_by(ConsentRecord.recorded_at.desc(), ConsentRecord.id.desc())
    ).all()
    return ConsentHistory(
        state=rows[0].decision if rows else "not_recorded",
        records=[ConsentView.model_validate(row) for row in rows],
    )


@router.post(
    "/participants/{participant_id}/consents", status_code=201, response_model=ConsentView
)
def record_consent(
    participant_id: uuid.UUID,
    payload: ConsentCreate,
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: Session = Depends(get_db),
    key: str = Depends(idempotency_header),
) -> ConsentView:
    require_csrf(request, auth, db, "record", "consent_record", participant_id)
    authorized_participant(
        db, auth, participant_id, action="record", allowed_roles=WRITE_ROLES,
        audit_success=False, lock_for_write=True,
    )
    resource_id, fresh = reserve_write(db, auth.user.id, f"consent:{participant_id}", key, payload)
    if not fresh:
        existing = db.get(ConsentRecord, resource_id)
        if existing is None:
            raise HTTPException(status_code=503, detail="receipt target missing")
        return ConsentView.model_validate(existing)
    require_reason_for_revision(
        db, ConsentRecord, (ConsentRecord.participant_id == participant_id,), payload.change_reason
    )
    row = ConsentRecord(
        id=resource_id,
        participant_id=participant_id,
        document_version=payload.document_version,
        purpose_code=payload.purpose_code,
        decision=payload.decision,
        photo_scope=payload.photo_scope,
        change_reason=payload.change_reason,
        recorded_by=auth.user.id,
    )
    db.add(row)
    audit(db, "record", "consent_record", "allowed", auth.user.id, resource_id)
    db.commit()
    return ConsentView.model_validate(row)


@router.get("/participants/{participant_id}/screenings", response_model=ScreeningHistory)
def list_screenings(
    participant_id: uuid.UUID,
    auth: AuthContext = Depends(current_auth),
    db: Session = Depends(get_db),
) -> ScreeningHistory:
    authorized_participant(db, auth, participant_id)
    rows = db.scalars(
        select(ScreeningRecord)
        .where(ScreeningRecord.participant_id == participant_id)
        .order_by(ScreeningRecord.recorded_at.desc(), ScreeningRecord.id.desc())
    ).all()
    return ScreeningHistory(
        review_state="needs_review" if rows else "not_assessed",
        records=[ScreeningView.model_validate(row) for row in rows],
    )


@router.post(
    "/participants/{participant_id}/screenings", status_code=201, response_model=ScreeningView
)
def record_screening(
    participant_id: uuid.UUID,
    payload: ScreeningCreate,
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: Session = Depends(get_db),
    key: str = Depends(idempotency_header),
) -> ScreeningView:
    require_csrf(request, auth, db, "record", "screening_record", participant_id)
    authorized_participant(
        db, auth, participant_id, action="record", allowed_roles=WRITE_ROLES,
        audit_success=False, lock_for_write=True,
    )
    current_consent = db.scalar(
        select(ConsentRecord)
        .where(ConsentRecord.participant_id == participant_id)
        .order_by(ConsentRecord.recorded_at.desc(), ConsentRecord.id.desc())
        .limit(1)
    )
    if current_consent is None or current_consent.decision != "granted":
        audit(db, "record", "screening_record", "denied", auth.user.id, participant_id)
        db.commit()
        raise HTTPException(status_code=403, detail="synthetic consent required")
    resource_id, fresh = reserve_write(
        db, auth.user.id, f"screening:{participant_id}", key, payload
    )
    if not fresh:
        existing = db.get(ScreeningRecord, resource_id)
        if existing is None:
            raise HTTPException(status_code=503, detail="receipt target missing")
        return ScreeningView.model_validate(existing)
    require_reason_for_revision(
        db,
        ScreeningRecord,
        (ScreeningRecord.participant_id == participant_id,
         ScreeningRecord.item_code == payload.item_code),
        payload.change_reason,
    )
    row = ScreeningRecord(
        id=resource_id,
        participant_id=participant_id,
        item_code=payload.item_code,
        answer=payload.answer,
        change_reason=payload.change_reason,
        recorded_by=auth.user.id,
    )
    db.add(row)
    audit(db, "record", "screening_record", "allowed", auth.user.id, resource_id)
    db.commit()
    return ScreeningView.model_validate(row)
