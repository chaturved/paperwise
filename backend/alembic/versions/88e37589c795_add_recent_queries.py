"""add_recent_queries

Revision ID: 88e37589c795
Revises: b3fe622296c9
Create Date: 2026-05-19 12:06:09.925640

"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = '88e37589c795'
down_revision: str | Sequence[str] | None = 'b3fe622296c9'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "recent_queries",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("query", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_recent_queries_id"), "recent_queries", ["id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_recent_queries_id"), table_name="recent_queries")
    op.drop_table("recent_queries")
