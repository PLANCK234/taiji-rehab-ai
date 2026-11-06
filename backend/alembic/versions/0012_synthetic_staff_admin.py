"""Append-only synthetic staff administration history.

Revision ID: 0012_synthetic_staff_admin
Revises: 0011_synthetic_cycles
"""

import sqlalchemy as sa

from alembic import op

revision = "0012_synthetic_staff_admin"
down_revision = "0011_synthetic_cycles"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "synthetic_staff_changes",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("target_user_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("action", sa.String(40), nullable=False),
        sa.Column("scope_id", sa.Uuid()),
        sa.Column("value", sa.String(40)),
        sa.Column("actor_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("recorded_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    """Only in an empty disposable database; never erase real change history."""
    op.drop_table("synthetic_staff_changes")
