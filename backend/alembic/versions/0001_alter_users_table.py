"""Alter users table

Revision ID: 0001_alter_users
Revises: d2f9a4f38ca4
Create Date: 2026-05-18 00:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0001_alter_users"
down_revision: str | Sequence[str] | None = "d2f9a4f38ca4"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.alter_column("libraries", "size", type_=sa.Integer(), postgresql_using="0")
    op.add_column("users", sa.Column("avatar_initials", sa.String(4), nullable=True))
    op.add_column("users", sa.Column("plan", sa.String(20), nullable=False, server_default="free"))
    op.add_column("users", sa.Column("onboarding_completed", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("users", sa.Column("updated_at", sa.DateTime(), server_default=sa.text("NOW()")))
    op.alter_column("users", "hashed_password", nullable=True)
    op.alter_column("users", "full_name", nullable=False)


def downgrade() -> None:
    op.alter_column("users", "full_name", nullable=True)
    op.alter_column("users", "hashed_password", nullable=False)
    op.drop_column("users", "updated_at")
    op.drop_column("users", "onboarding_completed")
    op.drop_column("users", "plan")
    op.drop_column("users", "avatar_initials")
