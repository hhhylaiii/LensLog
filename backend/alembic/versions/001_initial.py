"""Initial migration

Revision ID: 001
Revises:
Create Date: 2026-03-26

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # users table
    op.create_table(
        'users',
        sa.Column('id', sa.UUID(as_uuid=True), primary_key=True),
        sa.Column('username', sa.String(50), nullable=False, unique=True),
        sa.Column('email', sa.String(255), nullable=False, unique=True),
        sa.Column('password_hash', sa.String(255), nullable=False),
        sa.Column('avatar_url', sa.Text, nullable=True),
        sa.Column('bio', sa.Text, nullable=True),
        sa.Column('is_active', sa.Boolean, nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_users_email', 'users', ['email'], unique=True)
    op.create_index('ix_users_username', 'users', ['username'], unique=True)

    # locations table
    op.create_table(
        'locations',
        sa.Column('id', sa.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', sa.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('latitude', sa.Numeric(10, 7), nullable=False),
        sa.Column('longitude', sa.Numeric(10, 7), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_locations_user_id', 'locations', ['user_id'])

    # location_tags table (composite PK)
    op.create_table(
        'location_tags',
        sa.Column('location_id', sa.UUID(as_uuid=True), sa.ForeignKey('locations.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('tag', sa.String(50), primary_key=True),
    )

    # photos table
    op.create_table(
        'photos',
        sa.Column('id', sa.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', sa.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('location_id', sa.UUID(as_uuid=True), sa.ForeignKey('locations.id', ondelete='SET NULL'), nullable=True),
        sa.Column('s3_key', sa.Text, nullable=False),
        sa.Column('thumb_key', sa.Text, nullable=True),
        sa.Column('caption', sa.Text, nullable=True),
        sa.Column('is_public', sa.Boolean, nullable=False, server_default='true'),
        sa.Column('taken_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_photos_user_id', 'photos', ['user_id'])
    op.create_index('ix_photos_location_id', 'photos', ['location_id'])
    op.create_index('ix_photos_is_public', 'photos', ['is_public'])

    # exif_data table
    op.create_table(
        'exif_data',
        sa.Column('photo_id', sa.UUID(as_uuid=True), sa.ForeignKey('photos.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('make', sa.String(100), nullable=True),
        sa.Column('model', sa.String(100), nullable=True),
        sa.Column('lens_model', sa.String(200), nullable=True),
        sa.Column('focal_length', sa.Numeric(6, 2), nullable=True),
        sa.Column('focal_length_35', sa.Numeric(6, 2), nullable=True),
        sa.Column('aperture', sa.Numeric(5, 2), nullable=True),
        sa.Column('shutter_speed', sa.String(20), nullable=True),
        sa.Column('iso', sa.Integer, nullable=True),
        sa.Column('gps_lat', sa.Numeric(10, 7), nullable=True),
        sa.Column('gps_lng', sa.Numeric(10, 7), nullable=True),
        sa.Column('width', sa.Integer, nullable=True),
        sa.Column('height', sa.Integer, nullable=True),
    )

    # gear table
    op.create_table(
        'gear',
        sa.Column('id', sa.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', sa.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('type', sa.String(50), nullable=False),
        sa.Column('brand', sa.String(100), nullable=True),
        sa.Column('model', sa.String(200), nullable=False),
        sa.Column('serial_number', sa.String(100), nullable=True),
        sa.Column('purchase_date', sa.Date, nullable=True),
        sa.Column('notes', sa.Text, nullable=True),
        sa.Column('maintenance_interval_days', sa.Integer, nullable=True),
        sa.Column('last_maintained', sa.Date, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_gear_user_id', 'gear', ['user_id'])


def downgrade() -> None:
    op.drop_table('gear')
    op.drop_table('exif_data')
    op.drop_table('photos')
    op.drop_table('location_tags')
    op.drop_table('locations')
    op.drop_table('users')
