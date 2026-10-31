"""Append-only synthetic training observations and unclassified events.

Revision ID: 0005_training_observations
Revises: 0004_manual_assessments
"""

import sqlalchemy as sa

from alembic import op

revision = "0005_training_observations"
down_revision = "0004_manual_assessments"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "training_sessions",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("participant_id", sa.Uuid(), sa.ForeignKey("participants.id"), nullable=False),
        sa.Column("session_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("action_label", sa.String(120), nullable=False),
        sa.Column("actual_minutes", sa.Integer()),
        sa.Column("completion_status", sa.String(16), nullable=False),
        sa.Column("notes", sa.String(1000)),
        sa.Column("source", sa.String(32), nullable=False),
        sa.Column("recorded_by", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("recorded_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "completion_status IN ('completed','partial','interrupted','not_started')",
            name="ck_training_completion_status",
        ),
        sa.CheckConstraint(
            "actual_minutes IS NULL OR actual_minutes >= 0", name="ck_training_actual_minutes"
        ),
        sa.CheckConstraint("source = 'manual_staff_entry'", name="ck_training_source"),
    )
    op.create_index(
        "ix_training_sessions_participant_time",
        "training_sessions",
        ["participant_id", "session_at"],
    )
    op.create_table(
        "training_feedback_revisions",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("session_id", sa.Uuid(), sa.ForeignKey("training_sessions.id"), nullable=False),
        sa.Column("revision_no", sa.Integer(), nullable=False),
        sa.Column("state", sa.String(16), nullable=False),
        sa.Column("missing_reason", sa.String(32)),
        sa.Column("rpe", sa.Integer()),
        sa.Column("difficulty", sa.String(500)),
        sa.Column("support", sa.String(500)),
        sa.Column("fatigue", sa.String(500)),
        sa.Column("discomfort", sa.String(500)),
        sa.Column("notes", sa.String(1000)),
        sa.Column("change_reason", sa.String(500)),
        sa.Column("recorded_by", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("recorded_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("session_id", "revision_no"),
        sa.CheckConstraint("revision_no > 0", name="ck_training_feedback_revision_positive"),
        sa.CheckConstraint("state IN ('recorded','missing')", name="ck_training_feedback_state"),
        sa.CheckConstraint("rpe IS NULL OR rpe BETWEEN 6 AND 20", name="ck_training_feedback_rpe"),
        sa.CheckConstraint(
            "missing_reason IS NULL OR missing_reason IN "
            "('declined','interrupted','technical_failure','unknown')",
            name="ck_training_feedback_missing_reason",
        ),
        sa.CheckConstraint(
            "(state = 'missing' AND missing_reason IS NOT NULL AND rpe IS NULL "
            "AND difficulty IS NULL AND support IS NULL AND fatigue IS NULL "
            "AND discomfort IS NULL AND notes IS NULL) OR "
            "(state = 'recorded' AND missing_reason IS NULL AND "
            "(rpe IS NOT NULL OR difficulty IS NOT NULL OR support IS NOT NULL "
            "OR fatigue IS NOT NULL OR discomfort IS NOT NULL OR notes IS NOT NULL))",
            name="ck_training_feedback_shape",
        ),
    )
    op.create_table(
        "safety_events",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("participant_id", sa.Uuid(), sa.ForeignKey("participants.id"), nullable=False),
        sa.Column("session_id", sa.Uuid(), sa.ForeignKey("training_sessions.id")),
        sa.Column("event_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("description", sa.String(2000), nullable=False),
        sa.Column("recorded_by", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("recorded_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index(
        "ix_safety_events_participant_time", "safety_events", ["participant_id", "event_at"]
    )


def downgrade() -> None:
    """Only for empty disposable databases; existing observations need approved rollback."""
    op.drop_index("ix_safety_events_participant_time", table_name="safety_events")
    op.drop_table("safety_events")
    op.drop_table("training_feedback_revisions")
    op.drop_index("ix_training_sessions_participant_time", table_name="training_sessions")
    op.drop_table("training_sessions")
