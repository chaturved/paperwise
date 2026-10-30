# backend/alembic/versions/0009_chunk_page_number.py
"""add the source page number to library chunks

Revision ID: 0009
Revises: 0008
Create Date: 2026-10-30
"""
import sqlalchemy as sa

from alembic import op

revision = "0009"
down_revision = "0008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Chunks indexed before this migration have no page; documents are re-processed to fill it in.
    op.add_column("library_chunks", sa.Column("page_number", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("library_chunks", "page_number")
