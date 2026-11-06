"""Synthetic manual raw observation revisions."""

import sqlalchemy as sa

from alembic import op

revision = "0014_manual_observations"
down_revision = "0013_demo_profile_revisions"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "manual_observation_revisions",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("observation_id", sa.Uuid(), nullable=False),
        sa.Column("participant_id", sa.Uuid(), sa.ForeignKey("participants.id"), nullable=False),
        sa.Column("revision_no", sa.Integer(), nullable=False),
        sa.Column("snapshot", sa.JSON(), nullable=False),
        sa.Column("recorded_by", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("recorded_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("observation_id", "revision_no"),
        sa.CheckConstraint("revision_no > 0", name="ck_manual_observation_revision"),
    )


def downgrade():
    op.drop_table("manual_observation_revisions")
