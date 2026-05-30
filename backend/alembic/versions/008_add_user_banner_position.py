"""Add banner_pos_x and banner_pos_y to users

Revision ID: 008
Revises: 007
Create Date: 2026-05-30

"""

from alembic import op
import sqlalchemy as sa


revision = "008"
down_revision = "007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("banner_pos_x", sa.Float(), nullable=False, server_default="50.0"))
    op.add_column("users", sa.Column("banner_pos_y", sa.Float(), nullable=False, server_default="50.0"))


def downgrade() -> None:
    op.drop_column("users", "banner_pos_y")
    op.drop_column("users", "banner_pos_x")
