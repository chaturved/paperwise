# backend/alembic/versions/0008_library_status.py
"""add processing status to libraries

Revision ID: 0008
Revises: 0007
Create Date: 2026-10-30
"""
import sqlalchemy as sa

from alembic import op

revision = "0008"
down_revision = "0007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Existing documents were fully processed at upload time, so they start as 'ready'.
    op.add_column("libraries", sa.Column("status", sa.String(length=20), nullable=False, server_default="ready"))
    op.add_column("libraries", sa.Column("error_message", sa.Text(), nullable=True))
    op.add_column("libraries", sa.Column("status_updated_at", sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column("libraries", "status_updated_at")
    op.drop_column("libraries", "error_message")
    op.drop_column("libraries", "status")
