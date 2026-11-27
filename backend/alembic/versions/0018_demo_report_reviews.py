"""Add independent append-only staff reviews of synthetic task feedback."""

import sqlalchemy as sa

from alembic import op

revision = "0018_demo_report_reviews"
down_revision = "0017_demo_report_pose_summary"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "demo_patient_report_reviews",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("report_revision_id", sa.Uuid(),
                  sa.ForeignKey("demo_patient_report_revisions.id"), nullable=False),
        sa.Column("review_no", sa.Integer(), nullable=False),
        sa.Column("result", sa.String(20), nullable=False),
        sa.Column("note", sa.String(500), nullable=False),
        sa.Column("recorded_by", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("recorded_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("report_revision_id", "review_no"),
        sa.CheckConstraint("review_no > 0", name="ck_report_review_no"),
        sa.CheckConstraint("result IN ('reviewed','unable')", name="ck_report_review_result"),
        sa.CheckConstraint("length(trim(note)) BETWEEN 1 AND 500", name="ck_report_review_note"),
    )


def downgrade() -> None:
    """Disposable databases only; never downgrade a populated demonstration database."""
    op.drop_table("demo_patient_report_reviews")
