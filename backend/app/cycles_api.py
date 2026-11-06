"""Manual synthetic grouping of existing observations; no visit scheduler."""

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
from app.intake_api import READ_ROLES, WRITE_ROLES, idempotency_header
from app.models import Assessment, SyntheticCycle, SyntheticVisitRevision, TrainingSession
from app.runtime import require_demo
from app.training import has_current_synthetic_consent

router = APIRouter(prefix="/api/v1", dependencies=[Depends(require_demo)])


class CycleWrite(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    label: str = Field(min_length=1, max_length=120)


class VisitWrite(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    expected_revision: StrictInt = Field(ge=0)
    label: str = Field(min_length=1, max_length=120)
    attendance: Literal["unknown", "attended", "not_attended"]
    assessment_state: Literal["unknown", "recorded", "declined", "not_measured"]
    assessment_id: uuid.UUID | None = None
    training_session_ids: list[uuid.UUID] = Field(default_factory=list, max_length=100)
    change_reason: str | None = Field(default=None, min_length=5, max_length=500, pattern=r"^SYN-")


class VisitView(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    visit_id: uuid.UUID
    revision_no: int
    label: str
    attendance: Literal["unknown", "attended", "not_attended"]
    assessment_state: Literal["unknown", "recorded", "declined", "not_measured"]
    assessment_id: uuid.UUID | None
    training_session_ids: list[uuid.UUID]
    change_reason: str | None
    recorded_at: datetime

    @field_validator("recorded_at", mode="before")
    @classmethod
    def restore_sqlite_utc(cls, value: datetime) -> datetime:
        return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value


class CycleRecordView(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    participant_id: uuid.UUID
    label: str
    created_by: uuid.UUID
    created_at: datetime


class CycleView(BaseModel):
    id: uuid.UUID
    label: str
    visits: list[VisitView]


def scoped_cycle(
    db: Session, auth: AuthContext, cycle_id: uuid.UUID, *, write: bool = False
) -> SyntheticCycle:
    cycle = db.get(SyntheticCycle, cycle_id)
    if cycle is None:
        raise HTTPException(status_code=403, detail="access denied")
    authorized_participant(
        db,
        auth,
        cycle.participant_id,
        action="read" if not write else "revise",
        allowed_roles=WRITE_ROLES if write else READ_ROLES,
        audit_success=False,
        lock_for_write=write,
    )
    return cycle


@router.get("/participants/{participant_id}/cycles", response_model=list[CycleView])
def list_cycles(
    participant_id: uuid.UUID,
    auth: AuthContext = Depends(current_auth),
    db: Session = Depends(get_db),
):
    authorized_participant(db, auth, participant_id, allowed_roles=READ_ROLES, audit_success=False)
    cycles = db.scalars(
        select(SyntheticCycle).where(SyntheticCycle.participant_id == participant_id)
    ).all()
    result = []
    for cycle in cycles:
        visits = db.scalars(
            select(SyntheticVisitRevision)
            .where(SyntheticVisitRevision.cycle_id == cycle.id)
            .order_by(SyntheticVisitRevision.recorded_at, SyntheticVisitRevision.revision_no)
        ).all()
        result.append(
            {
                "id": cycle.id,
                "label": cycle.label,
                "visits": [
                    {
                        "id": row.id,
                        "visit_id": row.visit_id,
                        "revision_no": row.revision_no,
                        "label": row.label,
                        "attendance": row.attendance,
                        "assessment_state": row.assessment_state,
                        "assessment_id": row.assessment_id,
                        "training_session_ids": row.training_session_ids,
                        "change_reason": row.change_reason,
                        "recorded_at": row.recorded_at,
                    }
                    for row in visits
                ],
            }
        )
    audit(db, "read", "synthetic_cycle", "allowed", auth.user.id, participant_id)
    db.commit()
    return result


@router.post(
    "/participants/{participant_id}/cycles", response_model=CycleRecordView, status_code=201
)
def create_cycle(
    participant_id: uuid.UUID,
    payload: CycleWrite,
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: Session = Depends(get_db),
    key: str = Depends(idempotency_header),
):
    require_csrf(request, auth, db, "create", "synthetic_cycle", participant_id)
    authorized_participant(
        db,
        auth,
        participant_id,
        action="create",
        allowed_roles=WRITE_ROLES,
        audit_success=False,
        lock_for_write=True,
    )
    if not has_current_synthetic_consent(db, participant_id):
        raise HTTPException(status_code=403, detail="synthetic consent required")
    row_id, fresh = reserve_write(db, auth.user.id, f"cycle:{participant_id}", key, payload)
    if not fresh:
        return db.get(SyntheticCycle, row_id)
    if db.scalar(
        select(SyntheticCycle.id).where(
            SyntheticCycle.participant_id == participant_id, SyntheticCycle.label == payload.label
        )
    ):
        raise HTTPException(status_code=409, detail="cycle label already used")
    row = SyntheticCycle(
        id=row_id, participant_id=participant_id, label=payload.label, created_by=auth.user.id
    )
    db.add(row)
    audit(db, "create", "synthetic_cycle", "allowed", auth.user.id, row_id)
    db.commit()
    db.refresh(row)
    return row


@router.post("/cycles/{cycle_id}/visits", response_model=VisitView, status_code=201)
def create_visit(
    cycle_id: uuid.UUID,
    payload: VisitWrite,
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: Session = Depends(get_db),
    key: str = Depends(idempotency_header),
):
    return write_visit(cycle_id, None, payload, request, auth, db, key)


@router.post("/cycles/{cycle_id}/visits/{visit_id}", response_model=VisitView, status_code=201)
def revise_visit(
    cycle_id: uuid.UUID,
    visit_id: uuid.UUID,
    payload: VisitWrite,
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: Session = Depends(get_db),
    key: str = Depends(idempotency_header),
):
    return write_visit(cycle_id, visit_id, payload, request, auth, db, key)


def write_visit(
    cycle_id: uuid.UUID,
    visit_id: uuid.UUID | None,
    payload: VisitWrite,
    request: Request,
    auth: AuthContext,
    db: Session,
    key: str,
):
    require_csrf(request, auth, db, "revise" if visit_id else "create", "synthetic_visit", cycle_id)
    cycle = scoped_cycle(db, auth, cycle_id, write=True)
    if not has_current_synthetic_consent(db, cycle.participant_id):
        raise HTTPException(status_code=403, detail="synthetic consent required")
    if (payload.assessment_state == "recorded") != (payload.assessment_id is not None):
        raise HTTPException(status_code=422, detail="assessment state and link disagree")
    if payload.assessment_id:
        assessment = db.get(Assessment, payload.assessment_id)
        if assessment is None or assessment.participant_id != cycle.participant_id:
            raise HTTPException(status_code=403, detail="access denied")
    if len(set(payload.training_session_ids)) != len(payload.training_session_ids):
        raise HTTPException(status_code=422, detail="duplicate training link")
    for session_id in payload.training_session_ids:
        session = db.get(TrainingSession, session_id)
        if session is None or session.participant_id != cycle.participant_id:
            raise HTTPException(status_code=403, detail="access denied")
    row_id, fresh = reserve_write(
        db, auth.user.id, f"visit:{cycle_id}:{visit_id or 'new'}", key, payload
    )
    if not fresh:
        return db.get(SyntheticVisitRevision, row_id)
    if visit_id is None:
        if payload.expected_revision != 0 or payload.change_reason:
            raise HTTPException(status_code=422, detail="new visit requires revision zero")
        visit_id, current = row_id, 0
    else:
        previous = db.scalar(
            select(SyntheticVisitRevision)
            .where(
                SyntheticVisitRevision.visit_id == visit_id,
                SyntheticVisitRevision.cycle_id == cycle_id,
            )
            .order_by(SyntheticVisitRevision.revision_no.desc())
            .limit(1)
        )
        if previous is None:
            raise HTTPException(status_code=403, detail="access denied")
        current = previous.revision_no
        if not payload.change_reason:
            raise HTTPException(status_code=422, detail="correction reason required")
    if payload.expected_revision != current:
        raise HTTPException(status_code=409, detail="stale visit revision")
    row = SyntheticVisitRevision(
        id=row_id,
        visit_id=visit_id,
        cycle_id=cycle_id,
        revision_no=current + 1,
        label=payload.label,
        attendance=payload.attendance,
        assessment_state=payload.assessment_state,
        assessment_id=payload.assessment_id,
        training_session_ids=[str(item) for item in payload.training_session_ids],
        change_reason=payload.change_reason,
        recorded_by=auth.user.id,
    )
    db.add(row)
    audit(
        db, "revise" if current else "create", "synthetic_visit", "allowed", auth.user.id, visit_id
    )
    db.commit()
    db.refresh(row)
    return row
