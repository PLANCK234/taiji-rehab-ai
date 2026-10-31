"""Audited single-object synthetic CSV export; never a frozen research dataset."""

import uuid

from fastapi import APIRouter, Depends
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.api import AuthContext, audit, authorized_participant, current_auth
from app.db import get_db
from app.intake_api import READ_ROLES
from app.models import Study
from app.research_export import build_coded_export

router = APIRouter(prefix="/api/v1")


@router.get("/participants/{participant_id}/research-export.csv")
def export_participant_demo(
    participant_id: uuid.UUID,
    auth: AuthContext = Depends(current_auth),
    db: Session = Depends(get_db),
) -> Response:
    participant = authorized_participant(
        db, auth, participant_id, action="export", allowed_roles=READ_ROLES,
        audit_success=False,
    )
    study = db.get(Study, participant.study_id)
    if study is None:
        raise RuntimeError("participant study missing")
    payload, count, digest = build_coded_export(
        db, participant_id, study_code=study.code, participant_code=participant.study_code
    )
    audit(db, "export", "participant", "allowed", auth.user.id, participant_id)
    db.commit()
    return Response(
        content=payload,
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": (
                f'attachment; filename="{participant.study_code}-live-demo.csv"'
            ),
            "Cache-Control": "no-store",
            "X-Export-Mode": "live-demo",
            "X-Row-Count": str(count),
            "X-Content-SHA256": digest,
        },
    )
