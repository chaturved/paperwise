"""add query_usage_log table

Revision ID: 0005
Revises: 0004_waitlist
Create Date: 2026-05-21
"""

import sqlalchemy as sa

from alembic import op

revision = "0005"
down_revision = "0004_waitlist"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "query_usage_log",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_query_usage_log_user_id", "query_usage_log", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_query_usage_log_user_id", "query_usage_log")
    op.drop_table("query_usage_log")
