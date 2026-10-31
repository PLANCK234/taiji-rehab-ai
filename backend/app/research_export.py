"""Deterministic, coded, single-participant live CSV from Demo data."""

import csv
import hashlib
import io
import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import (
    Assessment,
    AssessmentRevision,
    SafetyEvent,
    TrainingFeedbackRevision,
    TrainingSession,
)

COLUMNS = [
    "study_code", "participant_code", "record_type", "record_id", "parent_id",
    "revision_no", "event_at_utc", "recorded_at_utc", "recorded_by",
    "visit_kind", "protocol_version", "measurement_state", "metric_code",
    "metric_value", "metric_unit", "validity", "missing_reason",
    "completion_status", "actual_minutes", "rpe", "feedback_state",
]


def _utc(value: datetime | None) -> str:
    if value is None:
        return ""
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def build_coded_export(
    db: Session, participant_id: uuid.UUID, *, study_code: str, participant_code: str
) -> tuple[bytes, int, str]:
    """All revisions are exported; free text and identity fields are excluded."""
    base = {"study_code": study_code, "participant_code": participant_code}
    rows: list[dict[str, str | int]] = []
    assessments = db.scalars(
        select(Assessment).where(Assessment.participant_id == participant_id)
    ).all()
    by_assessment = {row.id: row for row in assessments}
    for revision in db.scalars(
        select(AssessmentRevision)
        .where(AssessmentRevision.assessment_id.in_(by_assessment))
        .order_by(AssessmentRevision.assessment_id, AssessmentRevision.revision_no)
    ):
        parent = by_assessment[revision.assessment_id]
        rows.append({
            **base,
            "record_type": "assessment_revision",
            "record_id": str(revision.id),
            "parent_id": str(parent.id),
            "revision_no": revision.revision_no,
            "event_at_utc": _utc(revision.performed_at),
            "recorded_at_utc": _utc(revision.recorded_at),
            "recorded_by": str(revision.recorded_by),
            "visit_kind": parent.visit_kind,
            "protocol_version": parent.protocol_version,
            "measurement_state": revision.state,
            "metric_code": revision.metric_code,
            "metric_value": revision.raw_value if revision.raw_value is not None else "",
            "metric_unit": revision.unit,
            "validity": revision.validity,
            "missing_reason": revision.missing_reason or "",
        })
    sessions = db.scalars(
        select(TrainingSession).where(TrainingSession.participant_id == participant_id)
    ).all()
    by_session = {row.id: row for row in sessions}
    for session in sessions:
        rows.append({
            **base,
            "record_type": "training_session",
            "record_id": str(session.id),
            "event_at_utc": _utc(session.session_at),
            "recorded_at_utc": _utc(session.recorded_at),
            "recorded_by": str(session.recorded_by),
            "completion_status": session.completion_status,
            "actual_minutes": (
                session.actual_minutes if session.actual_minutes is not None else ""
            ),
        })
    for revision in db.scalars(
        select(TrainingFeedbackRevision)
        .where(TrainingFeedbackRevision.session_id.in_(by_session))
        .order_by(TrainingFeedbackRevision.session_id, TrainingFeedbackRevision.revision_no)
    ):
        rows.append({
            **base,
            "record_type": "training_feedback_revision",
            "record_id": str(revision.id),
            "parent_id": str(revision.session_id),
            "revision_no": revision.revision_no,
            "recorded_at_utc": _utc(revision.recorded_at),
            "recorded_by": str(revision.recorded_by),
            "rpe": revision.rpe if revision.rpe is not None else "",
            "feedback_state": revision.state,
            "missing_reason": revision.missing_reason or "",
        })
    for event in db.scalars(
        select(SafetyEvent).where(SafetyEvent.participant_id == participant_id)
    ):
        rows.append({
            **base,
            "record_type": "safety_event",
            "record_id": str(event.id),
            "parent_id": str(event.session_id) if event.session_id else "",
            "event_at_utc": _utc(event.event_at),
            "recorded_at_utc": _utc(event.recorded_at),
            "recorded_by": str(event.recorded_by),
        })
    # Stable order for rows read in this live request; this is not a frozen dataset.
    rows.sort(key=lambda row: (
        str(row.get("recorded_at_utc", "")),
        str(row["record_type"]), str(row["record_id"]),
    ))
    output = io.StringIO(newline="")
    writer = csv.DictWriter(output, fieldnames=COLUMNS, extrasaction="ignore", lineterminator="\n")
    writer.writeheader()
    writer.writerows(rows)
    payload = output.getvalue().encode("utf-8")
    return payload, len(rows), hashlib.sha256(payload).hexdigest()
