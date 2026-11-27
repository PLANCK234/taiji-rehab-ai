"""Persist synthetic pose evidence; original input and candidates are immutable."""

import hashlib
import json
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api import AuthContext, audit, authorized_participant, current_auth, require_csrf
from app.db import get_db
from app.demo_api import require_demo_consent
from app.intake import reserve_write
from app.intake_api import READ_ROLES, WRITE_ROLES, idempotency_header
from app.models import PoseAnalysis, PoseReview
from app.pose_analysis import ALGORITHM_VERSION, analyze_pose
from app.pose_review import human_confirmation
from app.pose_schemas import (
    PoseAnalysisView,
    PoseDetail,
    PoseInput,
    PoseReviewInput,
    PoseReviewView,
)

router = APIRouter(prefix="/api/v1")


def scoped(db: Session, auth: AuthContext, analysis_id: uuid.UUID, *, write=False):
    row = db.get(PoseAnalysis, analysis_id)
    if row is None:
        raise HTTPException(403, "access denied")
    authorized_participant(
        db, auth, row.participant_id, action="pose", allowed_roles=READ_ROLES,
        audit_success=False, lock_for_write=write,
    )
    if write:
        row = db.scalar(
            select(PoseAnalysis).where(PoseAnalysis.id == analysis_id).with_for_update()
        )
    return row


@router.get("/participants/{participant_id}/pose-analyses", response_model=list[PoseAnalysisView])
def list_analyses(
    participant_id: uuid.UUID, auth: AuthContext = Depends(current_auth),
    db: Session = Depends(get_db),
):
    authorized_participant(
        db, auth, participant_id, action="pose_list", allowed_roles=READ_ROLES, audit_success=False,
    )
    rows = db.execute(select(
        PoseAnalysis.id, PoseAnalysis.participant_id, PoseAnalysis.algorithm_version,
        PoseAnalysis.input_sha256, PoseAnalysis.result, PoseAnalysis.created_at,
    ).where(
        PoseAnalysis.participant_id == participant_id,
    ).order_by(PoseAnalysis.created_at.desc(), PoseAnalysis.id.desc()).limit(50)).mappings().all()
    summaries = [PoseAnalysisView(**{
        **row, "result": {key: value for key, value in row["result"].items() if key != "series"},
    }) for row in rows]
    audit(db, "list", "pose_analysis", "allowed", auth.user.id, participant_id)
    db.commit()
    return summaries


@router.post("/participants/{participant_id}/pose-analyses", response_model=PoseAnalysisView,
             status_code=201)
def create_analysis(
    participant_id: uuid.UUID, payload: PoseInput, request: Request,
    auth: AuthContext = Depends(current_auth), db: Session = Depends(get_db),
    key: str = Depends(idempotency_header),
):
    require_csrf(request, auth, db, "create", "pose_analysis", participant_id)
    authorized_participant(
        db, auth, participant_id, action="pose_create", allowed_roles=WRITE_ROLES,
        audit_success=False, lock_for_write=True,
    )
    require_demo_consent(db, participant_id)
    record_id, fresh = reserve_write(db, auth.user.id, f"pose:{participant_id}", key, payload)
    if not fresh:
        return db.get(PoseAnalysis, record_id)
    input_data = payload.model_dump(mode="json")
    digest = hashlib.sha256(json.dumps(
        input_data, sort_keys=True, separators=(",", ":"),
    ).encode()).hexdigest()
    row = PoseAnalysis(
        id=record_id, participant_id=participant_id, input_data=input_data,
        input_sha256=digest, algorithm_version=ALGORITHM_VERSION,
        result=analyze_pose(payload), created_by=auth.user.id,
    )
    db.add(row)
    audit(db, "create", "pose_analysis", "allowed", auth.user.id, record_id)
    db.commit()
    return row


@router.get("/pose-analyses/{analysis_id}", response_model=PoseDetail)
def get_analysis(
    analysis_id: uuid.UUID, auth: AuthContext = Depends(current_auth),
    db: Session = Depends(get_db),
):
    row = scoped(db, auth, analysis_id)
    reviews = list(db.scalars(select(PoseReview).where(
        PoseReview.analysis_id == analysis_id,
    ).order_by(PoseReview.revision_no)))
    result = PoseDetail(
        **PoseAnalysisView.model_validate(row).model_dump(), input_data=row.input_data,
        reviews=[PoseReviewView.model_validate(r) for r in reviews],
        human_confirmation=human_confirmation(row.result, reviews),
    )
    audit(db, "read", "pose_analysis", "allowed", auth.user.id, analysis_id)
    db.commit()
    return result


@router.post("/pose-analyses/{analysis_id}/reviews", response_model=PoseReviewView, status_code=201)
def review_analysis(
    analysis_id: uuid.UUID, payload: PoseReviewInput, request: Request,
    auth: AuthContext = Depends(current_auth), db: Session = Depends(get_db),
    key: str = Depends(idempotency_header),
):
    require_csrf(request, auth, db, "review", "pose_analysis", analysis_id)
    row = scoped(db, auth, analysis_id, write=True)
    if auth.user.role not in {"clinician", "clinical_approver"}:
        audit(db, "review", "pose_analysis", "denied", auth.user.id, analysis_id)
        db.commit()
        raise HTTPException(403, "clinical review role required")
    require_demo_consent(db, row.participant_id)
    record_id, fresh = reserve_write(db, auth.user.id, f"pose_review:{analysis_id}", key, payload)
    if not fresh:
        return db.get(PoseReview, record_id)
    previous = db.scalar(select(PoseReview.revision_no).where(
        PoseReview.analysis_id == analysis_id,
    ).order_by(PoseReview.revision_no.desc()).limit(1)) or 0
    if previous != payload.expected_revision:
        raise HTTPException(409, "stale review")
    if payload.decision == "accepted_observations" and row.result["status"] == "not_assessable":
        raise HTTPException(422, "no assessable observation")
    review = PoseReview(
        id=record_id, analysis_id=analysis_id, revision_no=previous + 1,
        decision=payload.decision, reason=payload.reason, recorded_by=auth.user.id,
        corrections=[item.model_dump(mode="json") for item in payload.corrections],
    )
    db.add(review)
    audit(db, "review", "pose_analysis", "allowed", auth.user.id, analysis_id)
    db.commit()
    return review
