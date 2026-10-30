"""Staff session and coded-scope API."""

import os
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import (
    AuditEvent,
    LoginSession,
    Participant,
    ParticipantAssignment,
    Study,
    StudyAssignment,
    User,
)
from app.schemas import LoginRequest, ParticipantView, StudyView, UserView
from app.security import (
    RATE_FAILURES,
    SESSION_HOURS,
    clear_login_failures,
    cookie_settings,
    csrf_cookie_name,
    issue_session,
    lookup_session,
    rate_key,
    record_login_attempt,
    session_cookie_name,
    valid_csrf,
    verify_password,
)

router = APIRouter(prefix="/api/v1")
READ_ROLES = {"clinician", "clinical_approver", "research_assistant"}


@dataclass(frozen=True)
class AuthContext:
    user: User
    login_session: LoginSession


def audit(
    db: Session,
    action: str,
    resource_type: str,
    outcome: str,
    actor_id: uuid.UUID | None = None,
    resource_id: uuid.UUID | None = None,
) -> None:
    db.add(
        AuditEvent(
            actor_id=actor_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            outcome=outcome,
        )
    )


def current_auth(request: Request, db: Session = Depends(get_db)) -> AuthContext:
    result = lookup_session(db, request.cookies.get(session_cookie_name()))
    if result is None:
        raise HTTPException(status_code=401, detail="authentication required")
    session, user = result
    return AuthContext(user=user, login_session=session)


def check_origin(request: Request) -> None:
    origin = request.headers.get("origin")
    allowed = os.environ.get("APP_PUBLIC_URL", "http://localhost:3000")
    if origin and origin.rstrip("/") != allowed.rstrip("/"):
        raise HTTPException(status_code=403, detail="origin denied")


@router.post("/auth/login", response_model=UserView)
def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
) -> UserView:
    check_origin(request)
    email = str(payload.email).lower()
    client_host = request.client.host if request.client else "unknown"
    key = rate_key(email, client_host)
    if record_login_attempt(db, key) > RATE_FAILURES:
        audit(db, "login", "session", "rate_limited")
        db.commit()
        raise HTTPException(status_code=429, detail="too many attempts")
    user = db.scalar(select(User).where(User.email == email))
    if not verify_password(payload.password, user) or user is None or not user.is_active:
        audit(db, "login", "session", "denied")
        db.commit()
        raise HTTPException(status_code=401, detail="invalid credentials")

    clear_login_failures(db, key)
    token, csrf, _ = issue_session(db, user)
    audit(db, "login", "session", "allowed", actor_id=user.id)
    db.commit()
    settings = cookie_settings()
    response.set_cookie(session_cookie_name(), token, max_age=SESSION_HOURS * 3600, **settings)
    response.set_cookie(
        csrf_cookie_name(),
        csrf,
        max_age=SESSION_HOURS * 3600,
        **{**settings, "httponly": False},
    )
    return UserView(id=user.id, email=user.email, role=user.role)


@router.get("/auth/me", response_model=UserView)
def me(auth: AuthContext = Depends(current_auth)) -> UserView:
    return UserView(id=auth.user.id, email=auth.user.email, role=auth.user.role)


@router.post("/auth/logout", status_code=204)
def logout(
    request: Request,
    response: Response,
    auth: AuthContext = Depends(current_auth),
    db: Session = Depends(get_db),
) -> None:
    check_origin(request)
    if not valid_csrf(
        auth.login_session,
        request.headers.get("x-csrf-token"),
        request.cookies.get(csrf_cookie_name()),
    ):
        audit(db, "logout", "session", "denied", actor_id=auth.user.id)
        db.commit()
        raise HTTPException(status_code=403, detail="CSRF token required")
    auth.login_session.revoked_at = datetime.now(timezone.utc)
    audit(db, "logout", "session", "allowed", actor_id=auth.user.id)
    db.commit()
    response.delete_cookie(session_cookie_name(), path="/")
    response.delete_cookie(csrf_cookie_name(), path="/")


@router.get("/studies", response_model=list[StudyView])
def studies(
    auth: AuthContext = Depends(current_auth), db: Session = Depends(get_db)
) -> list[StudyView]:
    rows = db.scalars(
        select(Study)
        .join(StudyAssignment, StudyAssignment.study_id == Study.id)
        .where(StudyAssignment.user_id == auth.user.id)
        .order_by(Study.code)
    ).all()
    return [StudyView(id=row.id, code=row.code) for row in rows]


def authorized_participant(
    db: Session, auth: AuthContext, participant_id: uuid.UUID
) -> Participant:
    if auth.user.role not in READ_ROLES:
        audit(db, "read", "participant", "denied", auth.user.id, participant_id)
        db.commit()
        raise HTTPException(status_code=403, detail="access denied")
    participant = db.scalar(
        select(Participant)
        .join(StudyAssignment, StudyAssignment.study_id == Participant.study_id)
        .join(
            ParticipantAssignment,
            ParticipantAssignment.participant_id == Participant.id,
        )
        .where(
            Participant.id == participant_id,
            StudyAssignment.user_id == auth.user.id,
            ParticipantAssignment.user_id == auth.user.id,
        )
    )
    if participant is None:
        audit(db, "read", "participant", "denied", auth.user.id, participant_id)
        db.commit()
        raise HTTPException(status_code=403, detail="access denied")
    audit(db, "read", "participant", "allowed", auth.user.id, participant_id)
    db.commit()
    return participant


@router.get("/participants/{participant_id}", response_model=ParticipantView)
def get_participant(
    participant_id: uuid.UUID,
    auth: AuthContext = Depends(current_auth),
    db: Session = Depends(get_db),
) -> ParticipantView:
    row = authorized_participant(db, auth, participant_id)
    return ParticipantView(id=row.id, study_id=row.study_id, study_code=row.study_code)
