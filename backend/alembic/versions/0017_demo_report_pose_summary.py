"""Store optional synthetic pose counts with a task-linked patient report."""

import sqlalchemy as sa

from alembic import op

revision = "0017_demo_report_pose_summary"
down_revision = "0016_demo_report_publication"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("demo_patient_report_revisions", sa.Column("pose_summary", sa.JSON()))


def downgrade() -> None:
    """Only for a disposable environment."""
    op.drop_column("demo_patient_report_revisions", "pose_summary")
