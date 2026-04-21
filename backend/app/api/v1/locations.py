import asyncio
import json
import logging
import uuid
from datetime import datetime
from zoneinfo import ZoneInfo

import redis.asyncio as aioredis
from fastapi import APIRouter, Depends, HTTPException, status, Query
from geoalchemy2.elements import WKTElement
from geoalchemy2.functions import ST_DWithin, ST_Distance, ST_Intersects, ST_MakePoint, ST_SetSRID
from geoalchemy2.types import Geography
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import cast, select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.redis import get_redis

from app.models.models import Location, LocationTag, Township, User
from app.schemas import LocationCreate, LocationUpdate, LocationResponse, WeatherForecastResponse, ForecastPeriod
from app.services.weather_service import get_weather_forecast, get_sunrise_sunset
from app.api.deps import get_current_active_user

router = APIRouter(prefix="/locations", tags=["locations"])

WEATHER_CACHE_TTL = 60 * 30  # retained for backward compatibility
FORECAST_CACHE_TTL = 60 * 60 * 2  # 2 hours — CWA forecast updates every 6h
_TAIWAN_TZ = ZoneInfo("Asia/Taipei")
logger = logging.getLogger(__name__)


async def _get_township(lat: float, lng: float, db: AsyncSession) -> Township | None:
    """Return the Township whose boundary contains the given coordinates, or None."""
    result = await db.execute(
        select(Township).where(
            ST_Intersects(Township.geom, ST_SetSRID(ST_MakePoint(lng, lat), 4326))
        ).limit(1)
    )
    return result.scalar_one_or_none()


@router.get("", response_model=list[LocationResponse])
async def list_locations(
    lat: float | None = Query(None),
    lng: float | None = Query(None),
    radius: float = Query(10000, ge=1, le=100000, description="Radius in meters (1–100,000)"),
    db: AsyncSession = Depends(get_db),
):
    if lat is not None and lng is not None:
        point = cast(ST_MakePoint(lng, lat), Geography(srid=4326))
        geom_geo = cast(Location.geom, Geography(srid=4326))
        stmt = (
            select(Location)
            .options(selectinload(Location.tags))
            .where(ST_DWithin(geom_geo, point, radius))
            .order_by(ST_Distance(geom_geo, point))
        )
    else:
        stmt = select(Location).options(selectinload(Location.tags)).limit(50)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("", response_model=LocationResponse, status_code=status.HTTP_201_CREATED)
async def create_location(
    data: LocationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    location = Location(
        user_id=current_user.id,
        name=data.name,
        description=data.description,
        latitude=data.latitude,
        longitude=data.longitude,
    )
    location.geom = WKTElement(f"POINT({data.longitude} {data.latitude})", srid=4326)
    db.add(location)
    await db.flush()

    for tag_str in data.tags:
        db.add(LocationTag(location_id=location.id, tag=tag_str))
    await db.flush()

    # 重新查詢以 eager load tags
    result = await db.execute(
        select(Location).options(selectinload(Location.tags)).where(Location.id == location.id)
    )
    return result.scalar_one()


@router.get("/{location_id}", response_model=LocationResponse)
async def get_location(location_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Location).options(selectinload(Location.tags)).where(Location.id == location_id)
    )
    location = result.scalar_one_or_none()
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    return location


@router.get("/{location_id}/weather", response_model=WeatherForecastResponse)
async def get_location_weather(
    location_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    redis: aioredis.Redis = Depends(get_redis),
    current_user: User = Depends(get_current_active_user),
):
    # 1. Auth check before cache — prevents cache-bypass 403
    result = await db.execute(select(Location).where(Location.id == location_id))
    location = result.scalar_one_or_none()
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    if location.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    lat = float(location.latitude)
    lng = float(location.longitude)

    # 2. Resolve administrative district (required for F-D0047-093 query)
    township = await _get_township(lat, lng, db)
    if not township:
        raise HTTPException(
            status_code=422,
            detail="Location coordinates not within any known administrative district",
        )

    # 3. Check Redis cache after auth
    cache_key = f"weather:{location_id}"
    cached = await redis.get(cache_key)
    if cached:
        return json.loads(cached)

    # 4. Fetch forecast + sunrise/sunset in parallel
    forecast_data, sun_data = await asyncio.gather(
        get_weather_forecast(township.county),
        get_sunrise_sunset(lat, lng),
        return_exceptions=True,
    )

    if isinstance(forecast_data, Exception):
        raise HTTPException(status_code=502, detail="Weather service unavailable")
    if isinstance(sun_data, Exception):
        raise HTTPException(status_code=502, detail="Sunrise-sunset service unavailable")

    def to_local_hhmm(utc_iso: str) -> str | None:
        try:
            dt = datetime.fromisoformat(utc_iso)
            return dt.astimezone(_TAIWAN_TZ).strftime("%H:%M")
        except Exception as exc:
            logger.warning("Failed to parse datetime %r: %s", utc_iso, exc)
            return None

    response = WeatherForecastResponse(
        township=township.name,
        county=township.county,
        forecasts=[ForecastPeriod(**p) for p in forecast_data],
        sunrise=to_local_hhmm(sun_data.get("sunrise", "")),
        sunset=to_local_hhmm(sun_data.get("sunset", "")),
    )

    # 5. Cache with 2-hour TTL only when forecast data is non-empty
    if response.forecasts:
        await redis.set(cache_key, response.model_dump_json(), ex=FORECAST_CACHE_TTL)

    return response


@router.patch("/{location_id}", response_model=LocationResponse)
async def update_location(
    location_id: uuid.UUID,
    data: LocationUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    result = await db.execute(
        select(Location).options(selectinload(Location.tags)).where(Location.id == location_id)
    )
    location = result.scalar_one_or_none()
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    if location.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    updated_fields = data.model_dump(exclude_unset=True)
    for field, value in updated_fields.items():
        setattr(location, field, value)

    # H-A：lat/lng 更新後同步重算 PostGIS geom，確保地理查詢正確
    if "latitude" in updated_fields or "longitude" in updated_fields:
        location.geom = WKTElement(
            f"POINT({float(location.longitude)} {float(location.latitude)})", srid=4326
        )

    await db.flush()
    return location


@router.delete("/{location_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_location(
    location_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    result = await db.execute(select(Location).where(Location.id == location_id))
    location = result.scalar_one_or_none()
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    if location.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    await db.delete(location)
