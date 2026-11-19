"""Append-only synthetic patient-authored training and discomfort facts.

Revision ID: 0010_demo_patient_report
Revises: 0009_demo_patient_publication
"""

import sqlalchemy as sa

from alembic import op

revision = "0010_demo_patient_report"
down_revision = "0009_demo_patient_publication"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "demo_patient_report_revisions",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("report_id", sa.Uuid(), nullable=False),
        sa.Column("participant_id", sa.Uuid(), sa.ForeignKey("participants.id"), nullable=False),
        sa.Column("revision_no", sa.Integer(), nullable=False),
        sa.Column("observed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("activity_state", sa.String(20), nullable=False),
        sa.Column("actual_minutes", sa.Integer(), nullable=True),
        sa.Column("discomfort_state", sa.String(20), nullable=False),
        sa.Column("discomfort_note", sa.String(500), nullable=True),
        sa.Column("change_reason", sa.String(500), nullable=True),
        sa.Column("recorded_by", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("recorded_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("report_id", "revision_no"),
        sa.CheckConstraint("revision_no > 0", name="ck_patient_report_revision_positive"),
        sa.CheckConstraint(
            "activity_state IN ('performed','not_performed','unknown')",
            name="ck_patient_report_activity_state",
        ),
        sa.CheckConstraint(
            "discomfort_state IN ('reported','none','unknown')",
            name="ck_patient_report_discomfort_state",
        ),
        sa.CheckConstraint(
            "actual_minutes IS NULL OR actual_minutes >= 0", name="ck_patient_report_minutes"
        ),
        sa.CheckConstraint(
            "activity_state = 'performed' OR actual_minutes IS NULL",
            name="ck_patient_report_minutes_shape",
        ),
        sa.CheckConstraint(
            "(discomfort_state = 'reported' AND discomfort_note IS NOT NULL) OR "
            "(discomfort_state != 'reported' AND discomfort_note IS NULL)",
            name="ck_patient_report_discomfort_shape",
        ),
    )
    op.create_index(
        "ix_demo_patient_report_participant",
        "demo_patient_report_revisions",
        ["participant_id", "recorded_at"],
    )


def downgrade() -> None:
    """Only for empty disposable test databases; never erase patient reports."""
    op.drop_index("ix_demo_patient_report_participant", table_name="demo_patient_report_revisions")
    op.drop_table("demo_patient_report_revisions")
