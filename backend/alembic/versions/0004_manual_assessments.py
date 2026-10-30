"""Synthetic manual SPPB total assessments with append-only revisions.

Revision ID: 0004_manual_assessments
Revises: 0003_synthetic_intake
"""

import sqlalchemy as sa

from alembic import op

revision = "0004_manual_assessments"
down_revision = "0003_synthetic_intake"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "assessments",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("participant_id", sa.Uuid(), sa.ForeignKey("participants.id"), nullable=False),
        sa.Column("visit_kind", sa.String(16), nullable=False),
        sa.Column("protocol_version", sa.String(64), nullable=False),
        sa.Column("created_by", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("visit_kind IN ('baseline','revisit')", name="ck_assessment_visit_kind"),
    )
    op.create_index(
        "ix_assessments_participant_created", "assessments", ["participant_id", "created_at"]
    )
    op.create_table(
        "assessment_revisions",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("assessment_id", sa.Uuid(), sa.ForeignKey("assessments.id"), nullable=False),
        sa.Column("revision_no", sa.Integer(), nullable=False),
        sa.Column("state", sa.String(16), nullable=False),
        sa.Column("metric_code", sa.String(32), nullable=False),
        sa.Column("raw_value", sa.Integer()),
        sa.Column("unit", sa.String(16), nullable=False),
        sa.Column("validity", sa.String(16), nullable=False),
        sa.Column("missing_reason", sa.String(32)),
        sa.Column("performed_at", sa.DateTime(timezone=True)),
        sa.Column("source", sa.String(32), nullable=False),
        sa.Column("change_reason", sa.String(64)),
        sa.Column("recorded_by", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("recorded_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("assessment_id", "revision_no"),
        sa.CheckConstraint("revision_no > 0", name="ck_assessment_revision_positive"),
        sa.CheckConstraint("state IN ('draft','confirmed')", name="ck_assessment_revision_state"),
        sa.CheckConstraint("metric_code = 'sppb_total'", name="ck_assessment_metric"),
        sa.CheckConstraint("unit = 'points'", name="ck_assessment_unit"),
        sa.CheckConstraint("source = 'manual_staff_entry'", name="ck_assessment_source"),
        sa.CheckConstraint(
            "missing_reason IS NULL OR missing_reason IN "
            "('not_scheduled','not_attempted','declined','unsafe_to_attempt',"
            "'technical_failure','lost_followup','unknown')",
            name="ck_assessment_missing_reason",
        ),
        sa.CheckConstraint(
            "(validity = 'unrecorded' AND raw_value IS NULL AND missing_reason IS NULL "
            "AND performed_at IS NULL AND state = 'draft') OR "
            "(validity = 'valid' AND raw_value BETWEEN 0 AND 12 "
            "AND missing_reason IS NULL AND performed_at IS NOT NULL) OR "
            "(validity = 'missing' AND raw_value IS NULL AND missing_reason IS NOT NULL "
            "AND performed_at IS NULL) OR "
            "(validity = 'invalid' AND missing_reason IS NOT NULL)",
            name="ck_assessment_value_state",
        ),
    )
    op.create_index(
        "ix_assessment_revisions_assessment_no",
        "assessment_revisions",
        ["assessment_id", "revision_no"],
    )


def downgrade() -> None:
    op.drop_index("ix_assessment_revisions_assessment_no", table_name="assessment_revisions")
    op.drop_table("assessment_revisions")
    op.drop_index("ix_assessments_participant_created", table_name="assessments")
    op.drop_table("assessments")
