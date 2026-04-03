"""Add geom column to locations

Revision ID: 003
Revises: 002
Create Date: 2026-04-03

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '003'
down_revision = '002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute('CREATE EXTENSION IF NOT EXISTS postgis')
    op.add_column('locations', sa.Column('geom', sa.Text(), nullable=True))
    op.execute('ALTER TABLE locations ALTER COLUMN geom TYPE geometry(Point,4326) USING ST_SetSRID(ST_MakePoint(longitude::float, latitude::float),4326)')
    op.execute('CREATE INDEX idx_locations_geom ON locations USING GIST(geom)')


def downgrade() -> None:
    op.execute('DROP INDEX IF EXISTS idx_locations_geom')
    op.drop_column('locations', 'geom')
