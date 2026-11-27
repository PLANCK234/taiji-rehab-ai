"""Allow pose-geometry-v3 results and free-text assessment correction reasons."""

import sqlalchemy as sa

from alembic import op

revision = "0011_pose_v3_free_text_reasons"
down_revision = "0010_pose_review_corrections"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_constraint("ck_pose_algorithm", "pose_analyses", type_="check")
    op.create_check_constraint(
        "ck_pose_algorithm", "pose_analyses",
        "algorithm_version IN ('pose-geometry-v1','pose-geometry-v2','pose-geometry-v3')",
    )
    op.alter_column(
        "assessment_revisions", "change_reason",
        existing_type=sa.String(64), type_=sa.String(240), existing_nullable=True,
    )


def downgrade() -> None:
    bind = op.get_bind()
    v3 = bind.scalar(sa.text(
        "SELECT count(*) FROM pose_analyses WHERE algorithm_version = 'pose-geometry-v3'"
    ))
    long_reasons = bind.scalar(sa.text(
        "SELECT count(*) FROM assessment_revisions WHERE length(change_reason) > 64"
    ))
    if v3 or long_reasons:
        raise RuntimeError("v3 evidence or long correction reasons exist; downgrade refused")
    op.alter_column(
        "assessment_revisions", "change_reason",
        existing_type=sa.String(240), type_=sa.String(64), existing_nullable=True,
    )
    op.drop_constraint("ck_pose_algorithm", "pose_analyses", type_="check")
    op.create_check_constraint(
        "ck_pose_algorithm", "pose_analyses",
        "algorithm_version IN ('pose-geometry-v1','pose-geometry-v2')",
    )
