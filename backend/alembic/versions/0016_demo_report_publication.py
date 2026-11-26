"""Link synthetic patient feedback to an existing publication version."""

import sqlalchemy as sa

from alembic import op

revision = "0016_demo_report_publication"
down_revision = "0015_demo_patient_card_selection"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "demo_patient_report_revisions", sa.Column("publication_version", sa.Integer())
    )
    op.create_foreign_key(
        "fk_demo_report_publication",
        "demo_patient_report_revisions",
        "demo_patient_publications",
        ["participant_id", "publication_version"],
        ["participant_id", "version"],
    )


def downgrade() -> None:
    """Only for a disposable environment."""
    op.drop_constraint(
        "fk_demo_report_publication", "demo_patient_report_revisions", type_="foreignkey"
    )
    op.drop_column("demo_patient_report_revisions", "publication_version")
