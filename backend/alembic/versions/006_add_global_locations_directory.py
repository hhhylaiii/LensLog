"""Add global locations and split photo location links

Revision ID: 006
Revises: 005
Create Date: 2026-05-21

"""

from alembic import op
import sqlalchemy as sa
import geoalchemy2


revision = "006"
down_revision = "005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "global_locations",
        sa.Column("id", sa.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("latitude", sa.Numeric(10, 7), nullable=False),
        sa.Column("longitude", sa.Numeric(10, 7), nullable=False),
        sa.Column("geom", geoalchemy2.types.Geometry("POINT", srid=4326), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_global_locations_geom", "global_locations", ["geom"], postgresql_using="gist")

    op.add_column("photos", sa.Column("user_location_id", sa.UUID(as_uuid=True), nullable=True))
    op.add_column("photos", sa.Column("global_location_id", sa.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key(
        "fk_photos_user_location_id",
        "photos",
        "locations",
        ["user_location_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_foreign_key(
        "fk_photos_global_location_id",
        "photos",
        "global_locations",
        ["global_location_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_photos_user_location_id", "photos", ["user_location_id"])
    op.create_index("ix_photos_global_location_id", "photos", ["global_location_id"])

    op.execute("UPDATE photos SET user_location_id = location_id WHERE location_id IS NOT NULL")
    op.drop_index("ix_photos_location_id", table_name="photos")
    op.drop_constraint("photos_location_id_fkey", "photos", type_="foreignkey")
    op.drop_column("photos", "location_id")

    op.execute(
        """
        INSERT INTO global_locations (id, name, description, latitude, longitude, geom, is_active)
        VALUES
          (
            '11111111-1111-1111-1111-111111111101',
            '台北101',
            '台北代表性地標與城市夜景拍攝熱點',
            25.033968,
            121.564468,
            ST_SetSRID(ST_MakePoint(121.564468, 25.033968), 4326),
            true
          ),
          (
            '11111111-1111-1111-1111-111111111102',
            '中正紀念堂',
            '台北經典建築與廣場構圖地標',
            25.034535,
            121.521240,
            ST_SetSRID(ST_MakePoint(121.521240, 25.034535), 4326),
            true
          ),
          (
            '11111111-1111-1111-1111-111111111103',
            '象山',
            '俯瞰台北市景與台北101的熱門拍攝點',
            25.027055,
            121.570370,
            ST_SetSRID(ST_MakePoint(121.570370, 25.027055), 4326),
            true
          )
        """
    )


def downgrade() -> None:
    op.add_column("photos", sa.Column("location_id", sa.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key(
        "photos_location_id_fkey",
        "photos",
        "locations",
        ["location_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_photos_location_id", "photos", ["location_id"])
    op.execute("UPDATE photos SET location_id = user_location_id WHERE user_location_id IS NOT NULL")

    op.drop_index("ix_photos_global_location_id", table_name="photos")
    op.drop_index("ix_photos_user_location_id", table_name="photos")
    op.drop_constraint("fk_photos_global_location_id", "photos", type_="foreignkey")
    op.drop_constraint("fk_photos_user_location_id", "photos", type_="foreignkey")
    op.drop_column("photos", "global_location_id")
    op.drop_column("photos", "user_location_id")

    op.drop_index("ix_global_locations_geom", table_name="global_locations")
    op.drop_table("global_locations")
