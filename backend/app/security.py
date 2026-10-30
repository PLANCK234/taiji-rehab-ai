"""Password, opaque session, CSRF and login-rate primitives."""

import hashlib
import hmac
import os
import secrets
from datetime import datetime, timedelta, timezone

from pwdlib import PasswordHash
from sqlalchemy import case, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from app.models import LoginRateLimit, LoginSession, User

password_hash = PasswordHash.recommended()
_dummy_hash = password_hash.hash("invalid-password-for-timing")
SESSION_HOURS = 8
RATE_WINDOW = timedelta(minutes=15)
RATE_FAILURES = 5


def aware(value: datetime) -> datetime:
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


def secret() -> bytes:
    value = os.environ.get("SESSION_SECRET", "")
    if len(value) < 32:
        raise RuntimeError("SESSION_SECRET must be at least 32 characters")
    return value.encode()


def digest(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()


def rate_key(email: str, client_host: str) -> str:
    return hmac.new(secret(), f"{email}|{client_host}".encode(), hashlib.sha256).hexdigest()


def verify_password(password: str, user: User | None) -> bool:
    return password_hash.verify(password, user.password_hash if user else _dummy_hash)


def issue_session(db: Session, user: User) -> tuple[str, str, LoginSession]:
    token, csrf = secrets.token_urlsafe(32), secrets.token_urlsafe(32)
    row = LoginSession(
        user_id=user.id,
        token_hash=digest(token),
        csrf_hash=digest(csrf),
        expires_at=datetime.now(timezone.utc) + timedelta(hours=SESSION_HOURS),
    )
    db.add(row)
    db.flush()
    return token, csrf, row


def lookup_session(db: Session, token: str | None) -> tuple[LoginSession, User] | None:
    if not token:
        return None
    row = db.scalar(select(LoginSession).where(LoginSession.token_hash == digest(token)))
    if (
        row is None
        or row.revoked_at is not None
        or aware(row.expires_at) <= datetime.now(timezone.utc)
    ):
        return None
    user = db.get(User, row.user_id)
    if user is None or not user.is_active:
        return None
    return row, user


def record_login_attempt(db: Session, key: str) -> int:
    now = datetime.now(timezone.utc)
    # Atomic PostgreSQL upsert serializes attempts for the same key before verification.
    if db.bind and db.bind.dialect.name == "postgresql":
        stmt = pg_insert(LoginRateLimit).values(
            key_hash=key, failures=1, window_started_at=now
        )
        stmt = stmt.on_conflict_do_update(
            index_elements=[LoginRateLimit.key_hash],
            set_={
                "failures": case(
                    (LoginRateLimit.window_started_at <= now - RATE_WINDOW, 1),
                    else_=LoginRateLimit.failures + 1,
                ),
                "window_started_at": case(
                    (LoginRateLimit.window_started_at <= now - RATE_WINDOW, now),
                    else_=LoginRateLimit.window_started_at,
                ),
            },
        )
        return db.scalar(stmt.returning(LoginRateLimit.failures)) or 1
    else:
        row = db.get(LoginRateLimit, key)
        if row is None:
            db.add(LoginRateLimit(key_hash=key, failures=1, window_started_at=now))
            return 1
        elif now - aware(row.window_started_at) >= RATE_WINDOW:
            row.failures, row.window_started_at = 1, now
        else:
            row.failures += 1
        return row.failures


def clear_login_failures(db: Session, key: str) -> None:
    row = db.get(LoginRateLimit, key)
    if row:
        row.failures = 0
        row.window_started_at = datetime.now(timezone.utc)


def cookie_settings() -> dict:
    secure = os.environ.get("APP_ENV") not in {"local", "test"}
    return {"secure": secure, "httponly": True, "samesite": "strict", "path": "/"}


def session_cookie_name() -> str:
    if os.environ.get("APP_ENV") in {"local", "test"}:
        return "taiji_session"
    return "__Host-taiji_session"


def csrf_cookie_name() -> str:
    return "taiji_csrf" if os.environ.get("APP_ENV") in {"local", "test"} else "__Host-taiji_csrf"


def valid_csrf(row: LoginSession, header: str | None, cookie: str | None) -> bool:
    if not header or not cookie or not hmac.compare_digest(header, cookie):
        return False
    return hmac.compare_digest(row.csrf_hash, digest(header))
