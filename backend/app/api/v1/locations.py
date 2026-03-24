import uuid
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.models import Location, LocationTag
from app.schemas import LocationCreate, LocationResponse

router = APIRouter(prefix="/locations", tags=["locations"])


@router.get("", response_model=list[LocationResponse])
async def list_locations(
    lat: float | None = Query(None),
    lng: float | None = Query(None),
    radius: float | None = Query(None, description="Radius in km"),
    db: AsyncSession = Depends(get_db),
):
    # TODO: 實作 PostGIS ST_DWithin 地理篩選
    result = await db.execute(select(Location).limit(50))
    locations = result.scalars().all()
    return locations


@router.post("", response_model=LocationResponse, status_code=status.HTTP_201_CREATED)
async def create_location(data: LocationCreate, db: AsyncSession = Depends(get_db)):
    location = Location(
        name=data.name,
        description=data.description,
        latitude=data.latitude,
        longitude=data.longitude,
    )
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


@router.delete("/{location_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_location(location_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Location).where(Location.id == location_id))
    location = result.scalar_one_or_none()
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    await db.delete(location)
