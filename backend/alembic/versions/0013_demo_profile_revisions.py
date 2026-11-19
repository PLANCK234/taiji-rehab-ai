"""Append-only synthetic profile revisions without altering legacy profile rows.

Revision ID: 0013_demo_profile_revisions
Revises: 0012_synthetic_staff_admin
"""

import sqlalchemy as sa

from alembic import op

revision = "0013_demo_profile_revisions"
down_revision = "0012_synthetic_staff_admin"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "demo_profile_revisions",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("participant_id", sa.Uuid(), sa.ForeignKey("participants.id"), nullable=False),
        sa.Column("revision_no", sa.Integer(), nullable=False),
        sa.Column("age", sa.Integer()),
        sa.Column("sex", sa.String(16)),
        sa.Column("needs_assistance", sa.Boolean()),
        sa.Column("note", sa.String(500)),
        sa.Column("change_reason", sa.String(64)),
        sa.Column("recorded_by", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("recorded_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("participant_id", "revision_no"),
        sa.CheckConstraint("revision_no > 0", name="ck_demo_profile_revision_positive"),
        sa.CheckConstraint(
            "age IS NULL OR age BETWEEN 0 AND 120", name="ck_demo_profile_revision_age"
        ),
        sa.CheckConstraint(
            "sex IS NULL OR sex IN ('female','male','other','unknown')",
            name="ck_demo_profile_revision_sex",
        ),
    )


def downgrade() -> None:
    """Only for an empty disposable test database; never erase real revision history."""
    op.drop_table("demo_profile_revisions")
