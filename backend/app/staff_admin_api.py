"""Synthetic-only staff administration; never imports real identities."""

import uuid
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api import AuthContext, audit, current_auth, require_csrf
from app.db import get_db
from app.intake import reserve_write
from app.intake_api import idempotency_header
from app.models import (
    LoginSession,
    Participant,
    ParticipantAssignment,
    Study,
    StudyAssignment,
    SyntheticStaffChange,
    User,
    utc_now,
)
from app.runtime import require_demo
from app.security import password_hash

router = APIRouter(prefix="/api/v1/admin", dependencies=[Depends(require_demo)])
StaffRole = Literal["clinician", "clinical_approver", "research_assistant", "analyst"]


class StaffCreate(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    email: str = Field(min_length=8, max_length=320, pattern=r"^demo-[a-z0-9._+-]+@example\.org$")
    role: StaffRole
    password: str = Field(min_length=12, max_length=128)

    @field_validator("email")
    @classmethod
    def lowercase_email(cls, value: str) -> str:
        if value != value.lower():
            raise ValueError("synthetic email must be lowercase")
        return value


class StaffChange(BaseModel):
    model_config = ConfigDict(extra="forbid")
    operation: Literal["activate", "deactivate", "role"]
    expected_role: StaffRole
    expected_active: bool
    role: StaffRole | None = None

    @model_validator(mode="after")
    def check_role(self) -> "StaffChange":
        if (self.operation == "role") != (self.role is not None):
            raise ValueError("role is required only for role change")
        return self


class AssignmentChange(BaseModel):
    model_config = ConfigDict(extra="forbid")
    scope: Literal["study", "participant"]
    scope_id: uuid.UUID
    operation: Literal["grant", "revoke"]
    expected_assigned: bool


def require_admin(db: Session, auth: AuthContext, action: str) -> None:
    if auth.user.role != "admin":
        audit(db, action, "synthetic_staff_admin", "denied", auth.user.id)
        db.commit()
        raise HTTPException(status_code=403, detail="access denied")


def staff_user(db: Session, user_id: uuid.UUID) -> User:
    row = db.scalar(select(User).where(User.id == user_id).with_for_update())
    if (
        row is None
        or not row.email.startswith("demo-")
        or not row.email.endswith("@example.org")
        or row.role in {"admin", "patient"}
    ):
        raise HTTPException(status_code=403, detail="synthetic staff only")
    return row


def staff_view(db: Session, row: User) -> dict:
    studies = db.scalars(
        select(StudyAssignment.study_id).where(StudyAssignment.user_id == row.id)
    ).all()
    participants = db.scalars(
        select(ParticipantAssignment.participant_id).where(ParticipantAssignment.user_id == row.id)
    ).all()
    return {
        "id": row.id,
        "email": row.email,
        "role": row.role,
        "is_active": row.is_active,
        "study_ids": list(studies),
        "participant_ids": list(participants),
    }


@router.get("/scope")
def scope(auth: AuthContext = Depends(current_auth), db: Session = Depends(get_db)):
    require_admin(db, auth, "read")
    studies = db.scalars(
        select(Study).where(Study.code.startswith("SYN-")).order_by(Study.code)
    ).all()
    participants = db.scalars(
        select(Participant)
        .where(Participant.study_code.startswith("SYN-"))
        .order_by(Participant.study_code)
    ).all()
    audit(db, "read", "synthetic_staff_scope", "allowed", auth.user.id)
    db.commit()
    return {
        "studies": [{"id": row.id, "code": row.code} for row in studies],
        "participants": [
            {"id": row.id, "study_id": row.study_id, "code": row.study_code} for row in participants
        ],
    }


@router.get("/staff")
def list_staff(auth: AuthContext = Depends(current_auth), db: Session = Depends(get_db)):
    require_admin(db, auth, "read")
    rows = db.scalars(
        select(User)
        .where(
            User.email.startswith("demo-"),
            User.email.endswith("@example.org"),
            User.role.not_in(["admin", "patient"]),
        )
        .order_by(User.email)
    ).all()
    result = [staff_view(db, row) for row in rows]
    audit(db, "read", "synthetic_staff", "allowed", auth.user.id)
    db.commit()
    return result


@router.post("/staff", status_code=201)
def create_staff(
    payload: StaffCreate,
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: Session = Depends(get_db),
    key: str = Depends(idempotency_header),
):
    require_csrf(request, auth, db, "create", "synthetic_staff")
    require_admin(db, auth, "create")
    event_id, fresh = reserve_write(db, auth.user.id, "admin:staff:create", key, payload)
    if not fresh:
        event = db.get(SyntheticStaffChange, event_id)
        if event is None:
            raise HTTPException(status_code=503, detail="receipt target missing")
        return staff_view(db, db.get(User, event.target_user_id))
    if db.scalar(select(User.id).where(User.email == payload.email)):
        raise HTTPException(status_code=409, detail="account already exists")
    row = User(
        email=payload.email, role=payload.role, password_hash=password_hash.hash(payload.password)
    )
    db.add(row)
    db.flush()
    db.add(
        SyntheticStaffChange(
            id=event_id,
            target_user_id=row.id,
            action="create",
            value=payload.role,
            actor_id=auth.user.id,
        )
    )
    audit(db, "create", "synthetic_staff", "allowed", auth.user.id, row.id)
    db.commit()
    return staff_view(db, row)


@router.post("/staff/{user_id}")
def change_staff(
    user_id: uuid.UUID,
    payload: StaffChange,
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: Session = Depends(get_db),
    key: str = Depends(idempotency_header),
):
    require_csrf(request, auth, db, payload.operation, "synthetic_staff", user_id)
    require_admin(db, auth, payload.operation)
    row = staff_user(db, user_id)
    event_id, fresh = reserve_write(db, auth.user.id, f"admin:staff:{user_id}", key, payload)
    if not fresh:
        return staff_view(db, row)
    if row.role != payload.expected_role or row.is_active != payload.expected_active:
        raise HTTPException(status_code=409, detail="staff state changed")
    if payload.operation == "role":
        if row.role == payload.role:
            raise HTTPException(status_code=409, detail="role unchanged")
        row.role = payload.role
    else:
        active = payload.operation == "activate"
        if row.is_active == active:
            raise HTTPException(status_code=409, detail="active state unchanged")
        row.is_active = active
    for session in db.scalars(
        select(LoginSession).where(
            LoginSession.user_id == row.id, LoginSession.revoked_at.is_(None)
        )
    ):
        session.revoked_at = utc_now()
    db.add(
        SyntheticStaffChange(
            id=event_id,
            target_user_id=row.id,
            action=payload.operation,
            value=payload.role,
            actor_id=auth.user.id,
        )
    )
    audit(db, payload.operation, "synthetic_staff", "allowed", auth.user.id, row.id)
    db.commit()
    return staff_view(db, row)


@router.post("/staff/{user_id}/assignments")
def change_assignment(
    user_id: uuid.UUID,
    payload: AssignmentChange,
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: Session = Depends(get_db),
    key: str = Depends(idempotency_header),
):
    require_csrf(request, auth, db, payload.operation, "synthetic_assignment", user_id)
    require_admin(db, auth, payload.operation)
    row = staff_user(db, user_id)
    if not row.is_active and payload.operation == "grant":
        raise HTTPException(status_code=403, detail="inactive staff")
    if payload.scope == "study":
        study = db.get(Study, payload.scope_id)
        if study is None or not study.code.startswith("SYN-"):
            raise HTTPException(status_code=403, detail="synthetic study required")
        assignment = db.get(StudyAssignment, (user_id, study.id))
    else:
        participant = db.get(Participant, payload.scope_id)
        if participant is None or not participant.study_code.startswith("SYN-"):
            raise HTTPException(status_code=403, detail="synthetic participant required")
        if (
            payload.operation == "grant"
            and db.get(StudyAssignment, (user_id, participant.study_id)) is None
        ):
            raise HTTPException(status_code=403, detail="study assignment required")
        assignment = db.get(ParticipantAssignment, (user_id, participant.id))
    event_id, fresh = reserve_write(db, auth.user.id, f"admin:assignment:{user_id}", key, payload)
    if not fresh:
        return staff_view(db, row)
    if (assignment is not None) != payload.expected_assigned:
        raise HTTPException(status_code=409, detail="assignment state changed")
    if (
        payload.operation == "grant"
        and assignment is not None
        or payload.operation == "revoke"
        and assignment is None
    ):
        raise HTTPException(status_code=409, detail="assignment unchanged")
    if payload.operation == "grant":
        db.add(
            StudyAssignment(user_id=user_id, study_id=payload.scope_id)
            if payload.scope == "study"
            else ParticipantAssignment(user_id=user_id, participant_id=payload.scope_id)
        )
    else:
        db.delete(assignment)
    db.add(
        SyntheticStaffChange(
            id=event_id,
            target_user_id=user_id,
            action=f"{payload.scope}_{payload.operation}",
            scope_id=payload.scope_id,
            actor_id=auth.user.id,
        )
    )
    if payload.scope == "study" and payload.operation == "revoke":
        for assigned in db.scalars(
            select(ParticipantAssignment)
            .join(Participant, Participant.id == ParticipantAssignment.participant_id)
            .where(
                ParticipantAssignment.user_id == user_id, Participant.study_id == payload.scope_id
            )
        ):
            db.add(
                SyntheticStaffChange(
                    target_user_id=user_id,
                    action="participant_revoke",
                    scope_id=assigned.participant_id,
                    actor_id=auth.user.id,
                )
            )
            db.delete(assigned)
    audit(db, payload.operation, "synthetic_assignment", "allowed", auth.user.id, user_id)
    db.commit()
    return staff_view(db, row)
