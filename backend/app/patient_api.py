"""Synthetic-only patient home and clinician revocation boundary."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api import AuthContext, audit, authorized_participant, current_auth, require_csrf
from app.db import get_db
from app.models import DemoPatientBinding, LoginSession, Participant, utc_now
from app.runtime import require_demo

router = APIRouter(prefix="/api/v1", dependencies=[Depends(require_demo)])


class PatientHomeView(BaseModel):
    study_code: str


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
    audit(db, "read", "patient_home", "allowed", auth.user.id, row.id)
    db.commit()
    return PatientHomeView(study_code=row.study_code)


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
