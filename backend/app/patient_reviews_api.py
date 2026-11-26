"""Nonclinical, synthetic-only review; source reports and analysis remain immutable."""

import uuid
from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field, StrictInt, field_validator
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api import AuthContext, audit, authorized_participant, current_auth, require_csrf
from app.db import get_db
from app.intake import reserve_write
from app.intake_api import READ_ROLES, idempotency_header
from app.models import DemoPatientReportReview, DemoPatientReportRevision
from app.runtime import require_demo
from app.training import has_current_synthetic_consent

router = APIRouter(prefix="/api/v1", dependencies=[Depends(require_demo)])


class ReportReviewWrite(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    report_revision_id: uuid.UUID
    expected_review_no: StrictInt = Field(ge=0)
    result: Literal["reviewed", "unable"]
    note: str = Field(min_length=1, max_length=500)


class ReportReviewView(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    report_revision_id: uuid.UUID
    review_no: int
    result: Literal["reviewed", "unable"]
    note: str
    recorded_by: uuid.UUID
    recorded_at: datetime

    @field_validator("recorded_at", mode="before")
    @classmethod
    def restore_sqlite_utc(cls, value: datetime) -> datetime:
        return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value


@router.get(
    "/participants/{participant_id}/patient-report-reviews",
    response_model=list[ReportReviewView],
)
def read_reviews(
    participant_id: uuid.UUID,
    auth: AuthContext = Depends(current_auth),
    db: Session = Depends(get_db),
) -> list[DemoPatientReportReview]:
    authorized_participant(
        db, auth, participant_id, action="read", allowed_roles=READ_ROLES, audit_success=False
    )
    rows = list(db.scalars(
        select(DemoPatientReportReview)
        .join(DemoPatientReportRevision)
        .where(DemoPatientReportRevision.participant_id == participant_id)
        .order_by(DemoPatientReportReview.recorded_at, DemoPatientReportReview.review_no)
    ).all())
    audit(db, "read", "patient_report_review", "allowed", auth.user.id, participant_id)
    db.commit()
    return rows


@router.post(
    "/participants/{participant_id}/patient-report-reviews",
    response_model=ReportReviewView, status_code=201,
)
def write_review(
    participant_id: uuid.UUID,
    payload: ReportReviewWrite,
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: Session = Depends(get_db),
    key: str = Depends(idempotency_header),
) -> DemoPatientReportReview:
    require_csrf(request, auth, db, "review", "patient_report_review", participant_id)
    participant = authorized_participant(
        db, auth, participant_id, action="review",
        allowed_roles={"clinician", "research_assistant"},
        audit_success=False, lock_for_write=True,
    )
    if not participant.study_code.startswith("SYN-") or not has_current_synthetic_consent(
        db, participant_id
    ):
        raise HTTPException(status_code=403, detail="synthetic consent required")
    source = db.get(DemoPatientReportRevision, payload.report_revision_id)
    if source is None or source.participant_id != participant_id:
        audit(db, "review", "patient_report_review", "denied", auth.user.id, participant_id)
        db.commit()
        raise HTTPException(status_code=403, detail="access denied")
    review_id, fresh = reserve_write(
        db, auth.user.id, f"patient_review:{participant_id}", key, payload
    )
    if not fresh:
        row = db.get(DemoPatientReportReview, review_id)
        if row is None:
            raise HTTPException(status_code=503, detail="receipt target missing")
        return row
    latest_source = db.scalar(select(DemoPatientReportRevision.id).where(
        DemoPatientReportRevision.report_id == source.report_id
    ).order_by(DemoPatientReportRevision.revision_no.desc()).limit(1))
    if source.publication_version is None or source.id != latest_source:
        raise HTTPException(status_code=409, detail="task feedback revision changed")
    latest_no = db.scalar(select(DemoPatientReportReview.review_no).where(
        DemoPatientReportReview.report_revision_id == source.id
    ).order_by(DemoPatientReportReview.review_no.desc()).limit(1)) or 0
    if latest_no != payload.expected_review_no:
        raise HTTPException(status_code=409, detail="review changed")
    row = DemoPatientReportReview(
        id=review_id, report_revision_id=source.id, review_no=latest_no + 1,
        result=payload.result, note=payload.note, recorded_by=auth.user.id,
    )
    db.add(row)
    audit(db, "review", "patient_report_review", "allowed", auth.user.id, participant_id)
    db.commit()
    db.refresh(row)
    return row
