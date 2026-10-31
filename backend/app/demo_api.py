"""Scoped, persisted synthetic training demo; never a clinical prescription."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api import AuthContext, audit, authorized_participant, current_auth, require_csrf
from app.db import get_db
from app.demo_rule import RULE_VERSION, demo_grade
from app.demo_schemas import DemoActionView, DemoEnd, DemoPlanView, DemoRunView, DemoStart, DemoStep
from app.intake import reserve_write
from app.intake_api import READ_ROLES, WRITE_ROLES, idempotency_header
from app.models import (
    Assessment,
    AssessmentRevision,
    DemoAction,
    DemoGradeResult,
    DemoRun,
    TrainingFeedbackRevision,
    TrainingSession,
    WriteReceipt,
    utc_now,
)
from app.training import has_current_synthetic_consent

router = APIRouter(prefix="/api/v1")
ACTIVE = ("in_progress", "paused", "awaiting_feedback")


def latest_grade(db: Session, participant_id: uuid.UUID) -> DemoGradeResult | None:
    revision = db.scalar(
        select(AssessmentRevision)
        .join(Assessment, Assessment.id == AssessmentRevision.assessment_id)
        .where(Assessment.participant_id == participant_id, AssessmentRevision.state == "confirmed")
        .order_by(AssessmentRevision.recorded_at.desc(), AssessmentRevision.id.desc())
        .limit(1)
    )
    if revision is None:
        return None
    result = db.scalar(
        select(DemoGradeResult).where(DemoGradeResult.assessment_revision_id == revision.id)
    )
    if result is None:
        functional_grade, mode = demo_grade(revision.raw_value, valid=revision.validity == "valid")
        result = DemoGradeResult(
            assessment_revision_id=revision.id,
            rule_version=RULE_VERSION,
            functional_grade=functional_grade,
            demo_training_mode=mode,
            evidence={
                "marker": "DEMO_RULE",
                "validity": revision.validity,
                "sppb_total": revision.raw_value if revision.validity == "valid" else None,
                "assessment_id": str(revision.assessment_id),
            },
        )
        db.add(result)
        db.flush()
    return result


def actions_for_grade(db: Session, grade: str | None) -> list[DemoAction]:
    if grade not in ("I", "II", "III"):
        return []
    return list(
        db.scalars(
            select(DemoAction)
            .where(DemoAction.enabled.is_(True), DemoAction.demo_grade == grade)
            .order_by(DemoAction.display_order, DemoAction.id)
        ).all()
    )


def current_run(db: Session, participant_id: uuid.UUID) -> DemoRun | None:
    return db.scalar(
        select(DemoRun)
        .where(DemoRun.participant_id == participant_id, DemoRun.status.in_(ACTIVE))
        .order_by(DemoRun.started_at.desc(), DemoRun.id.desc())
        .limit(1)
    )


def scoped_run(db: Session, auth: AuthContext, run_id: uuid.UUID, *, write: bool) -> DemoRun:
    row = db.get(DemoRun, run_id)
    if row is None:
        raise HTTPException(status_code=403, detail="access denied")
    authorized_participant(
        db,
        auth,
        row.participant_id,
        action="demo_run",
        allowed_roles=WRITE_ROLES if write else READ_ROLES,
        audit_success=False,
        lock_for_write=write,
    )
    if write:
        row = db.scalar(select(DemoRun).where(DemoRun.id == run_id).with_for_update())
    return row


def require_demo_consent(db: Session, participant_id: uuid.UUID) -> None:
    if not has_current_synthetic_consent(db, participant_id):
        raise HTTPException(status_code=403, detail="synthetic consent required")


@router.get("/participants/{participant_id}/demo-plan", response_model=DemoPlanView)
def get_demo_plan(
    participant_id: uuid.UUID,
    auth: AuthContext = Depends(current_auth),
    db: Session = Depends(get_db),
) -> DemoPlanView:
    authorized_participant(
        db, auth, participant_id, action="read", allowed_roles=READ_ROLES, audit_success=False
    )
    grade = latest_grade(db, participant_id)
    actions = actions_for_grade(db, grade.functional_grade if grade else None)
    run = current_run(db, participant_id)
    audit(db, "read", "demo_plan", "allowed", auth.user.id, participant_id)
    db.commit()
    return DemoPlanView(
        participant_id=participant_id,
        grade=grade,
        actions=[DemoActionView.model_validate(item) for item in actions],
        current_run=run,
    )


@router.get("/demo-actions", response_model=list[DemoActionView])
def list_demo_actions(
    auth: AuthContext = Depends(current_auth),
    db: Session = Depends(get_db),
) -> list[DemoAction]:
    if auth.user.role not in READ_ROLES:
        raise HTTPException(status_code=403, detail="access denied")
    return list(
        db.scalars(
            select(DemoAction)
            .where(DemoAction.enabled.is_(True))
            .order_by(DemoAction.display_order, DemoAction.id)
        ).all()
    )


@router.get("/demo-runs/{run_id}", response_model=DemoRunView)
def get_demo_run(
    run_id: uuid.UUID,
    auth: AuthContext = Depends(current_auth),
    db: Session = Depends(get_db),
) -> DemoRun:
    row = scoped_run(db, auth, run_id, write=False)
    audit(db, "read", "demo_run", "allowed", auth.user.id, run_id)
    db.commit()
    return row


@router.post("/participants/{participant_id}/demo-runs", response_model=DemoRunView)
def start_demo_run(
    participant_id: uuid.UUID,
    payload: DemoStart,
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: Session = Depends(get_db),
    key: str = Depends(idempotency_header),
) -> DemoRun:
    require_csrf(request, auth, db, "start", "demo_run", participant_id)
    authorized_participant(
        db,
        auth,
        participant_id,
        action="start",
        allowed_roles=WRITE_ROLES,
        audit_success=False,
        lock_for_write=True,
    )
    require_demo_consent(db, participant_id)
    run_id, fresh = reserve_write(
        db, auth.user.id, f"demo_run:create:{participant_id}", key, payload
    )
    if not fresh:
        existing = db.get(DemoRun, run_id)
        if existing is None:
            raise HTTPException(status_code=503, detail="receipt target missing")
        return existing
    active = current_run(db, participant_id)
    if active:
        receipt = db.get(WriteReceipt, (auth.user.id, f"demo_run:create:{participant_id}", key))
        receipt.resource_id = active.id
        db.commit()
        return active
    grade = latest_grade(db, participant_id)
    actions = actions_for_grade(db, grade.functional_grade if grade else None)
    if grade is None or not actions:
        raise HTTPException(status_code=422, detail="no autonomous Demo plan")
    row = DemoRun(
        id=run_id,
        participant_id=participant_id,
        grade_result_id=grade.id,
        status="in_progress",
        action_ids=[action.id for action in actions],
        created_by=auth.user.id,
    )
    db.add(row)
    db.flush()
    audit(db, "start", "demo_run", "allowed", auth.user.id, row.id)
    db.commit()
    db.refresh(row)
    return row


@router.post("/demo-runs/{run_id}/step", response_model=DemoRunView)
def step_demo_run(
    run_id: uuid.UUID,
    payload: DemoStep,
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: Session = Depends(get_db),
) -> DemoRun:
    require_csrf(request, auth, db, "step", "demo_run", run_id)
    row = scoped_run(db, auth, run_id, write=True)
    require_demo_consent(db, row.participant_id)
    if row.status != payload.expected_status:
        raise HTTPException(status_code=409, detail="stale Demo run status")
    if payload.action == "pause" and row.status == "in_progress":
        row.status = "paused"
    elif payload.action == "resume" and row.status == "paused":
        row.status = "in_progress"
    elif payload.action == "next" and row.status == "in_progress":
        row.current_index = min(row.current_index + 1, len(row.action_ids) - 1)
    elif payload.action == "previous" and row.status == "in_progress":
        row.current_index = max(row.current_index - 1, 0)
    else:
        raise HTTPException(status_code=422, detail="invalid Demo transition")
    audit(db, "step", "demo_run", "allowed", auth.user.id, run_id)
    db.commit()
    return row


@router.post("/demo-runs/{run_id}/end", response_model=DemoRunView)
def end_demo_run(
    run_id: uuid.UUID,
    payload: DemoEnd,
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: Session = Depends(get_db),
) -> DemoRun:
    require_csrf(request, auth, db, "end", "demo_run", run_id)
    row = scoped_run(db, auth, run_id, write=True)
    require_demo_consent(db, row.participant_id)
    if row.status == "awaiting_feedback" and row.training_session_id:
        existing = db.get(TrainingSession, row.training_session_id)
        if (
            existing.actual_minutes != payload.actual_minutes
            or existing.completion_status != payload.completion_status
            or existing.notes != payload.notes
            or row.completed_action_ids != payload.completed_action_ids
        ):
            raise HTTPException(status_code=409, detail="Demo end payload differs")
        return row
    if row.status not in ("in_progress", "paused"):
        raise HTTPException(status_code=409, detail="Demo run already ended")
    if payload.completed_action_ids is not None and (
        len(payload.completed_action_ids) != len(set(payload.completed_action_ids))
        or not set(payload.completed_action_ids).issubset(row.action_ids)
    ):
        raise HTTPException(
            status_code=422, detail="completed actions must belong to this Demo run"
        )
    session = TrainingSession(
        participant_id=row.participant_id,
        session_at=row.started_at,
        action_label="、".join(row.action_ids)[:120],
        actual_minutes=payload.actual_minutes,
        completion_status=payload.completion_status,
        notes=payload.notes,
        source="manual_staff_entry",
        recorded_by=auth.user.id,
    )
    db.add(session)
    db.flush()
    row.training_session_id = session.id
    row.completed_action_ids = payload.completed_action_ids
    row.ended_at = utc_now()
    row.status = "awaiting_feedback"
    audit(db, "end", "demo_run", "allowed", auth.user.id, run_id)
    db.commit()
    return row


@router.post("/demo-runs/{run_id}/complete", response_model=DemoRunView)
def complete_demo_run(
    run_id: uuid.UUID,
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: Session = Depends(get_db),
) -> DemoRun:
    require_csrf(request, auth, db, "complete", "demo_run", run_id)
    row = scoped_run(db, auth, run_id, write=True)
    if row.status == "completed":
        return row
    if row.status != "awaiting_feedback" or row.training_session_id is None:
        raise HTTPException(status_code=409, detail="end Demo run before completion")
    feedback = db.scalar(
        select(TrainingFeedbackRevision.id)
        .where(TrainingFeedbackRevision.session_id == row.training_session_id)
        .limit(1)
    )
    if feedback is None:
        raise HTTPException(status_code=422, detail="feedback required")
    row.status = "completed"
    audit(db, "complete", "demo_run", "allowed", auth.user.id, run_id)
    db.commit()
    return row


@router.post("/demo-runs/{run_id}/stop", response_model=DemoRunView)
def stop_demo_run(
    run_id: uuid.UUID,
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: Session = Depends(get_db),
) -> DemoRun:
    require_csrf(request, auth, db, "stop", "demo_run", run_id)
    row = scoped_run(db, auth, run_id, write=True)
    if row.status == "stopped":
        return row
    if row.status not in ("in_progress", "paused"):
        raise HTTPException(status_code=409, detail="Demo run cannot be stopped")
    session = TrainingSession(
        participant_id=row.participant_id,
        session_at=row.started_at,
        action_label="、".join(row.action_ids)[:120],
        actual_minutes=None,
        completion_status="interrupted",
        notes=None,
        source="manual_staff_entry",
        recorded_by=auth.user.id,
    )
    db.add(session)
    db.flush()
    row.training_session_id = session.id
    row.ended_at = utc_now()
    row.status = "stopped"
    audit(db, "stop", "demo_run", "allowed", auth.user.id, run_id)
    db.commit()
    return row
