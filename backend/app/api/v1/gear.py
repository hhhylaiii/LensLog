import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.models import Gear, User
from app.schemas import GearCreate, GearUpdate, GearResponse
from app.api.deps import get_current_active_user

router = APIRouter(prefix="/gear", tags=["gear"])


@router.get("", response_model=list[GearResponse])
async def list_gear(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    result = await db.execute(select(Gear).where(Gear.user_id == current_user.id))
    return result.scalars().all()


@router.post("", response_model=GearResponse, status_code=status.HTTP_201_CREATED)
async def add_gear(
    data: GearCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    gear = Gear(**data.model_dump(), user_id=current_user.id)
    db.add(gear)
    await db.flush()
    return gear


@router.get("/{gear_id}", response_model=GearResponse)
async def get_gear(
    gear_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    result = await db.execute(
        select(Gear).where(Gear.id == gear_id, Gear.user_id == current_user.id)
    )
    gear = result.scalar_one_or_none()
    if not gear:
        raise HTTPException(status_code=404, detail="Gear not found")
    return gear


@router.patch("/{gear_id}", response_model=GearResponse)
async def update_gear(
    gear_id: uuid.UUID,
    data: GearUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    result = await db.execute(
        select(Gear).where(Gear.id == gear_id, Gear.user_id == current_user.id)
    )
    gear = result.scalar_one_or_none()
    if not gear:
        raise HTTPException(status_code=404, detail="Gear not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(gear, field, value)
    await db.flush()
    return gear


@router.delete("/{gear_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_gear(
    gear_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    result = await db.execute(
        select(Gear).where(Gear.id == gear_id, Gear.user_id == current_user.id)
    )
    gear = result.scalar_one_or_none()
    if not gear:
        raise HTTPException(status_code=404, detail="Gear not found")
    await db.delete(gear)
