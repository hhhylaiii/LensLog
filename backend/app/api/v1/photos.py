import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.models import Photo
from app.schemas import PhotoCreate, PhotoResponse, PresignResponse
from app.services.s3_service import generate_presigned_url

router = APIRouter(prefix="/photos", tags=["photos"])


@router.get("", response_model=list[PhotoResponse])
async def list_photos(skip: int = 0, limit: int = 20, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Photo).where(Photo.is_public == True).offset(skip).limit(limit)
    )
    return result.scalars().all()


@router.post("/presign", response_model=PresignResponse)
async def presign_upload(filename: str):
    s3_key = f"photos/{uuid.uuid4()}/{filename}"
    url = generate_presigned_url(s3_key)
    return PresignResponse(presigned_url=url, s3_key=s3_key)


@router.post("", response_model=PhotoResponse, status_code=status.HTTP_201_CREATED)
async def create_photo(data: PhotoCreate, db: AsyncSession = Depends(get_db)):
    # TODO: 從 JWT 取得當前使用者
    photo = Photo(**data.model_dump())
    db.add(photo)
    await db.flush()
    return photo


@router.get("/{photo_id}", response_model=PhotoResponse)
async def get_photo(photo_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Photo).where(Photo.id == photo_id))
    photo = result.scalar_one_or_none()
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    return photo


@router.delete("/{photo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_photo(photo_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Photo).where(Photo.id == photo_id))
    photo = result.scalar_one_or_none()
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    await db.delete(photo)
