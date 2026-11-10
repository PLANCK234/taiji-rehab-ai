"""Synthetic-only patient home and clinician revocation boundary."""

import uuid
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api import AuthContext, audit, authorized_participant, current_auth, require_csrf
from app.db import get_db
from app.intake import reserve_write
from app.intake_api import READ_ROLES, idempotency_header
from app.models import (
    DemoPatientBinding,
    DemoPatientPublication,
    LoginSession,
    Participant,
    utc_now,
)
from app.patient_publication import (
    CARD_OPTIONS,
    LEGACY_CARD_TITLE,
    MARKER,
    MESSAGE,
    VIDEO_STATUS,
    active_binding,
    latest_publication,
)
from app.runtime import require_demo
from app.training import has_current_synthetic_consent

router = APIRouter(prefix="/api/v1", dependencies=[Depends(require_demo)])


class PublicationView(BaseModel):
    version: int
    state: Literal["published", "withdrawn"]
    marker: str
    message: str
    video_status: Literal["awaiting_review"]
    card_code: str | None
    card_title: str


class CardOptionView(BaseModel):
    code: str
    title: str


class PatientHomeView(BaseModel):
    study_code: str
    publication: PublicationView | None = None


class PublicationWrite(BaseModel):
    model_config = ConfigDict(extra="forbid")

    operation: Literal["publish", "withdraw"]
    expected_version: int = Field(ge=0)
    synthetic_only_acknowledged: Literal[True]
    card_code: Literal["SYN-CARD-A", "SYN-CARD-B"] | None = None
    selection_confirmed: bool = False


def publication_view(row: DemoPatientPublication) -> PublicationView:
    return PublicationView(
        version=row.version, state=row.state, marker=row.marker,
        message=MESSAGE, video_status=VIDEO_STATUS,
        card_code=row.card_code,
        card_title=row.card_title or LEGACY_CARD_TITLE,
    )


@router.get(
    "/participants/{participant_id}/demo-patient-card-options",
    response_model=list[CardOptionView],
)
def card_options(
    participant_id: uuid.UUID,
    auth: AuthContext = Depends(current_auth),
    db: Session = Depends(get_db),
) -> list[CardOptionView]:
    authorized_participant(
        db, auth, participant_id, action="read", allowed_roles={"clinician"},
        audit_success=False,
    )
    audit(db, "read", "demo_patient_card_options", "allowed", auth.user.id, participant_id)
    db.commit()
    return [CardOptionView(code=code, title=title) for code, title in CARD_OPTIONS.items()]


@router.get("/patient/me", response_model=PatientHomeView)
def patient_home(
    auth: AuthContext = Depends(current_auth), db: Session = Depends(get_db)
) -> PatientHomeView:
    if auth.user.role != "patient":
        raise HTTPException(status_code=403, detail="access denied")
    row = db.scalar(
        select(Participant)
        .join(DemoPatientBinding, DemoPatientBinding.participant_id == Participant.id)
        .where(
            DemoPatientBinding.user_id == auth.user.id,
            DemoPatientBinding.revoked_at.is_(None),
            Participant.study_code.startswith("SYN-"),
        )
    )
    if row is None:
        audit(db, "read", "patient_home", "denied", auth.user.id)
        db.commit()
        raise HTTPException(status_code=403, detail="access denied")
    latest = latest_publication(db, row.id)
    visible = (
        publication_view(latest)
        if latest is not None and latest.state == "published"
        and has_current_synthetic_consent(db, row.id)
        else None
    )
    audit(db, "read", "patient_home", "allowed", auth.user.id, row.id)
    db.commit()
    return PatientHomeView(study_code=row.study_code, publication=visible)


