"""Append-only synthetic consent and screening intake.

Revision ID: 0003_synthetic_intake
Revises: 0002_auth_scope
"""

import sqlalchemy as sa

from alembic import op

revision = "0003_synthetic_intake"
down_revision = "0002_auth_scope"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "write_receipts",
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id"), primary_key=True),
        sa.Column("route_key", sa.String(80), primary_key=True),
        sa.Column("key", sa.String(128), primary_key=True),
        sa.Column("payload_hash", sa.String(64), nullable=False),
        sa.Column("resource_id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "consent_records",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("participant_id", sa.Uuid(), sa.ForeignKey("participants.id"), nullable=False),
        sa.Column("document_version", sa.String(64), nullable=False),
        sa.Column("purpose_code", sa.String(64), nullable=False),
        sa.Column("decision", sa.String(20), nullable=False),
        sa.Column("photo_scope", sa.Boolean(), nullable=False),
        sa.Column("change_reason", sa.String(240)),
        sa.Column("recorded_by", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("recorded_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "decision IN ('granted','refused','withdrawn')", name="ck_consent_decision"
        ),
        sa.CheckConstraint(
            "NOT photo_scope OR decision = 'granted'", name="ck_consent_photo_scope"
        ),
    )
    op.create_index(
        "ix_consent_participant_time", "consent_records", ["participant_id", "recorded_at"]
    )
    op.create_table(
        "screening_records",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("participant_id", sa.Uuid(), sa.ForeignKey("participants.id"), nullable=False),
        sa.Column("item_code", sa.String(64), nullable=False),
        sa.Column("answer", sa.String(10), nullable=False),
        sa.Column("change_reason", sa.String(240)),
        sa.Column("recorded_by", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("recorded_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("answer IN ('yes','no','unknown')", name="ck_screening_answer"),
    )
    op.create_index(
        "ix_screening_participant_time", "screening_records", ["participant_id", "recorded_at"]
    )


def downgrade() -> None:
    op.drop_index("ix_screening_participant_time", table_name="screening_records")
    op.drop_table("screening_records")
    op.drop_index("ix_consent_participant_time", table_name="consent_records")
    op.drop_table("consent_records")
    op.drop_table("write_receipts")
