"""Synthetic manual SPPB total assessment routes."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api import AuthContext, audit, authorized_participant, current_auth, require_csrf
from app.assessment import (
    SYNTHETIC_PROTOCOL,
    confirmed_copy,
    current_revision,
    detail,
    initial_draft,
    latest_consent_granted,
    measurement_draft,
    revisions,
    summary,
)
from app.db import get_db
from app.intake import reserve_write
from app.intake_api import READ_ROLES, WRITE_ROLES, idempotency_header
from app.models import Assessment, AssessmentRevision
from app.schemas import (
    AssessmentConfirm,
    AssessmentCreate,
    AssessmentDetail,
    AssessmentRevisionView,
    AssessmentSummary,
    MeasurementWrite,
)

router = APIRouter(prefix="/api/v1")
CONFIRM_ROLES = {"clinician", "clinical_approver"}


def require_assessment(
    db: Session,
    auth: AuthContext,
    assessment_id: uuid.UUID,
    *,
    action: str,
    roles: set[str],
    write: bool = False,
) -> Assessment:
    row = db.get(Assessment, assessment_id)
    if row is None:
        audit(db, action, "assessment", "denied", auth.user.id, assessment_id)
        db.commit()
        raise HTTPException(status_code=403, detail="access denied")
    authorized_participant(
        db,
        auth,
        row.participant_id,
        action=action,
        allowed_roles=roles,
        audit_success=False,
        lock_for_write=write,
    )
    if write:
        row = db.scalar(select(Assessment).where(Assessment.id == assessment_id).with_for_update())
        if row is None:
            raise RuntimeError("assessment disappeared during locked write")
    return row


def require_current_consent(
    db: Session, auth: AuthContext, participant_id: uuid.UUID, assessment_id: uuid.UUID | None
) -> None:
    if not latest_consent_granted(db, participant_id):
        audit(db, "write", "assessment", "denied", auth.user.id, assessment_id)
        db.commit()
        raise HTTPException(status_code=403, detail="synthetic consent required")


@router.get("/participants/{participant_id}/assessments", response_model=list[AssessmentSummary])
def list_assessments(
    participant_id: uuid.UUID,
    auth: AuthContext = Depends(current_auth),
    db: Session = Depends(get_db),
) -> list[AssessmentSummary]:
    authorized_participant(
        db, auth, participant_id, action="list", allowed_roles=READ_ROLES, audit_success=False
    )
    rows = db.scalars(
        select(Assessment)
        .where(Assessment.participant_id == participant_id)
        .order_by(Assessment.created_at.desc(), Assessment.id.desc())
    ).all()
    result = [summary(row, current_revision(db, row.id)) for row in rows]
    audit(db, "list", "assessment", "allowed", auth.user.id, participant_id)
    db.commit()
    return result


@router.post("/assessments", status_code=201, response_model=AssessmentDetail)
def create_assessment(
    payload: AssessmentCreate,
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: Session = Depends(get_db),
    key: str = Depends(idempotency_header),
) -> AssessmentDetail:
    require_csrf(request, auth, db, "create", "assessment", payload.participant_id)
    authorized_participant(
        db, auth, payload.participant_id, action="create", allowed_roles=WRITE_ROLES,
        audit_success=False, lock_for_write=True,
    )
    require_current_consent(db, auth, payload.participant_id, None)
    assessment_id, fresh = reserve_write(db, auth.user.id, "assessment:create", key, payload)
    if not fresh:
        existing = db.get(Assessment, assessment_id)
        if existing is None:
            raise HTTPException(status_code=503, detail="receipt target missing")
        return detail(existing, revisions(db, assessment_id))
    row = Assessment(
        id=assessment_id,
        participant_id=payload.participant_id,
        visit_kind=payload.visit_kind,
        protocol_version=SYNTHETIC_PROTOCOL,
        created_by=auth.user.id,
    )
    first = initial_draft(assessment_id, auth.user.id)
    db.add_all([row, first])
    audit(db, "create", "assessment", "allowed", auth.user.id, assessment_id)
    db.commit()
    return detail(row, [first])


@router.get("/assessments/{assessment_id}", response_model=AssessmentDetail)
def get_assessment(
    assessment_id: uuid.UUID,
    auth: AuthContext = Depends(current_auth),
    db: Session = Depends(get_db),
) -> AssessmentDetail:
    row = require_assessment(
        db, auth, assessment_id, action="read", roles=READ_ROLES
    )
    result = detail(row, revisions(db, assessment_id))
    audit(db, "read", "assessment", "allowed", auth.user.id, assessment_id)
    db.commit()
    return result


@router.put("/assessments/{assessment_id}/measurements", response_model=AssessmentRevisionView)
def write_measurement(
    assessment_id: uuid.UUID,
    payload: MeasurementWrite,
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: Session = Depends(get_db),
    key: str = Depends(idempotency_header),
) -> AssessmentRevisionView:
    require_csrf(request, auth, db, "revise", "assessment", assessment_id)
    assessment = require_assessment(
        db, auth, assessment_id, action="revise", roles=WRITE_ROLES, write=True
    )
    require_current_consent(db, auth, assessment.participant_id, assessment_id)
    revision_id, fresh = reserve_write(
        db, auth.user.id, f"assessment:measure:{assessment_id}", key, payload
    )
    if not fresh:
        existing = db.get(AssessmentRevision, revision_id)
        if existing is None:
            raise HTTPException(status_code=503, detail="receipt target missing")
        return AssessmentRevisionView.model_validate(existing)
    prior = current_revision(db, assessment_id)
    if payload.expected_revision != prior.revision_no:
        raise HTTPException(status_code=409, detail="stale assessment revision")
    if prior.validity != "unrecorded" and not payload.change_reason:
        raise HTTPException(status_code=422, detail="correction reason required")
    revision = measurement_draft(assessment_id, revision_id, prior, payload, auth.user.id)
    db.add(revision)
    audit(db, "revise", "assessment", "allowed", auth.user.id, assessment_id)
    db.commit()
    return AssessmentRevisionView.model_validate(revision)


@router.post("/assessments/{assessment_id}/confirm", response_model=AssessmentRevisionView)
def confirm_assessment(
    assessment_id: uuid.UUID,
    payload: AssessmentConfirm,
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: Session = Depends(get_db),
    key: str = Depends(idempotency_header),
) -> AssessmentRevisionView:
    require_csrf(request, auth, db, "confirm", "assessment", assessment_id)
    assessment = require_assessment(
        db, auth, assessment_id, action="confirm", roles=CONFIRM_ROLES, write=True
    )
    require_current_consent(db, auth, assessment.participant_id, assessment_id)
    revision_id, fresh = reserve_write(
        db, auth.user.id, f"assessment:confirm:{assessment_id}", key, payload
    )
    if not fresh:
        existing = db.get(AssessmentRevision, revision_id)
        if existing is None:
            raise HTTPException(status_code=503, detail="receipt target missing")
        return AssessmentRevisionView.model_validate(existing)
    prior = current_revision(db, assessment_id)
    if payload.expected_revision != prior.revision_no or prior.state != "draft":
        raise HTTPException(status_code=409, detail="stale or already confirmed")
    if prior.validity == "unrecorded":
        raise HTTPException(status_code=422, detail="measurement not recorded")
    revision = confirmed_copy(assessment_id, revision_id, prior, auth.user.id)
    db.add(revision)
    audit(db, "confirm", "assessment", "allowed", auth.user.id, assessment_id)
    db.commit()
    return AssessmentRevisionView.model_validate(revision)
