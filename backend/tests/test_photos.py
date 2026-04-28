from unittest.mock import Mock

import pytest
from sqlalchemy import select

from app.api.deps import get_current_active_user
from app.api.v1 import photos as photos_api
from app.main import app
from app.core.config import settings
from app.models.models import Photo, User


@pytest.fixture(autouse=True)
def clear_overrides():
    yield
    app.dependency_overrides.clear()


@pytest.fixture
async def active_user(db_session):
    user = User(
        username="photo-tester",
        email="photo-tester@example.com",
        password_hash="hashed-password",
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.mark.asyncio
async def test_presign_upload_returns_pending_upload_headers(client, active_user, monkeypatch):
    generate_presigned_url = Mock(return_value="http://storage.local/upload")
    monkeypatch.setattr(photos_api, "generate_presigned_url", generate_presigned_url)
    app.dependency_overrides[get_current_active_user] = lambda: active_user

    response = await client.post(
        "/api/v1/photos/presign",
        params={"filename": "test.jpg", "content_type": "image/jpeg"},
    )

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["presigned_url"] == "http://storage.local/upload"
    assert body["s3_key"].startswith("photos/")
    assert body["upload_headers"] == {
        "Content-Type": "image/jpeg",
        "x-amz-tagging": "upload_state=pending",
    }

    generate_presigned_url.assert_called_once()
    assert generate_presigned_url.call_args.kwargs["expiration"] == settings.PHOTO_PRESIGN_EXPIRE_SECONDS
    assert generate_presigned_url.call_args.kwargs["content_type"] == "image/jpeg"
    assert generate_presigned_url.call_args.kwargs["tagging"] == "upload_state=pending"


@pytest.mark.asyncio
async def test_create_photo_marks_object_confirmed(client, db_session, active_user, monkeypatch):
    generate_presigned_url = Mock(return_value="http://storage.local/upload")
    monkeypatch.setattr(photos_api, "generate_presigned_url", generate_presigned_url)
    put_object_tags = Mock()
    monkeypatch.setattr(photos_api, "put_object_tags", put_object_tags)
    monkeypatch.setattr(photos_api.process_exif_task, "delay", Mock())
    monkeypatch.setattr(photos_api.generate_thumbnail_task, "delay", Mock())
    app.dependency_overrides[get_current_active_user] = lambda: active_user

    presign_resp = await client.post(
        "/api/v1/photos/presign",
        params={"filename": "test.jpg", "content_type": "image/jpeg"},
    )
    assert presign_resp.status_code == 200, presign_resp.text
    s3_key = presign_resp.json()["s3_key"]

    response = await client.post(
        "/api/v1/photos",
        json={
            "s3_key": s3_key,
            "caption": "Sunset",
            "is_public": True,
        },
    )

    assert response.status_code == 201, response.text
    body = response.json()
    assert body["s3_key"] == s3_key
    put_object_tags.assert_called_once_with(
        s3_key,
        {"upload_state": "confirmed"},
    )

    result = await db_session.execute(
        select(Photo).where(Photo.s3_key == s3_key)
    )
    assert result.scalar_one_or_none() is not None


@pytest.mark.asyncio
async def test_create_photo_removes_db_record_when_confirm_tagging_fails(
    client,
    db_session,
    active_user,
    monkeypatch,
):
    generate_presigned_url = Mock(return_value="http://storage.local/upload")
    monkeypatch.setattr(photos_api, "generate_presigned_url", generate_presigned_url)
    monkeypatch.setattr(
        photos_api,
        "put_object_tags",
        Mock(side_effect=RuntimeError("tagging failed")),
    )
    monkeypatch.setattr(photos_api.process_exif_task, "delay", Mock())
    monkeypatch.setattr(photos_api.generate_thumbnail_task, "delay", Mock())
    app.dependency_overrides[get_current_active_user] = lambda: active_user

    presign_resp = await client.post(
        "/api/v1/photos/presign",
        params={"filename": "failure.jpg", "content_type": "image/jpeg"},
    )
    assert presign_resp.status_code == 200, presign_resp.text
    s3_key = presign_resp.json()["s3_key"]

    response = await client.post(
        "/api/v1/photos",
        json={
            "s3_key": s3_key,
            "caption": "Broken",
            "is_public": True,
        },
    )

    assert response.status_code == 500, response.text
    assert response.json()["detail"] == "Failed to finalize uploaded photo"

    result = await db_session.execute(
        select(Photo).where(Photo.s3_key == s3_key)
    )
    assert result.scalar_one_or_none() is None
