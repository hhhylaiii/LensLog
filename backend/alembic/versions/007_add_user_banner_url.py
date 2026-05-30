"""Add banner_url to users

Revision ID: 007
Revises: 006
Create Date: 2026-05-30

"""

from alembic import op
import sqlalchemy as sa


revision = "007"
down_revision = "006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("banner_url", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "banner_url")
