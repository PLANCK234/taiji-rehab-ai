"""Permit new signal-analysis results while preserving every v1 row."""

import sqlalchemy as sa

from alembic import op

revision = "0021_pose_geometry_v2"
down_revision = "0020_pose_analyses"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_constraint("ck_pose_algorithm", "pose_analyses", type_="check")
    op.create_check_constraint(
        "ck_pose_algorithm", "pose_analyses",
        "algorithm_version IN ('pose-geometry-v1','pose-geometry-v2')",
    )


def downgrade() -> None:
    """Refuse a rollback that would discard or relabel v2 evidence."""
    count = op.get_bind().scalar(sa.text(
        "SELECT count(*) FROM pose_analyses WHERE algorithm_version = 'pose-geometry-v2'"
    ))
    if count:
        raise RuntimeError("v2 evidence exists; downgrade refused without a data-preserving plan")
    op.drop_constraint("ck_pose_algorithm", "pose_analyses", type_="check")
    op.create_check_constraint(
        "ck_pose_algorithm", "pose_analyses", "algorithm_version = 'pose-geometry-v1'",
    )
