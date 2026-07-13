"""Chats jadvaliga is_archived ustuni qo'shish (Sidebar Archive bo'limi uchun)

Revision ID: 0002_chat_archive
Revises: 0001_initial
Create Date: 2026-07-09
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0002_chat_archive"
down_revision: Union[str, None] = "0001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "chats",
        sa.Column("is_archived", sa.Boolean(), nullable=False, server_default=sa.false()),
    )


def downgrade() -> None:
    op.drop_column("chats", "is_archived")
