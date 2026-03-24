from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.models.models import ExifData, Photo
from app.schemas import FocalLengthStat, ApertureStat, MonthlyStat

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("/me/focal-length", response_model=list[FocalLengthStat])
async def focal_length_stats(db: AsyncSession = Depends(get_db)):
    # TODO: filter by current user via JOIN
    result = await db.execute(
        select(ExifData.focal_length, func.count().label("count"))
        .where(ExifData.focal_length.isnot(None))
        .group_by(ExifData.focal_length)
        .order_by(func.count().desc())
    )
    return [FocalLengthStat(focal_length=r.focal_length, count=r.count) for r in result]


@router.get("/me/aperture", response_model=list[ApertureStat])
async def aperture_stats(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ExifData.aperture, func.count().label("count"))
        .where(ExifData.aperture.isnot(None))
        .group_by(ExifData.aperture)
        .order_by(func.count().desc())
    )
    return [ApertureStat(aperture=r.aperture, count=r.count) for r in result]


@router.get("/me/monthly", response_model=list[MonthlyStat])
async def monthly_stats(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(
            func.to_char(Photo.taken_at, "YYYY-MM").label("month"),
            func.count().label("count"),
        )
        .where(Photo.taken_at.isnot(None))
        .group_by("month")
        .order_by("month")
    )
    return [MonthlyStat(month=r.month, count=r.count) for r in result]
