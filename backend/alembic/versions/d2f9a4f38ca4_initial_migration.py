"""Initial migration

Revision ID: d2f9a4f38ca4
Revises:
Create Date: 2025-10-04 17:16:04.912425

"""

from collections.abc import Sequence

import pgvector.sqlalchemy as pg
import sqlalchemy as sa

from alembic import op

revision: str = "d2f9a4f38ca4"
down_revision: str | Sequence[str] | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("full_name", sa.String(), nullable=True),
        sa.Column("hashed_password", sa.String(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )
    op.create_table(
        "libraries",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("size", sa.String(), nullable=False),
        sa.Column("type", sa.String(), nullable=False),
        sa.Column("path", sa.String(), nullable=True),
        sa.Column("extracted_text", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "recent_queries",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("query", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_recent_queries_id"), "recent_queries", ["id"], unique=False)
    op.create_table(
        "library_chunks",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("library_id", sa.Integer(), nullable=False),
        sa.Column("chunk_index", sa.Integer(), nullable=False),
        sa.Column("chunk_text", sa.Text(), nullable=False),
        sa.Column("embedding", pg.VECTOR(dim=384), nullable=True),
        sa.ForeignKeyConstraint(
            ["library_id"],
            ["libraries.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_library_chunks_id"), "library_chunks", ["id"], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f("ix_library_chunks_id"), table_name="library_chunks")
    op.drop_table("library_chunks")
    op.drop_index(op.f("ix_recent_queries_id"), table_name="recent_queries")
    op.drop_table("recent_queries")
    op.drop_table("libraries")
    op.drop_table("users")