@router.get(
    "/participants/{participant_id}/demo-patient-publications",
    response_model=list[PublicationView],
)
def publication_history(
    participant_id: uuid.UUID,
    auth: AuthContext = Depends(current_auth),
    db: Session = Depends(get_db),
) -> list[PublicationView]:
    authorized_participant(
        db, auth, participant_id, action="read", allowed_roles=READ_ROLES,
        audit_success=False,
    )
    rows = db.scalars(
        select(DemoPatientPublication)
        .where(DemoPatientPublication.participant_id == participant_id)
        .order_by(DemoPatientPublication.version)
    ).all()
    audit(db, "read", "demo_patient_publication", "allowed", auth.user.id, participant_id)
    db.commit()
    return [publication_view(row) for row in rows]


@router.post(
    "/participants/{participant_id}/demo-patient-publications",
    response_model=PublicationView, status_code=201,
)
def record_publication(
    participant_id: uuid.UUID,
    payload: PublicationWrite,
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: Session = Depends(get_db),
    key: str = Depends(idempotency_header),
) -> PublicationView:
    require_csrf(request, auth, db, payload.operation, "demo_patient_publication", participant_id)
    participant = authorized_participant(
        db, auth, participant_id, action=payload.operation, allowed_roles={"clinician"},
        audit_success=False, lock_for_write=True,
    )
    if not participant.study_code.startswith("SYN-"):
        raise HTTPException(status_code=403, detail="synthetic participant required")
    event_id, fresh = reserve_write(
        db, auth.user.id, f"patient_publication:{participant_id}", key, payload
    )
    if not fresh:
        existing = db.get(DemoPatientPublication, event_id)
        if existing is None:
            raise HTTPException(status_code=503, detail="receipt target missing")
        return publication_view(existing)
    previous = latest_publication(db, participant_id)
    version = previous.version if previous is not None else 0
    if payload.expected_version != version:
        raise HTTPException(status_code=409, detail="publication version changed")
    if payload.operation == "publish":
        if payload.card_code is not None and not payload.selection_confirmed:
            raise HTTPException(status_code=422, detail="synthetic selection confirmation required")
        if not active_binding(db, participant_id) or not has_current_synthetic_consent(
            db, participant_id
        ):
            raise HTTPException(status_code=403, detail="active demo binding and consent required")
    elif previous is None or previous.state != "published":
        raise HTTPException(status_code=409, detail="no published card to withdraw")
    row = DemoPatientPublication(
        id=event_id, participant_id=participant_id, version=version + 1,
        state="published" if payload.operation == "publish" else "withdrawn",
        marker=MARKER, recorded_by=auth.user.id,
        card_code=payload.card_code if payload.operation == "publish" else previous.card_code,
        card_title=(
            CARD_OPTIONS[payload.card_code] if payload.card_code is not None
            else LEGACY_CARD_TITLE
        ) if payload.operation == "publish" else previous.card_title,
    )
    db.add(row)
    audit(
        db, payload.operation, "demo_patient_publication", "allowed",
        auth.user.id, participant_id,
    )
    db.commit()
    return publication_view(row)


@router.post("/participants/{participant_id}/demo-patient-binding/revoke", status_code=204)
def revoke_patient_binding(
    participant_id: uuid.UUID,
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: Session = Depends(get_db),
) -> None:
    require_csrf(request, auth, db, "revoke", "demo_patient_binding", participant_id)
    authorized_participant(
        db, auth, participant_id, action="revoke", allowed_roles={"clinician"},
        audit_success=False, lock_for_write=True,
    )
    binding = db.scalar(
        select(DemoPatientBinding).where(
            DemoPatientBinding.participant_id == participant_id,
            DemoPatientBinding.revoked_at.is_(None),
        ).with_for_update()
    )
    if binding is None:
        raise HTTPException(status_code=404, detail="active binding not found")
    binding.revoked_at = utc_now()
    for session in db.scalars(
        select(LoginSession).where(
            LoginSession.user_id == binding.user_id,
            LoginSession.revoked_at.is_(None),
        )
    ):
        session.revoked_at = utc_now()
    audit(db, "revoke", "demo_patient_binding", "allowed", auth.user.id, participant_id)
    db.commit()
