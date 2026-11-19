"""Append-only, non-actionable synthetic publication test history.

Revision ID: 0009_demo_patient_publication
Revises: 0008_demo_patient_binding
"""

import sqlalchemy as sa

from alembic import op

revision = "0009_demo_patient_publication"
down_revision = "0008_demo_patient_binding"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "demo_patient_publications",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("participant_id", sa.Uuid(), sa.ForeignKey("participants.id"), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("state", sa.String(20), nullable=False),
        sa.Column("marker", sa.String(40), nullable=False),
        sa.Column("recorded_by", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("recorded_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "state IN ('published','withdrawn')", name="ck_demo_patient_publication_state"
        ),
        sa.UniqueConstraint("participant_id", "version"),
    )


def downgrade() -> None:
    """Only for empty disposable test databases; never erase publication history."""
    op.drop_table("demo_patient_publications")
