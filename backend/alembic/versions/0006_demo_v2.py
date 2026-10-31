"""Isolated synthetic Demo grade, action catalog and run state.

Revision ID: 0006_demo_v2
Revises: 0005_training_observations
"""

import sqlalchemy as sa

from alembic import op

revision = "0006_demo_v2"
down_revision = "0005_training_observations"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "demo_participant_profiles",
        sa.Column("participant_id", sa.Uuid(), sa.ForeignKey("participants.id"), primary_key=True),
        sa.Column("age", sa.Integer()),
        sa.Column("sex", sa.String(16)),
        sa.Column("needs_assistance", sa.Boolean()),
        sa.Column("note", sa.String(500)),
        sa.CheckConstraint("age IS NULL OR age BETWEEN 0 AND 120", name="ck_demo_profile_age"),
        sa.CheckConstraint(
            "sex IS NULL OR sex IN ('female','male','other','unknown')", name="ck_demo_profile_sex"
        ),
    )
    op.create_table(
        "demo_grade_results",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "assessment_revision_id",
            sa.Uuid(),
            sa.ForeignKey("assessment_revisions.id"),
            nullable=False,
        ),
        sa.Column("rule_version", sa.String(40), nullable=False),
        sa.Column("functional_grade", sa.String(16), nullable=False),
        sa.Column("demo_training_mode", sa.String(40)),
        sa.Column("evidence", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("assessment_revision_id"),
        sa.CheckConstraint(
            "functional_grade IN ('I','II','III','IV','UNASSESSED')", name="ck_demo_grade"
        ),
    )
    op.create_table(
        "demo_actions",
        sa.Column("id", sa.String(40), primary_key=True),
        sa.Column("name", sa.String(80), nullable=False),
        sa.Column("category", sa.String(40), nullable=False),
        sa.Column("demo_grade", sa.String(8), nullable=False),
        sa.Column("explanation", sa.String(1000), nullable=False),
        sa.Column("steps", sa.JSON(), nullable=False),
        sa.Column("display_order", sa.Integer(), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False),
        sa.Column("marker", sa.String(20), nullable=False),
    )
    op.create_table(
        "demo_runs",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("participant_id", sa.Uuid(), sa.ForeignKey("participants.id"), nullable=False),
        sa.Column(
            "grade_result_id", sa.Uuid(), sa.ForeignKey("demo_grade_results.id"), nullable=False
        ),
        sa.Column("status", sa.String(24), nullable=False),
        sa.Column("action_ids", sa.JSON(), nullable=False),
        sa.Column("current_index", sa.Integer(), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ended_at", sa.DateTime(timezone=True)),
        sa.Column("training_session_id", sa.Uuid(), sa.ForeignKey("training_sessions.id")),
        sa.Column("created_by", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.CheckConstraint(
            "status IN ('in_progress','paused','awaiting_feedback','completed','stopped')",
            name="ck_demo_run_status",
        ),
        sa.CheckConstraint("current_index >= 0", name="ck_demo_run_index"),
    )
    op.create_index(
        "ix_demo_runs_participant_started", "demo_runs", ["participant_id", "started_at"]
    )


def downgrade() -> None:
    """Only for empty disposable databases after an approved rollback plan."""
    op.drop_index("ix_demo_runs_participant_started", table_name="demo_runs")
    op.drop_table("demo_runs")
    op.drop_table("demo_actions")
    op.drop_table("demo_grade_results")
    op.drop_table("demo_participant_profiles")
