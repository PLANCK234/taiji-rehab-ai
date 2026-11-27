"""Synthetic patient role and self-only account binding.

Revision ID: 0008_demo_patient_binding
Revises: 0007_demo_completed_actions
"""

import sqlalchemy as sa

from alembic import op

revision = "0008_demo_patient_binding"
down_revision = "0007_demo_completed_actions"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_constraint("ck_users_role", "users", type_="check")
    op.create_check_constraint(
        "ck_users_role", "users",
        "role IN ('clinician','clinical_approver','research_assistant',"
        "'analyst','admin','patient')",
    )
    op.create_table(
        "demo_patient_bindings",
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id"), primary_key=True),
        sa.Column(
            "participant_id", sa.Uuid(), sa.ForeignKey("participants.id"),
            nullable=False, unique=True,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True)),
    )


def downgrade() -> None:
    """Disposable empty test databases only; never remove live binding history."""
    op.drop_table("demo_patient_bindings")
    op.drop_constraint("ck_users_role", "users", type_="check")
    op.create_check_constraint(
        "ck_users_role", "users",
        "role IN ('clinician','clinical_approver','research_assistant','analyst','admin')",
    )
