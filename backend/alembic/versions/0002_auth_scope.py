"""Synthetic-only staff auth and coded participant scope.

Revision ID: 0002_auth_scope
Revises: 0001_baseline
"""

import sqlalchemy as sa

from alembic import op

revision = "0002_auth_scope"
down_revision = "0001_baseline"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("email", sa.String(320), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(512), nullable=False),
        sa.Column("role", sa.String(40), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "role IN ('clinician','clinical_approver','research_assistant','analyst','admin')",
            name="ck_users_role",
        ),
    )
    op.create_table(
        "studies",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("code", sa.String(64), nullable=False, unique=True),
    )
    op.create_table(
        "participants",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("study_id", sa.Uuid(), sa.ForeignKey("studies.id"), nullable=False),
        sa.Column("study_code", sa.String(64), nullable=False),
        sa.UniqueConstraint("study_id", "study_code"),
    )
    op.create_index("ix_participants_study_id", "participants", ["study_id"])
    op.create_table(
        "study_assignments",
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id"), primary_key=True),
        sa.Column("study_id", sa.Uuid(), sa.ForeignKey("studies.id"), primary_key=True),
    )
    op.create_table(
        "participant_assignments",
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id"), primary_key=True),
        sa.Column("participant_id", sa.Uuid(), sa.ForeignKey("participants.id"), primary_key=True),
    )
    op.create_table(
        "login_sessions",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("token_hash", sa.String(64), nullable=False, unique=True),
        sa.Column("csrf_hash", sa.String(64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True)),
    )
    op.create_index("ix_login_sessions_user_id", "login_sessions", ["user_id"])
    op.create_table(
        "login_rate_limits",
        sa.Column("key_hash", sa.String(64), primary_key=True),
        sa.Column("failures", sa.Integer(), nullable=False),
        sa.Column("window_started_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("failures >= 0", name="ck_login_rate_failures"),
    )
    op.create_table(
        "audit_events",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("actor_id", sa.Uuid(), sa.ForeignKey("users.id")),
        sa.Column("action", sa.String(80), nullable=False),
        sa.Column("resource_type", sa.String(40), nullable=False),
        sa.Column("resource_id", sa.Uuid()),
        sa.Column("outcome", sa.String(20), nullable=False),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_audit_events_actor_time", "audit_events", ["actor_id", "occurred_at"])


def downgrade() -> None:
    op.drop_index("ix_audit_events_actor_time", table_name="audit_events")
    op.drop_table("audit_events")
    op.drop_table("login_rate_limits")
    op.drop_index("ix_login_sessions_user_id", table_name="login_sessions")
    op.drop_table("login_sessions")
    op.drop_table("participant_assignments")
    op.drop_table("study_assignments")
    op.drop_index("ix_participants_study_id", table_name="participants")
    op.drop_table("participants")
    op.drop_table("studies")
    op.drop_table("users")
