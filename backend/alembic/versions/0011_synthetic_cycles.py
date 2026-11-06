"""Manual synthetic cycles and append-only visit snapshots.

Revision ID: 0011_synthetic_cycles
Revises: 0010_demo_patient_report
"""

import sqlalchemy as sa

from alembic import op

revision = "0011_synthetic_cycles"
down_revision = "0010_demo_patient_report"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "synthetic_cycles",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("participant_id", sa.Uuid(), sa.ForeignKey("participants.id"), nullable=False),
        sa.Column("label", sa.String(120), nullable=False),
        sa.Column("created_by", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("participant_id", "label"),
    )
    op.create_table(
        "synthetic_visit_revisions",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("visit_id", sa.Uuid(), nullable=False),
        sa.Column("cycle_id", sa.Uuid(), sa.ForeignKey("synthetic_cycles.id"), nullable=False),
        sa.Column("revision_no", sa.Integer(), nullable=False),
        sa.Column("label", sa.String(120), nullable=False),
        sa.Column("attendance", sa.String(20), nullable=False),
        sa.Column("assessment_state", sa.String(20), nullable=False),
        sa.Column("assessment_id", sa.Uuid(), sa.ForeignKey("assessments.id")),
        sa.Column("training_session_ids", sa.JSON(), nullable=False),
        sa.Column("change_reason", sa.String(500)),
        sa.Column("recorded_by", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("recorded_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("visit_id", "revision_no"),
        sa.CheckConstraint("revision_no > 0", name="ck_synthetic_visit_revision_positive"),
        sa.CheckConstraint(
            "attendance IN ('unknown','attended','not_attended')",
            name="ck_synthetic_visit_attendance",
        ),
        sa.CheckConstraint(
            "assessment_state IN ('unknown','recorded','declined','not_measured')",
            name="ck_synthetic_visit_assessment_state",
        ),
    )


def downgrade() -> None:
    """Only for an empty disposable database, never populated research history."""
    op.drop_table("synthetic_visit_revisions")
    op.drop_table("synthetic_cycles")
