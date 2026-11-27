"""Store the selected non-actionable synthetic card on publication events.

Revision ID: 0015_demo_patient_card_selection
Revises: 0014_manual_observations
"""

import sqlalchemy as sa

from alembic import op

revision = "0015_demo_patient_card_selection"
down_revision = "0014_manual_observations"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "demo_patient_publications",
        sa.Column("card_code", sa.String(40), nullable=True),
    )
    op.add_column(
        "demo_patient_publications",
        sa.Column("card_title", sa.String(100), nullable=True),
    )


def downgrade() -> None:
    """Only for an empty disposable database; never erase populated history."""
    op.drop_column("demo_patient_publications", "card_title")
    op.drop_column("demo_patient_publications", "card_code")
