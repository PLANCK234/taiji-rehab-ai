"""Append structured human corrections while preserving prior review history."""

import sqlalchemy as sa

from alembic import op

revision = "0022_pose_review_corrections"
down_revision = "0021_pose_geometry_v2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("pose_reviews", sa.Column(
        "corrections", sa.JSON(), nullable=False, server_default=sa.text("'[]'"),
    ))
    op.drop_constraint("ck_pose_review_decision", "pose_reviews", type_="check")
    op.create_check_constraint(
        "ck_pose_review_decision", "pose_reviews",
        "decision IN ('accepted_observations','modified_observations','needs_retake','rejected')",
    )
    op.create_check_constraint(
        "ck_pose_review_corrections", "pose_reviews",
        "(decision = 'modified_observations' AND json_array_length(corrections) > 0) OR "
        "(decision <> 'modified_observations' AND json_array_length(corrections) = 0)",
    )


def downgrade() -> None:
    count = op.get_bind().scalar(sa.text(
        "SELECT count(*) FROM pose_reviews WHERE json_array_length(corrections) > 0"
    ))
    if count:
        raise RuntimeError("structured review evidence exists; downgrade refused")
    op.drop_constraint("ck_pose_review_corrections", "pose_reviews", type_="check")
    op.drop_constraint("ck_pose_review_decision", "pose_reviews", type_="check")
    op.create_check_constraint(
        "ck_pose_review_decision", "pose_reviews",
        "decision IN ('accepted_observations','needs_retake','rejected')",
    )
    op.drop_column("pose_reviews", "corrections")
