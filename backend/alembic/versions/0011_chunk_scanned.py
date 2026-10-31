"""record which library chunks were read from a scan

Revision ID: 0011
Revises: 0010
Create Date: 2026-10-31
"""

import sqlalchemy as sa

from alembic import op

revision = "0011"
down_revision = "0010"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("library_chunks", sa.Column("scanned", sa.Boolean(), nullable=False, server_default=sa.false()))


def downgrade() -> None:
    op.drop_column("library_chunks", "scanned")
