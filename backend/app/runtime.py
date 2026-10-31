"""Fail-closed runtime profile boundary until research data approval is recorded."""

import os

from fastapi import HTTPException


def demo_enabled() -> bool:
    return (
        os.environ.get("APP_PROFILE", "demo") == "demo"
        and os.environ.get("APP_ENV") in {"local", "test"}
        and os.environ.get("ALLOW_SYNTHETIC_ONLY") == "true"
    )


def require_demo() -> None:
    if not demo_enabled():
        raise HTTPException(
            status_code=503, detail="research access pending institutional approval"
        )
