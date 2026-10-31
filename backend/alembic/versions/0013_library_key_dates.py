"""keep the key dates found in a document, so they are read from the document only once

Revision ID: 0013
Revises: 0012
Create Date: 2026-10-31
"""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "0013"
down_revision = "0012"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("libraries", sa.Column("key_dates", postgresql.JSONB(), nullable=True))


def downgrade() -> None:
    op.drop_column("libraries", "key_dates")
