"""Synthetic staff, coded participants, and append-only intake records."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import Uuid

from app.db import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint(
            "role IN ('clinician','clinical_approver','research_assistant','analyst','admin')",
            name="ck_users_role",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(320), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(512), nullable=False)
    role: Mapped[str] = mapped_column(String(40), nullable=False)
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class Study(Base):
    __tablename__ = "studies"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    code: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)


class StudyAssignment(Base):
    __tablename__ = "study_assignments"

    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id"), primary_key=True
    )
    study_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("studies.id"), primary_key=True
    )


class Participant(Base):
    __tablename__ = "participants"
    __table_args__ = (
        UniqueConstraint("study_id", "study_code"),
        Index("ix_participants_study_id", "study_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    study_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("studies.id"), nullable=False)
    study_code: Mapped[str] = mapped_column(String(64), nullable=False)


class ParticipantAssignment(Base):
    __tablename__ = "participant_assignments"

    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id"), primary_key=True
    )
    participant_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("participants.id"), primary_key=True
    )


class WriteReceipt(Base):
    __tablename__ = "write_receipts"

    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id"), primary_key=True)
    route_key: Mapped[str] = mapped_column(String(80), primary_key=True)
    key: Mapped[str] = mapped_column(String(128), primary_key=True)
    payload_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    resource_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class ConsentRecord(Base):
    __tablename__ = "consent_records"
    __table_args__ = (
        CheckConstraint(
            "decision IN ('granted','refused','withdrawn')", name="ck_consent_decision"
        ),
        CheckConstraint("NOT photo_scope OR decision = 'granted'", name="ck_consent_photo_scope"),
        Index("ix_consent_participant_time", "participant_id", "recorded_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    participant_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("participants.id"), nullable=False
    )
    document_version: Mapped[str] = mapped_column(String(64), nullable=False)
    purpose_code: Mapped[str] = mapped_column(String(64), nullable=False)
    decision: Mapped[str] = mapped_column(String(20), nullable=False)
    photo_scope: Mapped[bool] = mapped_column(default=False, nullable=False)
    change_reason: Mapped[str | None] = mapped_column(String(240))
    recorded_by: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id"), nullable=False)
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class ScreeningRecord(Base):
    __tablename__ = "screening_records"
    __table_args__ = (
        CheckConstraint("answer IN ('yes','no','unknown')", name="ck_screening_answer"),
        Index("ix_screening_participant_time", "participant_id", "recorded_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    participant_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("participants.id"), nullable=False
    )
    item_code: Mapped[str] = mapped_column(String(64), nullable=False)
    answer: Mapped[str] = mapped_column(String(10), nullable=False)
    change_reason: Mapped[str | None] = mapped_column(String(240))
    recorded_by: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id"), nullable=False)
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class Assessment(Base):
    __tablename__ = "assessments"
    __table_args__ = (
        CheckConstraint("visit_kind IN ('baseline','revisit')", name="ck_assessment_visit_kind"),
        Index("ix_assessments_participant_created", "participant_id", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    participant_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("participants.id"), nullable=False
    )
    visit_kind: Mapped[str] = mapped_column(String(16), nullable=False)
    protocol_version: Mapped[str] = mapped_column(String(64), nullable=False)
    created_by: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class AssessmentRevision(Base):
    __tablename__ = "assessment_revisions"
    __table_args__ = (
        UniqueConstraint("assessment_id", "revision_no"),
        CheckConstraint("revision_no > 0", name="ck_assessment_revision_positive"),
        CheckConstraint("state IN ('draft','confirmed')", name="ck_assessment_revision_state"),
        CheckConstraint("metric_code = 'sppb_total'", name="ck_assessment_metric"),
        CheckConstraint("unit = 'points'", name="ck_assessment_unit"),
        CheckConstraint("source = 'manual_staff_entry'", name="ck_assessment_source"),
        CheckConstraint(
            "missing_reason IS NULL OR missing_reason IN "
            "('not_scheduled','not_attempted','declined','unsafe_to_attempt',"
            "'technical_failure','lost_followup','unknown')",
            name="ck_assessment_missing_reason",
        ),
        CheckConstraint(
            "(validity = 'unrecorded' AND raw_value IS NULL AND missing_reason IS NULL "
            "AND performed_at IS NULL AND state = 'draft') OR "
            "(validity = 'valid' AND raw_value BETWEEN 0 AND 12 "
            "AND missing_reason IS NULL AND performed_at IS NOT NULL) OR "
            "(validity = 'missing' AND raw_value IS NULL AND missing_reason IS NOT NULL "
            "AND performed_at IS NULL) OR "
            "(validity = 'invalid' AND missing_reason IS NOT NULL)",
            name="ck_assessment_value_state",
        ),
        Index("ix_assessment_revisions_assessment_no", "assessment_id", "revision_no"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    assessment_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("assessments.id"), nullable=False
    )
    revision_no: Mapped[int] = mapped_column(nullable=False)
    state: Mapped[str] = mapped_column(String(16), nullable=False)
    metric_code: Mapped[str] = mapped_column(String(32), nullable=False)
    raw_value: Mapped[int | None] = mapped_column()
    unit: Mapped[str] = mapped_column(String(16), nullable=False)
    validity: Mapped[str] = mapped_column(String(16), nullable=False)
    missing_reason: Mapped[str | None] = mapped_column(String(32))
    performed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    source: Mapped[str] = mapped_column(String(32), nullable=False)
    change_reason: Mapped[str | None] = mapped_column(String(64))
    recorded_by: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id"), nullable=False)
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class TrainingSession(Base):
    """Recorded activity, never a training prescription."""

    __tablename__ = "training_sessions"
    __table_args__ = (
        Index("ix_training_sessions_participant_time", "participant_id", "session_at"),
        CheckConstraint(
            "completion_status IN ('completed','partial','interrupted','not_started')",
            name="ck_training_completion_status",
        ),
        CheckConstraint(
            "actual_minutes IS NULL OR actual_minutes >= 0",
            name="ck_training_actual_minutes",
        ),
        CheckConstraint("source = 'manual_staff_entry'", name="ck_training_source"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    participant_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("participants.id"), nullable=False
    )
    session_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    action_label: Mapped[str] = mapped_column(String(120), nullable=False)
    actual_minutes: Mapped[int | None] = mapped_column()
    completion_status: Mapped[str] = mapped_column(String(16), nullable=False)
    notes: Mapped[str | None] = mapped_column(String(1000))
    source: Mapped[str] = mapped_column(String(32), nullable=False)
    recorded_by: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id"), nullable=False)
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class TrainingFeedbackRevision(Base):
    __tablename__ = "training_feedback_revisions"
    __table_args__ = (
        UniqueConstraint("session_id", "revision_no"),
        CheckConstraint("revision_no > 0", name="ck_training_feedback_revision_positive"),
        CheckConstraint("state IN ('recorded','missing')", name="ck_training_feedback_state"),
        CheckConstraint("rpe IS NULL OR rpe BETWEEN 6 AND 20", name="ck_training_feedback_rpe"),
        CheckConstraint(
            "missing_reason IS NULL OR missing_reason IN "
            "('declined','interrupted','technical_failure','unknown')",
            name="ck_training_feedback_missing_reason",
        ),
        CheckConstraint(
            "(state = 'missing' AND missing_reason IS NOT NULL AND rpe IS NULL "
            "AND difficulty IS NULL AND support IS NULL AND fatigue IS NULL "
            "AND discomfort IS NULL AND notes IS NULL) OR "
            "(state = 'recorded' AND missing_reason IS NULL AND "
            "(rpe IS NOT NULL OR difficulty IS NOT NULL OR support IS NOT NULL "
            "OR fatigue IS NOT NULL OR discomfort IS NOT NULL OR notes IS NOT NULL))",
            name="ck_training_feedback_shape",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("training_sessions.id"), nullable=False
    )
    revision_no: Mapped[int] = mapped_column(nullable=False)
    state: Mapped[str] = mapped_column(String(16), nullable=False)
    missing_reason: Mapped[str | None] = mapped_column(String(32))
    rpe: Mapped[int | None] = mapped_column()
    difficulty: Mapped[str | None] = mapped_column(String(500))
    support: Mapped[str | None] = mapped_column(String(500))
    fatigue: Mapped[str | None] = mapped_column(String(500))
    discomfort: Mapped[str | None] = mapped_column(String(500))
    notes: Mapped[str | None] = mapped_column(String(1000))
    change_reason: Mapped[str | None] = mapped_column(String(500))
    recorded_by: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id"), nullable=False)
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class SafetyEvent(Base):
    """Unclassified observation; clinical review policy is not encoded here."""

    __tablename__ = "safety_events"
    __table_args__ = (Index("ix_safety_events_participant_time", "participant_id", "event_at"),)

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    participant_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("participants.id"), nullable=False
    )
    session_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("training_sessions.id")
    )
    event_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    description: Mapped[str] = mapped_column(String(2000), nullable=False)
    recorded_by: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id"), nullable=False)
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class LoginSession(Base):
    __tablename__ = "login_sessions"
    __table_args__ = (Index("ix_login_sessions_user_id", "user_id"),)

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id"), nullable=False)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    csrf_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class LoginRateLimit(Base):
    __tablename__ = "login_rate_limits"
    __table_args__ = (CheckConstraint("failures >= 0", name="ck_login_rate_failures"),)

    key_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    failures: Mapped[int] = mapped_column(default=0, nullable=False)
    window_started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class AuditEvent(Base):
    __tablename__ = "audit_events"
    __table_args__ = (Index("ix_audit_events_actor_time", "actor_id", "occurred_at"),)

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    actor_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("users.id"))
    action: Mapped[str] = mapped_column(String(80), nullable=False)
    resource_type: Mapped[str] = mapped_column(String(40), nullable=False)
    resource_id: Mapped[uuid.UUID | None] = mapped_column(Uuid)
    outcome: Mapped[str] = mapped_column(String(20), nullable=False)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
