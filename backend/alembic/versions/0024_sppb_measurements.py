"""Keep timing candidates and append-only human timing reviews separate."""

import sqlalchemy as sa

from alembic import op

revision = "0024_sppb_measurements"
down_revision = "0023_pose_v3_free_text_reasons"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "sppb_measurements",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("source_analysis_id", sa.Uuid(), sa.ForeignKey("pose_analyses.id"),
                  nullable=False),
        sa.Column("algorithm_version", sa.String(64), nullable=False),
        sa.Column("result", sa.JSON(), nullable=False),
        sa.Column("created_by", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("algorithm_version = 'sppb-measure-v1'", name="ck_sppb_algorithm"),
    )
    op.create_index("ix_sppb_source_created", "sppb_measurements",
                    ["source_analysis_id", "created_at"])
    op.create_table(
        "sppb_reviews",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("measurement_id", sa.Uuid(), sa.ForeignKey("sppb_measurements.id"),
                  nullable=False),
        sa.Column("revision_no", sa.Integer(), nullable=False),
        sa.Column("decision", sa.String(32), nullable=False),
        sa.Column("start_ms", sa.Float(), nullable=True),
        sa.Column("fifth_stand_ms", sa.Float(), nullable=True),
        sa.Column("reason", sa.String(1000), nullable=False),
        sa.Column("recorded_by", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("recorded_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("measurement_id", "revision_no"),
        sa.CheckConstraint("revision_no > 0", name="ck_sppb_review_revision"),
        sa.CheckConstraint(
            "decision IN ('accepted_timing','modified_timing','needs_retake','rejected')",
            name="ck_sppb_review_decision",
        ),
        sa.CheckConstraint(
            "(decision = 'modified_timing' AND start_ms IS NOT NULL "
            "AND fifth_stand_ms IS NOT NULL AND start_ms >= 0 "
            "AND fifth_stand_ms > start_ms AND fifth_stand_ms <= 300000) OR "
            "(decision <> 'modified_timing' AND start_ms IS NULL AND fifth_stand_ms IS NULL)",
            name="ck_sppb_review_timing",
        ),
    )


def downgrade() -> None:
    # Serialize the emptiness check with writers; never drop recorded evidence.
    op.execute("LOCK TABLE sppb_measurements, sppb_reviews IN ACCESS EXCLUSIVE MODE")
    if op.get_bind().scalar(sa.text("SELECT count(*) FROM sppb_measurements")):
        raise RuntimeError("SPPB measurement evidence exists; downgrade refused")
    op.drop_table("sppb_reviews")
    op.drop_index("ix_sppb_source_created", table_name="sppb_measurements")
    op.drop_table("sppb_measurements")
