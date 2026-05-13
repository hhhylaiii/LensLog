"""Add tags array to photos

Revision ID: 005
Revises: 004
Create Date: 2026-05-13

"""
from alembic import op
import sqlalchemy as sa


revision = "005"
down_revision = "004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "photos",
        sa.Column(
            "tags",
            sa.ARRAY(sa.String(length=50)),
            nullable=False,
            server_default="{}",
        ),
    )


def downgrade() -> None:
    op.drop_column("photos", "tags")
