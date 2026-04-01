from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.models.models import ExifData, Photo, User
from app.schemas import FocalLengthStat, ApertureStat, MonthlyStat
from app.api.deps import get_current_active_user

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("/me/focal-length", response_model=list[FocalLengthStat])
async def focal_length_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    result = await db.execute(
        select(ExifData.focal_length, func.count().label("count"))
        .join(Photo, Photo.id == ExifData.photo_id)
        .where(ExifData.focal_length.isnot(None), Photo.user_id == current_user.id)
        .group_by(ExifData.focal_length)
        .order_by(func.count().desc())
    )
    return [FocalLengthStat(focal_length=r.focal_length, count=r._mapping["count"]) for r in result]


@router.get("/me/aperture", response_model=list[ApertureStat])
async def aperture_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    result = await db.execute(
        select(ExifData.aperture, func.count().label("count"))
        .join(Photo, Photo.id == ExifData.photo_id)
        .where(ExifData.aperture.isnot(None), Photo.user_id == current_user.id)
        .group_by(ExifData.aperture)
        .order_by(func.count().desc())
    )
    return [ApertureStat(aperture=r.aperture, count=r._mapping["count"]) for r in result]


@router.get("/me/monthly", response_model=list[MonthlyStat])
async def monthly_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    result = await db.execute(
        select(
            func.to_char(Photo.taken_at, "YYYY-MM").label("month"),
            func.count().label("count"),
        )
        .where(Photo.taken_at.isnot(None), Photo.user_id == current_user.id)
        .group_by("month")
        .order_by("month")
    )
    return [MonthlyStat(month=r.month, count=r._mapping["count"]) for r in result]
