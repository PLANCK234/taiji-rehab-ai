"""Synthetic patient-authored activity facts, separate from staff observations."""

import uuid
from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import (
    AwareDatetime,
    BaseModel,
    ConfigDict,
    Field,
    StrictInt,
    field_validator,
    model_validator,
)
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api import AuthContext, audit, authorized_participant, current_auth, require_csrf
from app.db import get_db
from app.intake import reserve_write
from app.intake_api import READ_ROLES, idempotency_header
from app.models import DemoPatientBinding, DemoPatientReportRevision, Participant
from app.runtime import require_demo
from app.training import has_current_synthetic_consent

router = APIRouter(prefix="/api/v1", dependencies=[Depends(require_demo)])


class PatientReportWrite(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    expected_revision: StrictInt = Field(ge=0)
    observed_at: AwareDatetime
    activity_state: Literal["performed", "not_performed", "unknown"]
    actual_minutes: StrictInt | None = Field(default=None, ge=0)
    discomfort_state: Literal["reported", "none", "unknown"]
    discomfort_note: str | None = Field(default=None, min_length=1, max_length=500)
    change_reason: str | None = Field(default=None, min_length=5, max_length=500, pattern=r"^SYN-")

    @field_validator("observed_at")
    @classmethod
    def utc_time(cls, value: datetime) -> datetime:
        return value.astimezone(timezone.utc)

    @model_validator(mode="after")
    def check_shape(self) -> "PatientReportWrite":
        if self.activity_state != "performed" and self.actual_minutes is not None:
            raise ValueError("minutes require performed activity")
        if (self.discomfort_state == "reported") != (self.discomfort_note is not None):
            raise ValueError("reported discomfort requires a note; other states forbid it")
        if self.expected_revision > 0 and not self.change_reason:
            raise ValueError("correction reason required")
        if self.expected_revision == 0 and self.change_reason is not None:
            raise ValueError("new report cannot have a correction reason")
        return self


class PatientReportView(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    report_id: uuid.UUID
    participant_id: uuid.UUID
    revision_no: int
    observed_at: datetime
    activity_state: Literal["performed", "not_performed", "unknown"]
    actual_minutes: int | None
    discomfort_state: Literal["reported", "none", "unknown"]
    discomfort_note: str | None
    change_reason: str | None
    recorded_by: uuid.UUID
    recorded_at: datetime

    @field_validator("observed_at", "recorded_at", mode="before")
    @classmethod
    def restore_sqlite_utc(cls, value: datetime) -> datetime:
        return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value


def own_participant(db: Session, auth: AuthContext, *, write: bool = False) -> Participant:
    if auth.user.role != "patient":
        raise HTTPException(status_code=403, detail="access denied")
    statement = (
        select(Participant)
        .join(DemoPatientBinding, DemoPatientBinding.participant_id == Participant.id)
        .where(
            DemoPatientBinding.user_id == auth.user.id,
            DemoPatientBinding.revoked_at.is_(None),
            Participant.study_code.startswith("SYN-"),
        )
    )
    if write:
        statement = statement.with_for_update(of=Participant)
    participant = db.scalar(statement)
    if participant is None:
        audit(db, "write" if write else "read", "patient_report", "denied", auth.user.id)
        db.commit()
        raise HTTPException(status_code=403, detail="access denied")
    return participant


def report_history(db: Session, participant_id: uuid.UUID) -> list[DemoPatientReportRevision]:
    return list(
        db.scalars(
            select(DemoPatientReportRevision)
            .where(DemoPatientReportRevision.participant_id == participant_id)
            .order_by(
                DemoPatientReportRevision.recorded_at.desc(),
                DemoPatientReportRevision.revision_no.desc(),
            )
        ).all()
    )


@router.get("/patient/reports", response_model=list[PatientReportView])
def own_reports(
    auth: AuthContext = Depends(current_auth),
    db: Session = Depends(get_db),
) -> list[DemoPatientReportRevision]:
    participant = own_participant(db, auth)
    rows = report_history(db, participant.id)
    audit(db, "read", "patient_report", "allowed", auth.user.id, participant.id)
    db.commit()
    return rows


@router.get(
    "/participants/{participant_id}/patient-reports", response_model=list[PatientReportView]
)
def staff_reports(
    participant_id: uuid.UUID,
    auth: AuthContext = Depends(current_auth),
    db: Session = Depends(get_db),
) -> list[DemoPatientReportRevision]:
    authorized_participant(
        db, auth, participant_id, action="read", allowed_roles=READ_ROLES, audit_success=False
    )
    rows = report_history(db, participant_id)
    audit(db, "read", "patient_report", "allowed", auth.user.id, participant_id)
    db.commit()
    return rows


@router.post("/patient/reports", response_model=PatientReportView, status_code=201)
def create_report(
    payload: PatientReportWrite,
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: Session = Depends(get_db),
    key: str = Depends(idempotency_header),
) -> DemoPatientReportRevision:
    return write_report(None, payload, request, auth, db, key)


@router.post("/patient/reports/{report_id}", response_model=PatientReportView, status_code=201)
def revise_report(
    report_id: uuid.UUID,
    payload: PatientReportWrite,
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: Session = Depends(get_db),
    key: str = Depends(idempotency_header),
) -> DemoPatientReportRevision:
    return write_report(report_id, payload, request, auth, db, key)


def write_report(
    report_id: uuid.UUID | None,
    payload: PatientReportWrite,
    request: Request,
    auth: AuthContext,
    db: Session,
    key: str,
) -> DemoPatientReportRevision:
    action = "create" if report_id is None else "revise"
    require_csrf(request, auth, db, action, "patient_report", report_id)
    participant = own_participant(db, auth, write=True)
    if not has_current_synthetic_consent(db, participant.id):
        audit(db, action, "patient_report", "denied", auth.user.id, participant.id)
        db.commit()
        raise HTTPException(status_code=403, detail="synthetic consent required")
    revision_id, fresh = reserve_write(
        db, auth.user.id, f"patient_report:{report_id or 'new'}", key, payload
    )
    if not fresh:
        existing = db.get(DemoPatientReportRevision, revision_id)
        if existing is None:
            raise HTTPException(status_code=503, detail="receipt target missing")
        return existing
    if report_id is None:
        if payload.expected_revision != 0:
            raise HTTPException(status_code=409, detail="new report revision must be zero")
        report_id, current_no = revision_id, 0
    else:
        previous = db.scalar(
            select(DemoPatientReportRevision)
            .where(DemoPatientReportRevision.report_id == report_id)
            .order_by(DemoPatientReportRevision.revision_no.desc())
            .limit(1)
        )
        if previous is None or previous.participant_id != participant.id:
            audit(db, action, "patient_report", "denied", auth.user.id, report_id)
            db.commit()
            raise HTTPException(status_code=403, detail="access denied")
        current_no = previous.revision_no
    if payload.expected_revision != current_no:
        raise HTTPException(status_code=409, detail="stale patient report revision")
    row = DemoPatientReportRevision(
        id=revision_id,
        report_id=report_id,
        participant_id=participant.id,
        revision_no=current_no + 1,
        recorded_by=auth.user.id,
        **payload.model_dump(exclude={"expected_revision"}),
    )
    db.add(row)
    audit(db, action, "patient_report", "allowed", auth.user.id, report_id)
    db.commit()
    db.refresh(row)
    return row
