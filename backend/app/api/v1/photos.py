import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.models import Photo, User
from app.schemas import PhotoCreate, PhotoUpdate, PhotoResponse, PresignResponse
from app.services.s3_service import generate_presigned_url, get_object_url
from app.api.deps import get_current_active_user

router = APIRouter(prefix="/photos", tags=["photos"])


def _with_url(photo: Photo) -> PhotoResponse:
    data = PhotoResponse.model_validate(photo)
    data.url = get_object_url(photo.s3_key)
    return data


@router.get("", response_model=list[PhotoResponse])
async def list_photos(
    skip: int = 0,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    result = await db.execute(
        select(Photo).where(Photo.user_id == current_user.id).offset(skip).limit(limit)
    )
    return [_with_url(p) for p in result.scalars().all()]


@router.post("/presign", response_model=PresignResponse)
async def presign_upload(
    filename: str,
    current_user: User = Depends(get_current_active_user),
):
    s3_key = f"photos/{uuid.uuid4()}/{filename}"
    url = generate_presigned_url(s3_key)
    return PresignResponse(presigned_url=url, s3_key=s3_key)


@router.post("", response_model=PhotoResponse, status_code=status.HTTP_201_CREATED)
async def create_photo(
    data: PhotoCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    photo = Photo(**data.model_dump(), user_id=current_user.id)
    db.add(photo)
    await db.flush()
    return _with_url(photo)


@router.get("/{photo_id}", response_model=PhotoResponse)
async def get_photo(photo_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Photo).where(Photo.id == photo_id))
    photo = result.scalar_one_or_none()
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    return _with_url(photo)


@router.patch("/{photo_id}", response_model=PhotoResponse)
async def update_photo(
    photo_id: uuid.UUID,
    data: PhotoUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    result = await db.execute(select(Photo).where(Photo.id == photo_id))
    photo = result.scalar_one_or_none()
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    if photo.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(photo, field, value)
    await db.flush()
    return _with_url(photo)


@router.delete("/{photo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_photo(
    photo_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    result = await db.execute(select(Photo).where(Photo.id == photo_id))
    photo = result.scalar_one_or_none()
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    if photo.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    await db.delete(photo)
