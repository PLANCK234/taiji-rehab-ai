"""Record observed completed Demo actions separately from planned actions.

Revision ID: 0007_demo_completed_actions
Revises: 0006_demo_v2
"""

import sqlalchemy as sa

from alembic import op

revision = "0007_demo_completed_actions"
down_revision = "0006_demo_v2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("demo_runs", sa.Column("completed_action_ids", sa.JSON()))


def downgrade() -> None:
    """Only for empty disposable databases after an approved rollback plan."""
    op.drop_column("demo_runs", "completed_action_ids")
