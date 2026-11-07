"""Deterministic, coded, single-participant live CSV from Demo data."""

import csv
import hashlib
import io
import json
import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import (
    Assessment,
    AssessmentRevision,
    ConsentRecord,
    DemoPatientReportRevision,
    ManualObservationRevision,
    SafetyEvent,
    ScreeningRecord,
    SyntheticCycle,
    SyntheticVisitRevision,
    TrainingFeedbackRevision,
    TrainingSession,
)

COLUMNS = [
    "study_code",
    "participant_code",
    "record_type",
    "record_id",
    "parent_id",
    "revision_no",
    "event_at_utc",
    "recorded_at_utc",
    "recorded_by",
    "visit_kind",
    "protocol_version",
    "measurement_state",
    "metric_code",
    "metric_value",
    "metric_unit",
    "validity",
    "missing_reason",
    "measurement_source",
    "measurement_side",
    "cycle_id",
    "visit_attendance",
    "visit_assessment_state",
    "linked_assessment_id",
    "linked_training_session_ids",
    "completion_status",
    "actual_minutes",
    "rpe",
    "feedback_state",
    "patient_activity_state",
    "patient_discomfort_state",
    "report_source",
    "intake_source",
    "consent_decision",
    "consent_document_version",
    "consent_purpose_code",
    "consent_photo_scope",
    "screening_item_code",
    "screening_answer",
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
    for consent in db.scalars(
        select(ConsentRecord)
        .where(ConsentRecord.participant_id == participant_id)
        .order_by(ConsentRecord.recorded_at, ConsentRecord.id)
    ):
        rows.append({
            **base,
            "record_type": "synthetic_consent_record",
            "record_id": str(consent.id),
            "recorded_at_utc": _utc(consent.recorded_at),
            "recorded_by": str(consent.recorded_by),
            "intake_source": "synthetic_demo_record",
            "consent_decision": consent.decision,
            "consent_document_version": consent.document_version,
            "consent_purpose_code": consent.purpose_code,
            "consent_photo_scope": str(consent.photo_scope).lower(),
        })
    for screening in db.scalars(
        select(ScreeningRecord)
        .where(ScreeningRecord.participant_id == participant_id)
        .order_by(ScreeningRecord.recorded_at, ScreeningRecord.id)
    ):
        rows.append({
            **base,
            "record_type": "synthetic_screening_record",
            "record_id": str(screening.id),
            "recorded_at_utc": _utc(screening.recorded_at),
            "recorded_by": str(screening.recorded_by),
            "intake_source": "synthetic_demo_record",
            "screening_item_code": screening.item_code,
            "screening_answer": screening.answer,
        })
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
        rows.append(
            {
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
            }
        )
    for revision in db.scalars(
        select(ManualObservationRevision)
        .where(ManualObservationRevision.participant_id == participant_id)
        .order_by(ManualObservationRevision.observation_id, ManualObservationRevision.revision_no)
    ):
        snapshot = revision.snapshot
        rows.append(
            {
                **base,
                "record_type": "manual_observation_revision",
                "record_id": str(revision.id),
                "parent_id": str(revision.observation_id),
                "revision_no": revision.revision_no,
                "event_at_utc": _utc(
                    datetime.fromisoformat(snapshot["performed_at"])
                    if snapshot.get("performed_at")
                    else None
                ),
                "recorded_at_utc": _utc(revision.recorded_at),
                "recorded_by": str(revision.recorded_by),
                "metric_code": snapshot["metric_code"],
                "metric_value": snapshot.get("raw_value") or "",
                "metric_unit": snapshot["unit"],
                "validity": snapshot["validity"],
                "missing_reason": snapshot.get("missing_reason") or "",
                "measurement_source": snapshot["source"],
                "measurement_side": snapshot["side"],
            }
        )
    sessions = db.scalars(
        select(TrainingSession).where(TrainingSession.participant_id == participant_id)
    ).all()
    by_session = {row.id: row for row in sessions}
    cycles = db.scalars(
        select(SyntheticCycle).where(SyntheticCycle.participant_id == participant_id)
    ).all()
    by_cycle = {row.id: row for row in cycles}
    for cycle in cycles:
        rows.append({
            **base,
            "record_type": "synthetic_cycle",
            "record_id": str(cycle.id),
            "recorded_at_utc": _utc(cycle.created_at),
            "recorded_by": str(cycle.created_by),
            "cycle_id": str(cycle.id),
        })
    for revision in db.scalars(
        select(SyntheticVisitRevision)
        .where(SyntheticVisitRevision.cycle_id.in_(by_cycle))
        .order_by(SyntheticVisitRevision.cycle_id, SyntheticVisitRevision.visit_id,
                  SyntheticVisitRevision.revision_no)
    ):
        if revision.assessment_id is not None and revision.assessment_id not in by_assessment:
            raise ValueError("visit assessment is outside export participant")
        linked_sessions = [uuid.UUID(value) for value in revision.training_session_ids]
        if any(session_id not in by_session for session_id in linked_sessions):
            raise ValueError("visit training session is outside export participant")
        rows.append({
            **base,
            "record_type": "synthetic_visit_revision",
            "record_id": str(revision.id),
            "parent_id": str(revision.visit_id),
            "revision_no": revision.revision_no,
            "recorded_at_utc": _utc(revision.recorded_at),
            "recorded_by": str(revision.recorded_by),
            "cycle_id": str(revision.cycle_id),
            "visit_attendance": revision.attendance,
            "visit_assessment_state": revision.assessment_state,
            "linked_assessment_id": str(revision.assessment_id) if revision.assessment_id else "",
            "linked_training_session_ids": json.dumps(
                [str(session_id) for session_id in linked_sessions], separators=(",", ":")
            ),
        })
    for session in sessions:
        rows.append(
            {
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
            }
        )
    for revision in db.scalars(
        select(TrainingFeedbackRevision)
        .where(TrainingFeedbackRevision.session_id.in_(by_session))
        .order_by(TrainingFeedbackRevision.session_id, TrainingFeedbackRevision.revision_no)
    ):
        rows.append(
            {
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
            }
        )
    for event in db.scalars(
        select(SafetyEvent).where(SafetyEvent.participant_id == participant_id)
    ):
        rows.append(
            {
                **base,
                "record_type": "safety_event",
                "record_id": str(event.id),
                "parent_id": str(event.session_id) if event.session_id else "",
                "event_at_utc": _utc(event.event_at),
                "recorded_at_utc": _utc(event.recorded_at),
                "recorded_by": str(event.recorded_by),
            }
        )
    for revision in db.scalars(
        select(DemoPatientReportRevision)
        .where(DemoPatientReportRevision.participant_id == participant_id)
        .order_by(DemoPatientReportRevision.report_id, DemoPatientReportRevision.revision_no)
    ):
        rows.append({
            **base,
            "record_type": "patient_report_revision",
            "record_id": str(revision.id),
            "parent_id": str(revision.report_id),
            "revision_no": revision.revision_no,
            "event_at_utc": _utc(revision.observed_at),
            "recorded_at_utc": _utc(revision.recorded_at),
            "recorded_by": str(revision.recorded_by),
            "actual_minutes": (
                revision.actual_minutes if revision.actual_minutes is not None else ""
            ),
            "patient_activity_state": revision.activity_state,
            "patient_discomfort_state": revision.discomfort_state,
            "report_source": "patient_self_report",
        })
    # Stable order for rows read in this live request; this is not a frozen dataset.
    rows.sort(
        key=lambda row: (
            str(row.get("recorded_at_utc", "")),
            str(row["record_type"]),
            str(row["record_id"]),
        )
    )
    output = io.StringIO(newline="")
    writer = csv.DictWriter(output, fieldnames=COLUMNS, extrasaction="ignore", lineterminator="\n")
    writer.writeheader()
    writer.writerows(rows)
    payload = output.getvalue().encode("utf-8")
    return payload, len(rows), hashlib.sha256(payload).hexdigest()
