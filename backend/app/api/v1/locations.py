import asyncio
import json
import uuid
from datetime import datetime, timedelta

import redis.asyncio as aioredis
from fastapi import APIRouter, Depends, HTTPException, status, Query
from geoalchemy2.elements import WKTElement
from geoalchemy2.functions import ST_DWithin, ST_Distance, ST_MakePoint
from geoalchemy2.types import Geography
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import cast, select

from app.core.database import get_db
from app.core.redis import get_redis
from app.models.models import Location, LocationTag, User
from app.schemas import LocationCreate, LocationUpdate, LocationResponse, WeatherResponse
from app.services.weather_service import get_weather, get_sunrise_sunset
from app.api.deps import get_current_active_user

router = APIRouter(prefix="/locations", tags=["locations"])

WEATHER_CACHE_TTL = 60 * 30  # 30 分鐘


@router.get("", response_model=list[LocationResponse])
async def list_locations(
    lat: float | None = Query(None),
    lng: float | None = Query(None),
    radius: float = Query(10000, description="Radius in meters"),
    db: AsyncSession = Depends(get_db),
):
    if lat is not None and lng is not None:
        point = cast(ST_MakePoint(lng, lat), Geography(srid=4326))
        geom_geo = cast(Location.geom, Geography(srid=4326))
        stmt = (
            select(Location)
            .where(ST_DWithin(geom_geo, point, radius))
            .order_by(ST_Distance(geom_geo, point))
        )
    else:
        stmt = select(Location).limit(50)
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

    return location


@router.get("/{location_id}", response_model=LocationResponse)
async def get_location(location_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Location).where(Location.id == location_id))
    location = result.scalar_one_or_none()
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    return location


@router.get("/{location_id}/weather", response_model=WeatherResponse)
async def get_location_weather(
    location_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    redis: aioredis.Redis = Depends(get_redis),
    current_user: User = Depends(get_current_active_user),
):
    # 1. 查 Redis 快取
    cache_key = f"weather:{location_id}"
    cached = await redis.get(cache_key)
    if cached:
        return json.loads(cached)

    # 2. 查 DB 取得座標
    result = await db.execute(select(Location).where(Location.id == location_id))
    location = result.scalar_one_or_none()
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")

    lat = float(location.latitude)
    lng = float(location.longitude)

    # 3. 並行呼叫兩個外部 API
    weather_data, sun_data = await asyncio.gather(
        get_weather(lat, lng),
        get_sunrise_sunset(lat, lng),
        return_exceptions=True,
    )

    if isinstance(weather_data, Exception):
        raise HTTPException(status_code=502, detail="Weather service unavailable")
    if isinstance(sun_data, Exception):
        raise HTTPException(status_code=502, detail="Sunrise-sunset service unavailable")

    # 4. 將 UTC 日出日落轉為本地時間（利用 Open-Meteo 回傳的 utc_offset_seconds）
    utc_offset_seconds: int = weather_data.get("utc_offset_seconds", 0)

    def to_local_hhmm(utc_iso: str) -> str:
        try:
            dt = datetime.fromisoformat(utc_iso)
            local_dt = dt + timedelta(seconds=utc_offset_seconds)
            return local_dt.strftime("%H:%M")
        except Exception:
            return ""

    response = WeatherResponse(
        temperature=weather_data.get("temperature_2m", 0.0),
        precipitation=weather_data.get("precipitation", 0.0),
        windspeed=weather_data.get("wind_speed_10m", 0.0),
        sunrise=to_local_hhmm(sun_data.get("sunrise", "")),
        sunset=to_local_hhmm(sun_data.get("sunset", "")),
    )

    # 5. 寫入 Redis 快取
    await redis.set(cache_key, response.model_dump_json(), ex=WEATHER_CACHE_TTL)

    return response


@router.patch("/{location_id}", response_model=LocationResponse)
async def update_location(
    location_id: uuid.UUID,
    data: LocationUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    result = await db.execute(select(Location).where(Location.id == location_id))
    location = result.scalar_one_or_none()
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    if location.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(location, field, value)
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
