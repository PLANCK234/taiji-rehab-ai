"""Scoped synthetic timing candidates; no score, assessment or grading writes."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api import AuthContext, audit, authorized_participant, current_auth, require_csrf
from app.db import get_db
from app.demo_api import require_demo_consent
from app.intake import reserve_write
from app.intake_api import READ_ROLES, WRITE_ROLES, idempotency_header
from app.models import PoseAnalysis, SppbMeasurement, SppbReview
from app.pose_schemas import PoseInput
from app.sppb_measure import VERSION, SitStandOptions, measure_sit_to_stand
from app.sppb_review import confirmation
from app.sppb_schemas import (
    SppbCreate,
    SppbDetail,
    SppbMeasurementView,
    SppbPage,
    SppbReviewInput,
    SppbReviewRecord,
)

router = APIRouter(prefix="/api/v1")


def source_scope(db, auth, source_id, *, write=False, roles=None):
    source = db.get(PoseAnalysis, source_id)
    if source is None:
        audit(db, "access", "sppb_measurement", "denied", auth.user.id, source_id)
        db.commit()
        raise HTTPException(403, "access denied")
    authorized_participant(db, auth, source.participant_id, action="sppb_access",
                           allowed_roles=roles or READ_ROLES,
                           audit_success=False, lock_for_write=write)
    return source


def measurement_scope(db, auth, measurement_id, *, write=False):
    row = db.get(SppbMeasurement, measurement_id)
    if row is None:
        audit(db, "access", "sppb_measurement", "denied", auth.user.id, measurement_id)
        db.commit()
        raise HTTPException(403, "access denied")
    source = source_scope(db, auth, row.source_analysis_id, write=write)
    if write:
        row = db.scalar(select(SppbMeasurement).where(
            SppbMeasurement.id == measurement_id,
        ).with_for_update())
    return row, source


@router.post("/participants/{participant_id}/sppb-measurements",
             response_model=SppbMeasurementView, status_code=201)
def create_measurement(
    participant_id: uuid.UUID, payload: SppbCreate, request: Request,
    auth: AuthContext = Depends(current_auth), db: Session = Depends(get_db),
    key: str = Depends(idempotency_header),
):
    require_csrf(request, auth, db, "create", "sppb_measurement", participant_id)
    # Authorize the route object before loading source data from a different object.
    authorized_participant(db, auth, participant_id, action="sppb_create",
                           allowed_roles=WRITE_ROLES, audit_success=False, lock_for_write=True)
    source = source_scope(db, auth, payload.source_analysis_id, roles=WRITE_ROLES)
    if source.participant_id != participant_id:
        audit(db, "create", "sppb_measurement", "denied", auth.user.id, participant_id)
        db.commit()
        raise HTTPException(403, "source belongs to a different participant")
    require_demo_consent(db, participant_id)
    record_id, fresh = reserve_write(db, auth.user.id, f"sppb:{participant_id}", key, payload)
    if not fresh:
        return db.get(SppbMeasurement, record_id)
    try:
        result = measure_sit_to_stand(PoseInput.model_validate(source.input_data),
                                     SitStandOptions(manual_start_ms=payload.manual_start_ms))
    except ValueError as error:
        raise HTTPException(422, "manual start is outside the source recording") from error
    row = SppbMeasurement(id=record_id, source_analysis_id=source.id,
                          algorithm_version=VERSION, result=result, created_by=auth.user.id)
    db.add(row)
    audit(db, "create", "sppb_measurement", "allowed", auth.user.id, record_id)
    db.commit()
    return row


@router.get("/participants/{participant_id}/sppb-measurements", response_model=SppbPage)
def list_measurements(
    participant_id: uuid.UUID, limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0, le=1_000_000),
    auth: AuthContext = Depends(current_auth), db: Session = Depends(get_db),
):
    authorized_participant(db, auth, participant_id, action="sppb_list",
                           allowed_roles=READ_ROLES, audit_success=False)
    statement = select(SppbMeasurement).join(PoseAnalysis).where(
        PoseAnalysis.participant_id == participant_id,
    )
    total = db.scalar(select(func.count()).select_from(statement.subquery()))
    rows = list(db.scalars(statement.order_by(
        SppbMeasurement.created_at.desc(), SppbMeasurement.id.desc(),
    ).offset(offset).limit(limit)))
    result = SppbPage(items=[SppbMeasurementView.model_validate(r) for r in rows],
                      total=total, offset=offset, limit=limit)
    audit(db, "list", "sppb_measurement", "allowed", auth.user.id, participant_id)
    db.commit()
    return result


@router.get("/sppb-measurements/{measurement_id}", response_model=SppbDetail)
def get_measurement(
    measurement_id: uuid.UUID, auth: AuthContext = Depends(current_auth),
    db: Session = Depends(get_db),
):
    row, _ = measurement_scope(db, auth, measurement_id)
    reviews = list(db.scalars(select(SppbReview).where(
        SppbReview.measurement_id == measurement_id,
    ).order_by(SppbReview.revision_no)))
    result = SppbDetail(**SppbMeasurementView.model_validate(row).model_dump(),
                        reviews=[SppbReviewRecord.model_validate(r) for r in reviews],
                        human_confirmation=confirmation(row, reviews))
    audit(db, "read", "sppb_measurement", "allowed", auth.user.id, measurement_id)
    db.commit()
    return result


@router.post("/sppb-measurements/{measurement_id}/reviews",
             response_model=SppbReviewRecord, status_code=201)
def review_measurement(
    measurement_id: uuid.UUID, payload: SppbReviewInput, request: Request,
    auth: AuthContext = Depends(current_auth), db: Session = Depends(get_db),
    key: str = Depends(idempotency_header),
):
    require_csrf(request, auth, db, "review", "sppb_measurement", measurement_id)
    row, source = measurement_scope(db, auth, measurement_id, write=True)
    if auth.user.role not in {"clinician", "clinical_approver"}:
        audit(db, "review", "sppb_measurement", "denied", auth.user.id, measurement_id)
        db.commit()
        raise HTTPException(403, "clinical review role required")
    require_demo_consent(db, source.participant_id)
    record_id, fresh = reserve_write(
        db, auth.user.id, f"sppb_review:{measurement_id}", key, payload,
    )
    if not fresh:
        return db.get(SppbReview, record_id)
    previous = db.scalar(select(func.max(SppbReview.revision_no)).where(
        SppbReview.measurement_id == measurement_id,
    )) or 0
    if previous != payload.expected_revision:
        raise HTTPException(409, "stale review")
    if payload.decision == "accepted_timing" and row.result["status"] != "candidate":
        raise HTTPException(422, "no assessable timing; correct timestamps or request retake")
    if (payload.fifth_stand_ms is not None
            and payload.fifth_stand_ms > source.input_data["frames"][-1]["timestamp_ms"]):
        raise HTTPException(422, "corrected timing is outside the source recording")
    review = SppbReview(id=record_id, measurement_id=measurement_id,
                        revision_no=previous + 1, decision=payload.decision,
                        start_ms=payload.start_ms, fifth_stand_ms=payload.fifth_stand_ms,
                        reason=payload.reason, recorded_by=auth.user.id)
    db.add(review)
    audit(db, "review", "sppb_measurement", "allowed", auth.user.id, measurement_id)
    db.commit()
    return review
