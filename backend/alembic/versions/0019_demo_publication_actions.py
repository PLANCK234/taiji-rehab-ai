"""Store the immutable synthetic Taiji selection on publication events."""

import sqlalchemy as sa

from alembic import op

revision = "0019_demo_publication_actions"
down_revision = "0018_demo_report_reviews"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("demo_patient_publications", sa.Column("actions", sa.JSON()))


def downgrade() -> None:
    """Only for a disposable database."""
    op.drop_column("demo_patient_publications", "actions")
