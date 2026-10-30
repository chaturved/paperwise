"""add_message_feedback

Revision ID: b3fe622296c9
Revises: 0004_waitlist
Create Date: 2026-05-19

"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "b3fe622296c9"
down_revision: str | Sequence[str] | None = "0004_waitlist"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "message_feedback",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("message_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("value", sa.String(length=4), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["message_id"], ["messages.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("message_id", "user_id", name="uq_feedback_message_user"),
    )


def downgrade() -> None:
    op.drop_table("message_feedback")
