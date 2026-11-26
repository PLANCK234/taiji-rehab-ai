"""Append synthetic pose input, computed evidence and human review history."""

import sqlalchemy as sa

from alembic import op

revision = "0008_pose_analyses"
down_revision = "0007_demo_completed_actions"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "pose_analyses",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("participant_id", sa.Uuid(), sa.ForeignKey("participants.id"), nullable=False),
        sa.Column("input_data", sa.JSON(), nullable=False),
        sa.Column("input_sha256", sa.String(64), nullable=False),
        sa.Column("algorithm_version", sa.String(64), nullable=False),
        sa.Column("result", sa.JSON(), nullable=False),
        sa.Column("created_by", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("algorithm_version = 'pose-geometry-v1'", name="ck_pose_algorithm"),
    )
    op.create_index(
        "ix_pose_participant_created", "pose_analyses", ["participant_id", "created_at"]
    )
    op.create_table(
        "pose_reviews",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("analysis_id", sa.Uuid(), sa.ForeignKey("pose_analyses.id"), nullable=False),
        sa.Column("revision_no", sa.Integer(), nullable=False),
        sa.Column("decision", sa.String(32), nullable=False),
        sa.Column("reason", sa.String(1000), nullable=False),
        sa.Column("recorded_by", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("recorded_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("analysis_id", "revision_no"),
        sa.CheckConstraint("revision_no > 0", name="ck_pose_review_revision"),
        sa.CheckConstraint(
            "decision IN ('accepted_observations','needs_retake','rejected')",
            name="ck_pose_review_decision",
        ),
    )


def downgrade() -> None:
    """Disposable test databases only; never downgrade populated clinical data."""
    op.drop_table("pose_reviews")
    op.drop_index("ix_pose_participant_created", table_name="pose_analyses")
    op.drop_table("pose_analyses")
