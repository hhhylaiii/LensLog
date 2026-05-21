import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from geoalchemy2.functions import ST_DWithin, ST_Distance, ST_MakePoint
from geoalchemy2.types import Geography
from sqlalchemy import cast, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_active_user
from app.api.v1.locations import _get_township
from app.core.database import get_db
from app.core.redis import get_redis
from app.models.models import GlobalLocation, Location, User
from app.schemas import DirectoryLocationResponse, ForecastPeriod, GlobalLocationResponse, WeatherForecastResponse
from app.services.weather_service import get_sunrise_sunset, get_weather_forecast
import redis.asyncio as aioredis
import asyncio
import json
import logging
from datetime import datetime
from zoneinfo import ZoneInfo

router = APIRouter(tags=["location-directory"])
FORECAST_CACHE_TTL = 60 * 60 * 2
_TAIWAN_TZ = ZoneInfo("Asia/Taipei")
logger = logging.getLogger(__name__)


def _apply_location_filters(stmt, model, query: str | None, lat: float | None, lng: float | None, radius: float):
    distance_expr = None
    if query:
        pattern = f"%{query.strip()}%"
        stmt = stmt.where(
            or_(
                model.name.ilike(pattern),
                model.description.ilike(pattern),
            )
        )
    if lat is not None and lng is not None:
        point = cast(ST_MakePoint(lng, lat), Geography(srid=4326))
        geom_geo = cast(model.geom, Geography(srid=4326))
        distance_expr = ST_Distance(geom_geo, point)
        stmt = stmt.where(ST_DWithin(geom_geo, point, radius)).order_by(distance_expr)
    return stmt, distance_expr


@router.get("/global-locations", response_model=list[GlobalLocationResponse])
async def list_global_locations(
    query: str | None = Query(None, min_length=1, max_length=200),
    lat: float | None = Query(None),
    lng: float | None = Query(None),
    radius: float = Query(10000, ge=1, le=100000, description="Radius in meters (1–100,000)"),
    db: AsyncSession = Depends(get_db),
):
    """List platform-maintained global locations, with optional keyword and nearby filtering."""
    stmt = select(GlobalLocation).where(GlobalLocation.is_active.is_(True))
    stmt, _ = _apply_location_filters(stmt, GlobalLocation, query, lat, lng, radius)
    if lat is None or lng is None:
        stmt = stmt.order_by(GlobalLocation.name.asc()).limit(50)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/location-directory", response_model=list[DirectoryLocationResponse])
async def list_location_directory(
    query: str | None = Query(None, min_length=1, max_length=200),
    lat: float | None = Query(None),
    lng: float | None = Query(None),
    radius: float = Query(10000, ge=1, le=100000, description="Radius in meters (1–100,000)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Return a combined directory of the current user's private locations and active global locations."""
    user_stmt = select(Location).where(Location.user_id == current_user.id)
    user_stmt, user_distance = _apply_location_filters(user_stmt, Location, query, lat, lng, radius)
    if lat is None or lng is None:
        user_stmt = user_stmt.order_by(Location.created_at.desc()).limit(25)
    user_rows = (await db.execute(user_stmt)).scalars().all()

    global_stmt = select(GlobalLocation).where(GlobalLocation.is_active.is_(True))
    global_stmt, global_distance = _apply_location_filters(global_stmt, GlobalLocation, query, lat, lng, radius)
    if lat is None or lng is None:
        global_stmt = global_stmt.order_by(GlobalLocation.name.asc()).limit(25)
    global_rows = (await db.execute(global_stmt)).scalars().all()

    point = cast(ST_MakePoint(lng, lat), Geography(srid=4326)) if lat is not None and lng is not None else None

    results: list[DirectoryLocationResponse] = []
    if point is not None:
        user_distance_stmt = select(Location.id, user_distance).where(Location.id.in_([row.id for row in user_rows]))
        user_distances = {
            row_id: float(distance)
            for row_id, distance in (await db.execute(user_distance_stmt)).all()
        } if user_rows else {}
        global_distance_stmt = select(GlobalLocation.id, global_distance).where(GlobalLocation.id.in_([row.id for row in global_rows]))
        global_distances = {
            row_id: float(distance)
            for row_id, distance in (await db.execute(global_distance_stmt)).all()
        } if global_rows else {}
    else:
        user_distances = {}
        global_distances = {}

    for row in user_rows:
        results.append(
            DirectoryLocationResponse(
                id=row.id,
                source="user",
                name=row.name,
                description=row.description,
                latitude=float(row.latitude),
                longitude=float(row.longitude),
                distance_m=user_distances.get(row.id),
            )
        )
    for row in global_rows:
        results.append(
            DirectoryLocationResponse(
                id=row.id,
                source="global",
                name=row.name,
                description=row.description,
                latitude=float(row.latitude),
                longitude=float(row.longitude),
                distance_m=global_distances.get(row.id),
            )
        )

    results.sort(key=lambda item: (item.distance_m is None, item.distance_m or 0, item.source, item.name))
    return results


def _to_local_hhmm(utc_iso: str) -> str | None:
    try:
        dt = datetime.fromisoformat(utc_iso)
        return dt.astimezone(_TAIWAN_TZ).strftime("%H:%M")
    except Exception as exc:
        logger.warning("Failed to parse datetime %r: %s", utc_iso, exc)
        return None


@router.get("/global-locations/{location_id}/weather", response_model=WeatherForecastResponse)
async def get_global_location_weather(
    location_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    redis: aioredis.Redis = Depends(get_redis),
):
    """Get weather and sunrise/sunset data for a global location."""
    result = await db.execute(
        select(GlobalLocation).where(
            GlobalLocation.id == location_id,
            GlobalLocation.is_active.is_(True),
        )
    )
    location = result.scalar_one_or_none()
    if not location:
        raise HTTPException(status_code=404, detail="Global location not found")

    lat = float(location.latitude)
    lng = float(location.longitude)
    cache_key = f"global-weather:{location_id}"
    cached = await redis.get(cache_key)
    if cached:
        return json.loads(cached)

    township = await _get_township(lat, lng, db)
    if not township:
        raise HTTPException(
            status_code=422,
            detail="Location coordinates not within any known administrative district",
        )

    forecast_data, sun_data = await asyncio.gather(
        get_weather_forecast(township.county),
        get_sunrise_sunset(lat, lng),
        return_exceptions=True,
    )
    if isinstance(forecast_data, Exception):
        logger.exception("Global weather forecast fetch failed for county=%s", township.county, exc_info=forecast_data)
        raise HTTPException(status_code=502, detail="Weather service unavailable")
    if isinstance(sun_data, Exception):
        logger.warning(
            "Global sunrise-sunset fetch failed for lat=%s lng=%s: %r",
            lat,
            lng,
            sun_data,
        )
        sun_data = {}

    response = WeatherForecastResponse(
        township=township.name,
        county=township.county,
        forecasts=[ForecastPeriod(**p) for p in forecast_data],
        sunrise=_to_local_hhmm(sun_data.get("sunrise", "")),
        sunset=_to_local_hhmm(sun_data.get("sunset", "")),
    )
    if response.forecasts:
        await redis.set(cache_key, response.model_dump_json(), ex=FORECAST_CACHE_TTL)
    return response
