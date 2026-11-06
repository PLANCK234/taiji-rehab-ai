"""Synthetic raw observations, independent of SPPB scoring."""

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, field_validator, model_validator
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api import AuthContext, audit, authorized_participant, current_auth, require_csrf
from app.assessment import latest_consent_granted
from app.db import get_db
from app.intake import reserve_write
from app.intake_api import WRITE_ROLES, idempotency_header
from app.models import ManualObservationRevision
from app.schemas import MissingReason

Metric = Literal["gait_4m_seconds", "sit_to_stand_5_seconds", "tug_seconds", "grip_strength_kg"]


class ObservationWrite(BaseModel):
    model_config = ConfigDict(extra="forbid")
    source: Literal["manual_staff_entry"] = "manual_staff_entry"
    metric_code: Metric
    unit: Literal["s", "kg"]
    raw_value: str | None = Field(default=None, max_length=40)
    validity: Literal["valid", "missing", "invalid"]
    missing_reason: MissingReason | None = None
    performed_at: AwareDatetime | None = None
    side: Literal["left", "right", "unknown"] = "unknown"
    context_note: str | None = Field(default=None, max_length=500)
    expected_revision: int = Field(ge=0)
    change_reason: str | None = Field(default=None, pattern=r"^SYN-[A-Z0-9_-]{3,60}$")

    @field_validator("raw_value")
    @classmethod
    def finite_decimal(cls, value: str | None) -> str | None:
        if value is not None:
            try:
                number = Decimal(value)
            except Exception as exc:
                raise ValueError("decimal string required") from exc
            if not number.is_finite() or value.strip() != value or "_" in value:
                raise ValueError("finite decimal required")
        return value

    @model_validator(mode="after")
    def shape(self):
        if self.unit != ("kg" if self.metric_code == "grip_strength_kg" else "s"):
            raise ValueError("metric unit mismatch")
        if self.metric_code != "grip_strength_kg" and self.side != "unknown":
            raise ValueError("side applies only to grip")
        if self.validity == "valid" and (
            self.raw_value is None or self.performed_at is None or self.missing_reason is not None
        ):
            raise ValueError("valid observation requires value/time")
        if self.validity == "missing" and (
            self.raw_value is not None
            or self.performed_at is not None
            or self.missing_reason is None
        ):
            raise ValueError("missing observation requires reason without value/time")
        if self.validity == "invalid" and self.missing_reason is None:
            raise ValueError("invalid observation requires reason")
        if self.expected_revision > 0 and self.change_reason is None:
            raise ValueError("correction reason required")
        return self


class ObservationView(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    observation_id: uuid.UUID
    participant_id: uuid.UUID
    revision_no: int
    snapshot: ObservationWrite
    recorded_by: uuid.UUID
    recorded_at: datetime


router = APIRouter(prefix="/api/v1/participants/{participant_id}/manual-observations")


@router.get("", response_model=list[ObservationView])
def read(
    participant_id: uuid.UUID,
    auth: AuthContext = Depends(current_auth),
    db: Session = Depends(get_db),
):
    authorized_participant(db, auth, participant_id)
    return db.scalars(
        select(ManualObservationRevision)
        .where(ManualObservationRevision.participant_id == participant_id)
        .order_by(ManualObservationRevision.recorded_at, ManualObservationRevision.revision_no)
    ).all()


@router.post("", response_model=ObservationView, status_code=201)
@router.post("/{observation_id}", response_model=ObservationView, status_code=201)
def write(
    participant_id: uuid.UUID,
    payload: ObservationWrite,
    request: Request,
    observation_id: uuid.UUID | None = None,
    auth: AuthContext = Depends(current_auth),
    db: Session = Depends(get_db),
    key: str = Depends(idempotency_header),
):
    require_csrf(request, auth, db, "record", "manual_observation", participant_id)
    authorized_participant(
        db,
        auth,
        participant_id,
        action="record",
        allowed_roles=WRITE_ROLES,
        audit_success=False,
        lock_for_write=True,
    )
    if not latest_consent_granted(db, participant_id):
        raise HTTPException(403, "synthetic consent required")
    event_id, fresh = reserve_write(
        db,
        auth.user.id,
        f"raw:{'edit' if observation_id else 'create'}:{observation_id or participant_id}",
        key,
        payload,
    )
    if not fresh:
        return db.get(ManualObservationRevision, event_id)
    latest = None
    if observation_id is not None:
        latest = db.scalar(
            select(ManualObservationRevision)
            .where(
                ManualObservationRevision.observation_id == observation_id,
                ManualObservationRevision.participant_id == participant_id,
            )
            .order_by(ManualObservationRevision.revision_no.desc())
            .limit(1)
        )
        if latest is None:
            raise HTTPException(403, "access denied")
        if latest.snapshot["metric_code"] != payload.metric_code:
            raise HTTPException(409, "metric is immutable")
    revision = latest.revision_no if latest else 0
    if revision != payload.expected_revision:
        raise HTTPException(409, "revision changed")
    row = ManualObservationRevision(
        id=event_id,
        observation_id=observation_id or uuid.uuid4(),
        participant_id=participant_id,
        revision_no=revision + 1,
        snapshot=payload.model_dump(mode="json"),
        recorded_by=auth.user.id,
    )
    db.add(row)
    audit(db, "record", "manual_observation", "allowed", auth.user.id, participant_id)
    db.commit()
    return row
