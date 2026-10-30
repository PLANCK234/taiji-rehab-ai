"""Database connection and request-scoped transactions."""

import os
from collections.abc import Iterator
from functools import lru_cache

from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session


class Base(DeclarativeBase):
    pass


@lru_cache
def get_engine():
    url = os.environ.get("DATABASE_URL")
    if not url:
        raise RuntimeError("DATABASE_URL is required")
    return create_engine(url, pool_pre_ping=True)


def get_db() -> Iterator[Session]:
    if os.environ.get("ALLOW_SYNTHETIC_ONLY") != "true":
        raise HTTPException(status_code=503, detail="synthetic-only mode required")
    with Session(get_engine()) as session:
        yield session
