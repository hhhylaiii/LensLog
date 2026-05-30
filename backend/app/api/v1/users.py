import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import redis.asyncio as aioredis

from app.core.database import get_db
from app.core.filenames import sanitize_filename
from app.core.redis import get_redis
from app.models.models import User
from app.schemas import BannerPositionUpdate, PresignResponse, ProfileImageConfirm, UserResponse
from app.services.storage_service import generate_presigned_url, get_object_url
from app.services.presign_service import consume_presign, register_presign
from app.api.deps import get_current_active_user

router = APIRouter(prefix="/users", tags=["users"])

_ALLOWED_IMAGE_TYPES = {
    "image/jpeg", "image/jpg", "image/png", "image/webp",
    "image/gif", "image/heic", "image/heif", "image/avif",
    "image/tiff", "image/bmp", "image/svg+xml",
    "application/octet-stream",  # some browsers report unknown types this way
}


def _profile_presign_response(
    s3_key: str,
    content_type: str,
) -> PresignResponse:
    url = generate_presigned_url(s3_key, content_type)
    return PresignResponse(presigned_url=url, s3_key=s3_key)


@router.post("/me/avatar/presign", response_model=PresignResponse)
async def presign_avatar(
    filename: str,
    content_type: str = "image/jpeg",
    current_user: User = Depends(get_current_active_user),
    redis: aioredis.Redis = Depends(get_redis),
):
    if content_type not in _ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported image type")
    safe = sanitize_filename(filename)
    s3_key = f"avatars/{current_user.id}/{uuid.uuid4()}_{safe}"
    await register_presign(redis, s3_key, current_user.id)
    return _profile_presign_response(s3_key, content_type)


@router.post("/me/avatar/confirm", response_model=UserResponse)
async def confirm_avatar(
    body: ProfileImageConfirm,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
    redis: aioredis.Redis = Depends(get_redis),
):
    if not body.s3_key.startswith(f"avatars/{current_user.id}/"):
        raise HTTPException(status_code=403, detail="Invalid s3_key")
    ok = await consume_presign(redis, body.s3_key, current_user.id)
    if not ok:
        raise HTTPException(status_code=403, detail="Invalid or expired presign token")

    result = await db.execute(select(User).where(User.id == current_user.id))
    user = result.scalar_one()
    user.avatar_url = get_object_url(body.s3_key)
    await db.flush()
    return user


@router.post("/me/banner/presign", response_model=PresignResponse)
async def presign_banner(
    filename: str,
    content_type: str = "image/jpeg",
    current_user: User = Depends(get_current_active_user),
    redis: aioredis.Redis = Depends(get_redis),
):
    if content_type not in _ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported image type")
    safe = sanitize_filename(filename)
    s3_key = f"banners/{current_user.id}/{uuid.uuid4()}_{safe}"
    await register_presign(redis, s3_key, current_user.id)
    return _profile_presign_response(s3_key, content_type)


@router.post("/me/banner/confirm", response_model=UserResponse)
async def confirm_banner(
    body: ProfileImageConfirm,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
    redis: aioredis.Redis = Depends(get_redis),
):
    if not body.s3_key.startswith(f"banners/{current_user.id}/"):
        raise HTTPException(status_code=403, detail="Invalid s3_key")
    ok = await consume_presign(redis, body.s3_key, current_user.id)
    if not ok:
        raise HTTPException(status_code=403, detail="Invalid or expired presign token")

    result = await db.execute(select(User).where(User.id == current_user.id))
    user = result.scalar_one()
    user.banner_url = get_object_url(body.s3_key)
    await db.flush()
    return user


@router.patch("/me/banner/position", response_model=UserResponse)
async def update_banner_position(
    body: BannerPositionUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == current_user.id))
    user = result.scalar_one()
    user.banner_pos_x = body.pos_x
    user.banner_pos_y = body.pos_y
    await db.flush()
    return user
