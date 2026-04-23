"""Add townships table for PostGIS reverse geocoding

Revision ID: 004
Revises: 003
Create Date: 2026-04-21

"""
from alembic import op
import sqlalchemy as sa
import geoalchemy2

revision = '004'
down_revision = '003'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "townships",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(30), nullable=False),
        sa.Column("county", sa.String(30), nullable=False),
        sa.Column(
            "geom",
            geoalchemy2.types.Geometry("MULTIPOLYGON", srid=4326),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_townships_geom", "townships", ["geom"], postgresql_using="gist")


def downgrade() -> None:
    op.drop_index("ix_townships_geom", table_name="townships")
    op.drop_table("townships")
