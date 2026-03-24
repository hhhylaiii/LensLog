import uuid
from datetime import datetime, date
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


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
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Photo Schemas ────────────────────────────────────────────────────────────

class PhotoCreate(BaseModel):
    s3_key: str
    thumb_key: Optional[str] = None
    caption: Optional[str] = None
    location_id: Optional[uuid.UUID] = None
    is_public: bool = True


class PhotoResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    location_id: Optional[uuid.UUID]
    s3_key: str
    thumb_key: Optional[str]
    caption: Optional[str]
    is_public: bool
    taken_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class PresignResponse(BaseModel):
    presigned_url: str
    s3_key: str


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

    class Config:
        from_attributes = True


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
