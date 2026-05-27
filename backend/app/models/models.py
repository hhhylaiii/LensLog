import uuid
from datetime import datetime, date
from typing import Any

from geoalchemy2 import Geometry
from sqlalchemy import (
    ARRAY, UUID, Boolean, Date, DateTime, ForeignKey,
    Integer, Numeric, String, Text, func, text,
)
from sqlalchemy import event
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


@event.listens_for(Base.metadata, "before_create")
def _ensure_postgis_extension(target, connection, **kwargs):
    """Ensure PostGIS types exist before creating tables that use geometry."""
    if connection.dialect.name == "postgresql":
        connection.execute(text("CREATE EXTENSION IF NOT EXISTS postgis"))


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    avatar_url: Mapped[str | None] = mapped_column(Text)
    bio: Mapped[str | None] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    photos: Mapped[list["Photo"]] = relationship("Photo", back_populates="user")
    locations: Mapped[list["Location"]] = relationship("Location", back_populates="user")
    gear: Mapped[list["Gear"]] = relationship("Gear", back_populates="user")


class Location(Base):
    __tablename__ = "locations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    latitude: Mapped[float] = mapped_column(Numeric(10, 7), nullable=False)
    longitude: Mapped[float] = mapped_column(Numeric(10, 7), nullable=False)
    geom: Mapped[Any | None] = mapped_column(Geometry("POINT", srid=4326), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship("User", back_populates="locations")
    photos: Mapped[list["Photo"]] = relationship("Photo", back_populates="location")
    tags: Mapped[list["LocationTag"]] = relationship("LocationTag", back_populates="location", cascade="all, delete-orphan")


class LocationTag(Base):
    __tablename__ = "location_tags"

    location_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("locations.id", ondelete="CASCADE"), primary_key=True)
    tag: Mapped[str] = mapped_column(String(50), primary_key=True)

    location: Mapped["Location"] = relationship("Location", back_populates="tags")


class Photo(Base):
    __tablename__ = "photos"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    location_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("locations.id", ondelete="SET NULL"))
    s3_key: Mapped[str] = mapped_column(Text, nullable=False)
    thumb_key: Mapped[str | None] = mapped_column(Text)
    caption: Mapped[str | None] = mapped_column(Text)
    tags: Mapped[list[str]] = mapped_column(ARRAY(String(50)), nullable=False, default=list, server_default="{}")
    is_public: Mapped[bool] = mapped_column(Boolean, default=True)
    taken_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship("User", back_populates="photos")
    location: Mapped["Location"] = relationship("Location", back_populates="photos")
    exif: Mapped["ExifData"] = relationship("ExifData", back_populates="photo", uselist=False, cascade="all, delete-orphan")


class ExifData(Base):
    __tablename__ = "exif_data"

    photo_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("photos.id", ondelete="CASCADE"), primary_key=True)
    make: Mapped[str | None] = mapped_column(String(100))
    model: Mapped[str | None] = mapped_column(String(100))
    lens_model: Mapped[str | None] = mapped_column(String(200))
    focal_length: Mapped[float | None] = mapped_column(Numeric(6, 2))
    focal_length_35: Mapped[float | None] = mapped_column(Numeric(6, 2))
    aperture: Mapped[float | None] = mapped_column(Numeric(5, 2))
    shutter_speed: Mapped[str | None] = mapped_column(String(20))
    iso: Mapped[int | None] = mapped_column(Integer)
    gps_lat: Mapped[float | None] = mapped_column(Numeric(10, 7))
    gps_lng: Mapped[float | None] = mapped_column(Numeric(10, 7))
    width: Mapped[int | None] = mapped_column(Integer)
    height: Mapped[int | None] = mapped_column(Integer)

    photo: Mapped["Photo"] = relationship("Photo", back_populates="exif")


class Township(Base):
    __tablename__ = "townships"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(30), nullable=False)
    county: Mapped[str] = mapped_column(String(30), nullable=False)
    geom: Mapped[Any] = mapped_column(Geometry("MULTIPOLYGON", srid=4326), nullable=False)


class Gear(Base):
    __tablename__ = "gear"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    type: Mapped[str] = mapped_column(String(50), nullable=False)  # body/lens/flash/tripod/filter/memory_card
    brand: Mapped[str | None] = mapped_column(String(100))
    model: Mapped[str] = mapped_column(String(200), nullable=False)
    serial_number: Mapped[str | None] = mapped_column(String(100))
    purchase_date: Mapped[date | None] = mapped_column(Date)
    notes: Mapped[str | None] = mapped_column(Text)
    maintenance_interval_days: Mapped[int | None] = mapped_column(Integer)
    last_maintained: Mapped[date | None] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship("User", back_populates="gear")
