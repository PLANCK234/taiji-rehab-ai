"""Idempotency and append-only synthetic intake helpers."""

import hashlib
import json
import uuid

from fastapi import HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.orm import Session

from app.models import WriteReceipt


def reserve_write(
    db: Session, actor_id: uuid.UUID, route_key: str, key: str, payload: BaseModel
) -> tuple[uuid.UUID, bool]:
    """Reserve one resource ID per actor, route and key in the current transaction."""
    canonical = json.dumps(payload.model_dump(mode="json"), sort_keys=True, separators=(",", ":"))
    payload_hash = hashlib.sha256(canonical.encode()).hexdigest()
    proposed_id = uuid.uuid4()
    values = {
        "user_id": actor_id,
        "route_key": route_key,
        "key": key,
        "payload_hash": payload_hash,
        "resource_id": proposed_id,
    }
    dialect = db.get_bind().dialect.name
    if dialect == "postgresql":
        stmt = pg_insert(WriteReceipt).values(**values).on_conflict_do_nothing(
            index_elements=[WriteReceipt.user_id, WriteReceipt.route_key, WriteReceipt.key]
        )
    elif dialect == "sqlite":
        stmt = sqlite_insert(WriteReceipt).values(**values).on_conflict_do_nothing(
            index_elements=[WriteReceipt.user_id, WriteReceipt.route_key, WriteReceipt.key]
        )
    else:
        raise RuntimeError("unsupported idempotency database")
    inserted_id = db.scalar(stmt.returning(WriteReceipt.resource_id))
    if inserted_id is not None:
        return inserted_id, True
    existing = db.get(WriteReceipt, (actor_id, route_key, key))
    if existing is None:
        raise RuntimeError("idempotency receipt missing after conflict")
    if existing.payload_hash != payload_hash:
        raise HTTPException(status_code=409, detail="idempotency key reused")
    return existing.resource_id, False


def require_reason_for_revision(
    db: Session, model: type, criteria: tuple, reason: str | None
) -> None:
    previous = db.scalar(select(model.id).where(*criteria).limit(1))
    if previous is not None and (reason is None or not reason.strip()):
        raise HTTPException(status_code=422, detail="change reason required")
