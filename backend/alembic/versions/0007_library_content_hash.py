# backend/alembic/versions/0007_library_content_hash.py
"""add content_hash to libraries for dedup

Revision ID: 0007
Revises: 0006
Create Date: 2026-07-26
"""
import sqlalchemy as sa

from alembic import op

revision = "0007"
down_revision = "0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("libraries", sa.Column("content_hash", sa.String(length=64), nullable=True))
    op.create_unique_constraint("uq_libraries_user_content_hash", "libraries", ["user_id", "content_hash"])


def downgrade() -> None:
    op.drop_constraint("uq_libraries_user_content_hash", "libraries", type_="unique")
    op.drop_column("libraries", "content_hash")
