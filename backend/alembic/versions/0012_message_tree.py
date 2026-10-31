"""keep messages as a tree so a question can be edited and an answer retried without losing the old version

Revision ID: 0012
Revises: 0011
Create Date: 2026-10-31
"""
import sqlalchemy as sa

from alembic import op

revision = "0012"
down_revision = "0011"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("messages", sa.Column("parent_id", sa.Integer(), nullable=True))
    op.create_index("ix_messages_parent_id", "messages", ["parent_id"])
    op.create_foreign_key("fk_messages_parent", "messages", "messages", ["parent_id"], ["id"], ondelete="CASCADE")
    op.add_column("conversations", sa.Column("active_leaf_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_conversations_active_leaf", "conversations", "messages", ["active_leaf_id"], ["id"], ondelete="SET NULL"
    )
    # Existing conversations were a straight line: each message becomes the child of the one before it.
    op.execute(
        """
        UPDATE messages m SET parent_id = p.previous_id
        FROM (
            SELECT id, LAG(id) OVER (PARTITION BY conversation_id ORDER BY created_at, id) AS previous_id
            FROM messages
        ) p
        WHERE m.id = p.id
        """
    )
    op.execute(
        """
        UPDATE conversations c SET active_leaf_id = (
            SELECT m.id FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC, m.id DESC LIMIT 1
        )
        """
    )


def downgrade() -> None:
    op.drop_constraint("fk_conversations_active_leaf", "conversations", type_="foreignkey")
    op.drop_column("conversations", "active_leaf_id")
    op.drop_constraint("fk_messages_parent", "messages", type_="foreignkey")
    op.drop_index("ix_messages_parent_id", table_name="messages")
    op.drop_column("messages", "parent_id")
