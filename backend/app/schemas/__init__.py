import uuid
from datetime import datetime, date
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator


# ─── Auth Schemas ────────────────────────────────────────────────────────────

class UserRegister(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=8)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: uuid.UUID
    username: str
    email: str
    avatar_url: Optional[str]
    bio: Optional[str]
    is_admin: bool = False
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Photo Schemas ────────────────────────────────────────────────────────────

class ExifResponse(BaseModel):
    make: Optional[str] = None
    model: Optional[str] = None
    lens_model: Optional[str] = None
    focal_length: Optional[float] = None
    focal_length_35: Optional[float] = None
    aperture: Optional[float] = None
    shutter_speed: Optional[str] = None
    iso: Optional[int] = None
    gps_lat: Optional[float] = None
    gps_lng: Optional[float] = None
    width: Optional[int] = None
    height: Optional[int] = None

    class Config:
        from_attributes = True


class PhotoCreate(BaseModel):
    s3_key: str = Field(
        ...,
        description="Object key returned by POST /api/v1/photos/presign.",
        examples=["photos/c2fd4c7a-3ef1-47b8-a402-b6565516d1da/taipei-street.jpg"],
    )
    thumb_key: Optional[str] = Field(
        default=None,
        description="Optional thumbnail object key. Usually omitted because thumbnails are generated asynchronously.",
        examples=["thumbnails/800/8b1f2e70-50c9-4b8a-a7a0-7f8f5e0e1c21.jpg"],
    )
    caption: Optional[str] = Field(
        default=None,
        description="User-provided photo caption.",
        examples=["Rainy night in Ximending"],
    )
    user_location_id: Optional[uuid.UUID] = Field(
        default=None,
        description="Link photo to one of the current user's private locations.",
        examples=["90fa7cc1-9bd3-4215-bfa2-ecf2f576ee73"],
    )
    global_location_id: Optional[uuid.UUID] = Field(
        default=None,
        description="Link photo to a platform-maintained global location.",
        examples=["11111111-1111-1111-1111-111111111101"],
    )
    tags: list[str] = Field(
        default_factory=list,
        max_length=10,
        description="Per-photo tags. Empty strings are removed and duplicates are deduplicated in order.",
        examples=[["street", "night", "city"]],
    )
    is_public: bool = Field(
        default=True,
        description="Whether the photo is visible publicly.",
        examples=[True],
    )

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "s3_key": "photos/c2fd4c7a-3ef1-47b8-a402-b6565516d1da/taipei-street.jpg",
                    "caption": "Rainy night in Ximending",
                    "user_location_id": "90fa7cc1-9bd3-4215-bfa2-ecf2f576ee73",
                    "global_location_id": None,
                    "tags": ["street", "night", "city"],
                    "is_public": True,
                }
            ]
        }
    )

    @field_validator("tags", mode="before")
    @classmethod
    def normalize_tags(cls, value) -> list[str]:
        if value is None:
            return []
        cleaned: list[str] = []
        for item in value:
            tag = str(item).strip()
            if not tag:
                continue
            if len(tag) > 50:
                raise ValueError("Each tag must be 50 characters or fewer")
            if tag not in cleaned:
                cleaned.append(tag)
        return cleaned

    @model_validator(mode="after")
    def validate_location_choice(self):
        if self.user_location_id and self.global_location_id:
            raise ValueError("Only one location source may be selected")
        return self


class PhotoResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    user_location_id: Optional[uuid.UUID] = Field(None, description="Private location ID when bound to a user-owned location")
    global_location_id: Optional[uuid.UUID] = Field(None, description="Global location ID when bound to a platform-maintained location")
    location_id: Optional[uuid.UUID] = Field(None, description="Convenience field exposing either user_location_id or global_location_id")
    location_source: Optional[Literal["user", "global"]] = Field(None, description="Which location table the effective location_id belongs to")
    s3_key: str
    thumb_key: Optional[str]
    url: Optional[str] = None
    thumb_url: Optional[str] = None
    caption: Optional[str] = Field(default=None, examples=["Rainy night in Ximending"])
    tags: list[str] = Field(default_factory=list, examples=[["street", "night", "city"]])
    is_public: bool = Field(..., examples=[True])
    taken_at: Optional[datetime] = Field(default=None, examples=["2026-04-10T19:45:00Z"])
    created_at: datetime = Field(..., examples=["2026-04-10T20:00:00Z"])
    exif: Optional[ExifResponse] = None

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "examples": [
                {
                    "id": "8b1f2e70-50c9-4b8a-a7a0-7f8f5e0e1c21",
                    "user_id": "3f4a8c2d-7d87-4b69-8cc8-e12d9b3a0f11",
                    "location_id": "90fa7cc1-9bd3-4215-bfa2-ecf2f576ee73",
                    "s3_key": "photos/c2fd4c7a-3ef1-47b8-a402-b6565516d1da/taipei-street.jpg",
                    "thumb_key": "thumbnails/800/8b1f2e70-50c9-4b8a-a7a0-7f8f5e0e1c21.jpg",
                    "url": "https://s3.amazonaws.com/lenslog/photos/c2fd4c7a-3ef1-47b8-a402-b6565516d1da/taipei-street.jpg",
                    "thumb_url": "https://s3.amazonaws.com/lenslog/thumbnails/800/8b1f2e70-50c9-4b8a-a7a0-7f8f5e0e1c21.jpg",
                    "caption": "Rainy night in Ximending",
                    "tags": ["street", "night", "city"],
                    "is_public": True,
                    "taken_at": "2026-04-10T19:45:00Z",
                    "created_at": "2026-04-10T20:00:00Z",
                    "exif": {
                        "make": "FUJIFILM",
                        "model": "X100VI",
                        "lens_model": "Fujinon 23mm",
                        "focal_length": 23.0,
                        "focal_length_35": 35.0,
                        "aperture": 2.0,
                        "shutter_speed": "1/125",
                        "iso": 1600,
                        "width": 6240,
                        "height": 4160,
                    },
                }
            ]
        },
    )


class PresignResponse(BaseModel):
    presigned_url: str
    s3_key: str
    upload_headers: dict[str, str] = Field(default_factory=dict)
    # Optional fields kept for backwards/alternate upload flows (e.g. presigned POST).
    fields: Optional[dict[str, str]] = None
    max_size_mb: Optional[int] = None


# ─── Location Schemas ─────────────────────────────────────────────────────────

class LocationCreate(BaseModel):
    name: str = Field(..., max_length=200)
    description: Optional[str] = None
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    tags: list[str] = []


class LocationResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    name: str
    description: Optional[str]
    latitude: float
    longitude: float
    tags: list[str] = []
    created_at: datetime

    @field_validator("tags", mode="before")
    @classmethod
    def extract_tags(cls, v: list) -> list[str]:
        if v and not isinstance(v[0], str):
            return [item.tag for item in v]
        return v

    class Config:
        from_attributes = True


class GlobalLocationResponse(BaseModel):
    id: uuid.UUID
    name: str = Field(..., description="Global landmark name")
    description: Optional[str] = Field(None, description="Optional global landmark description")
    latitude: float = Field(..., description="Latitude in decimal degrees")
    longitude: float = Field(..., description="Longitude in decimal degrees")
    is_active: bool = Field(..., description="Whether the global location is visible in the public directory")
    created_at: datetime

    class Config:
        from_attributes = True


class DirectoryLocationResponse(BaseModel):
    id: uuid.UUID
    source: Literal["user", "global"] = Field(..., description="Whether the match came from the user's private locations or the global directory")
    name: str = Field(..., description="Location name")
    description: Optional[str] = Field(None, description="Optional description")
    latitude: float = Field(..., description="Latitude in decimal degrees")
    longitude: float = Field(..., description="Longitude in decimal degrees")
    distance_m: Optional[float] = Field(None, description="Distance from the query point in meters when lat/lng filtering is used")


# ─── Gear Schemas ─────────────────────────────────────────────────────────────

class GearCreate(BaseModel):
    type: str = Field(..., pattern="^(body|lens|flash|tripod|filter|memory_card)$")
    brand: Optional[str] = None
    model: str = Field(..., max_length=200)
    serial_number: Optional[str] = None
    purchase_date: Optional[date] = None
    notes: Optional[str] = None
    maintenance_interval_days: Optional[int] = Field(None, ge=1)


class GearResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    type: str
    brand: Optional[str]
    model: str
    serial_number: Optional[str]
    purchase_date: Optional[date]
    notes: Optional[str]
    maintenance_interval_days: Optional[int]
    last_maintained: Optional[date]
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Update Schemas ───────────────────────────────────────────────────────────

class PhotoUpdate(BaseModel):
    caption: Optional[str] = Field(default=None, examples=["Rainy night walk in Ximending"])
    is_public: Optional[bool] = Field(default=None, examples=[False])
    user_location_id: Optional[uuid.UUID] = Field(
        default=None,
        description="Replace the bound private location; mutually exclusive with global_location_id.",
        examples=["90fa7cc1-9bd3-4215-bfa2-ecf2f576ee73"],
    )
    global_location_id: Optional[uuid.UUID] = Field(
        default=None,
        description="Replace the bound global location; mutually exclusive with user_location_id.",
        examples=["11111111-1111-1111-1111-111111111101"],
    )
    tags: Optional[list[str]] = Field(
        default=None,
        max_length=10,
        description="Replacement tag list. Omit the field to keep current tags; send [] to clear all tags.",
        examples=[["street", "rain", "night"]],
    )

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "caption": "Rainy night walk in Ximending",
                    "is_public": False,
                    "user_location_id": "90fa7cc1-9bd3-4215-bfa2-ecf2f576ee73",
                    "global_location_id": None,
                    "tags": ["street", "rain", "night"],
                }
            ]
        }
    )

    @field_validator("tags", mode="before")
    @classmethod
    def normalize_update_tags(cls, value):
        if value is None:
            return None
        cleaned: list[str] = []
        for item in value:
            tag = str(item).strip()
            if not tag:
                continue
            if len(tag) > 50:
                raise ValueError("Each tag must be 50 characters or fewer")
            if tag not in cleaned:
                cleaned.append(tag)
        return cleaned

    @model_validator(mode="after")
    def validate_location_choice(self):
        if self.user_location_id and self.global_location_id:
            raise ValueError("Only one location source may be selected")
        return self


class LocationUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = None
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)


class GearUpdate(BaseModel):
    type: Optional[str] = Field(None, pattern="^(body|lens|flash|tripod|filter|memory_card)$")
    brand: Optional[str] = None
    model: Optional[str] = Field(None, max_length=200)
    serial_number: Optional[str] = None
    purchase_date: Optional[date] = None
    notes: Optional[str] = None
    maintenance_interval_days: Optional[int] = Field(None, ge=1)
    last_maintained: Optional[date] = None


# ─── Stats Schemas ────────────────────────────────────────────────────────────

class FocalLengthStat(BaseModel):
    focal_length: float
    count: int


class ApertureStat(BaseModel):
    aperture: float
    count: int


class ISOStat(BaseModel):
    month: str
    avg_iso: float
    count: int


class MonthlyStat(BaseModel):
    month: str
    count: int


# ─── Weather Schemas ──────────────────────────────────────────────────────────

class ForecastPeriod(BaseModel):
    start_time: str = Field(..., description="ISO 8601 with +08:00 timezone")
    end_time: str = Field(..., description="ISO 8601 with +08:00 timezone")
    temp_max: int = Field(..., description="Forecast high temperature in °C")
    temp_min: int = Field(..., description="Forecast low temperature in °C")
    pop: int = Field(..., description="Precipitation probability 0–100%")
    wind_speed: str = Field(..., description="Beaufort scale description (e.g. '3級')")
    weather_description: str = Field(..., description="Weather condition description (e.g. '多雲時晴')")


class WeatherForecastResponse(BaseModel):
    township: str = Field(..., description="鄉鎮市區名稱 (matches CWA locationName)")
    county: str = Field(..., description="縣市名稱")
    forecasts: list[ForecastPeriod] = Field(..., description="Up to 14 forecast periods (~7 days) at 12-hour intervals")
    sunrise: Optional[str] = None
    sunset: Optional[str] = None
