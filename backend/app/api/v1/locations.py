import uuid
from fastapi import APIRouter, Depends, HTTPException, status, Query
from geoalchemy2.elements import WKTElement
from geoalchemy2.functions import ST_DWithin, ST_Distance, ST_MakePoint
from geoalchemy2.types import Geography
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import cast, select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.models import Location, LocationTag, User
from app.schemas import LocationCreate, LocationUpdate, LocationResponse
from app.api.deps import get_current_active_user

router = APIRouter(prefix="/locations", tags=["locations"])


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

    await db.flush()
    result = await db.execute(
        select(Location)
        .where(Location.id == location.id)
        .options(selectinload(Location.tags))
    )
    return result.scalar_one()


@router.get("/{location_id}", response_model=LocationResponse)
async def get_location(location_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Location).where(Location.id == location_id))
    location = result.scalar_one_or_none()
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    return location


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
