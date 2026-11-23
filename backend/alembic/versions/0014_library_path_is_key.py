"""store the storage key in libraries.path instead of a full Supabase-style URL

Revision ID: 0014
Revises: 0013
Create Date: 2026-11-23
"""

import sqlalchemy as sa

from alembic import op
from src.config import settings

revision = "0014"
down_revision = "0013"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # "https://host/storage/v1/s3/object/library/7/<uuid>/a.pdf" -> "7/<uuid>/a.pdf". Rows that already hold a key
    # (no "://") are left alone, so running this twice changes nothing.
    op.execute("UPDATE libraries SET path = regexp_replace(path, '^.*/object/[^/]+/', '') WHERE path LIKE '%://%'")


def downgrade() -> None:
    prefix = f"{settings.S3_ENDPOINT}/object/{settings.S3_LIBRARY_BUCKET}/"
    op.execute(
        sa.text(
            "UPDATE libraries SET path = :prefix || path WHERE path IS NOT NULL AND path NOT LIKE '%://%'"
        ).bindparams(prefix=prefix)
    )
