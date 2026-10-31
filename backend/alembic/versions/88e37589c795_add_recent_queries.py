"""add_recent_queries

Revision ID: 88e37589c795
Revises: b3fe622296c9
Create Date: 2026-05-19 12:06:09.925640

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import context, op

revision: str = "88e37589c795"
down_revision: str | Sequence[str] | None = "b3fe622296c9"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _already_created() -> bool:
    """The initial migration creates this table, so a database built from scratch has it by now.

    Only a database whose initial migration predates the table still needs it here. A generated SQL script
    (offline mode) cannot look at a database, so it assumes a database built from scratch.
    """
    if context.is_offline_mode():
        return True
    return sa.inspect(op.get_bind()).has_table("recent_queries")


def upgrade() -> None:
    if _already_created():
        return
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
    # The initial migration owns this table and drops it when it is downgraded.
    pass
