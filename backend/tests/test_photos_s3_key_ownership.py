from unittest.mock import Mock

import pytest
from sqlalchemy import select

from app.api.deps import get_current_active_user
from app.api.v1 import photos as photos_api
from app.main import app
from app.models.models import Photo, User


@pytest.fixture(autouse=True)
def clear_overrides():
    yield
    app.dependency_overrides.clear()


@pytest.fixture
async def user_a(db_session):
    user = User(
        username="user-a",
        email="user-a@example.com",
        password_hash="hashed-password",
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
async def user_b(db_session):
    user = User(
        username="user-b",
        email="user-b@example.com",
        password_hash="hashed-password",
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.mark.asyncio
async def test_create_photo_rejects_unregistered_s3_key(client, db_session, user_a, monkeypatch):
    user_id = user_a.id
    app.dependency_overrides[get_current_active_user] = lambda: User(
        id=user_id,
        username="user-a",
        email="user-a@example.com",
        password_hash="hashed-password",
        is_active=True,
    )

    response = await client.post(
        "/api/v1/photos",
        json={"s3_key": "photos/attacker/evil.jpg", "caption": "oops", "is_public": True},
    )

    assert response.status_code == 403, response.text
    assert response.json()["detail"] == "Invalid s3_key"

    result = await db_session.execute(select(Photo).where(Photo.s3_key == "photos/attacker/evil.jpg"))
    assert result.scalar_one_or_none() is None


@pytest.mark.asyncio
async def test_presigned_s3_key_is_one_time_use(client, db_session, user_a, monkeypatch):
    user_id = user_a.id
    app.dependency_overrides[get_current_active_user] = lambda: User(
        id=user_id,
        username="user-a",
        email="user-a@example.com",
        password_hash="hashed-password",
        is_active=True,
    )

    monkeypatch.setattr(photos_api, "generate_presigned_url", Mock(return_value="http://storage.local/upload"))
    monkeypatch.setattr(photos_api, "put_object_tags", Mock())
    monkeypatch.setattr(photos_api.process_exif_task, "delay", Mock())
    monkeypatch.setattr(photos_api.generate_thumbnail_task, "delay", Mock())

    presign_resp = await client.post(
        "/api/v1/photos/presign",
        params={"filename": "test.jpg", "content_type": "image/jpeg"},
    )
    assert presign_resp.status_code == 200, presign_resp.text
    s3_key = presign_resp.json()["s3_key"]

    ok_resp = await client.post(
        "/api/v1/photos",
        json={"s3_key": s3_key, "caption": "ok", "is_public": True},
    )
    assert ok_resp.status_code == 201, ok_resp.text

    replay_resp = await client.post(
        "/api/v1/photos",
        json={"s3_key": s3_key, "caption": "replay", "is_public": True},
    )
    assert replay_resp.status_code == 403, replay_resp.text
    assert replay_resp.json()["detail"] == "Invalid s3_key"

    result = await db_session.execute(select(Photo).where(Photo.s3_key == s3_key))
    assert result.scalar_one_or_none() is not None


@pytest.mark.asyncio
async def test_presigned_s3_key_owner_must_match(client, db_session, user_a, user_b, monkeypatch):
    monkeypatch.setattr(photos_api, "generate_presigned_url", Mock(return_value="http://storage.local/upload"))
    monkeypatch.setattr(photos_api, "put_object_tags", Mock())
    monkeypatch.setattr(photos_api.process_exif_task, "delay", Mock())
    monkeypatch.setattr(photos_api.generate_thumbnail_task, "delay", Mock())

    user_a_id = user_a.id
    user_b_id = user_b.id

    app.dependency_overrides[get_current_active_user] = lambda: User(
        id=user_a_id,
        username="user-a",
        email="user-a@example.com",
        password_hash="hashed-password",
        is_active=True,
    )
    presign_resp = await client.post(
        "/api/v1/photos/presign",
        params={"filename": "test.jpg", "content_type": "image/jpeg"},
    )
    assert presign_resp.status_code == 200, presign_resp.text
    s3_key = presign_resp.json()["s3_key"]

    app.dependency_overrides[get_current_active_user] = lambda: User(
        id=user_b_id,
        username="user-b",
        email="user-b@example.com",
        password_hash="hashed-password",
        is_active=True,
    )
    forbidden = await client.post(
        "/api/v1/photos",
        json={"s3_key": s3_key, "caption": "steal", "is_public": True},
    )
    assert forbidden.status_code == 403, forbidden.text
    assert forbidden.json()["detail"] == "Invalid s3_key"

    # Mismatch should NOT consume the presign record — the owner can still create it.
    app.dependency_overrides[get_current_active_user] = lambda: User(
        id=user_a_id,
        username="user-a",
        email="user-a@example.com",
        password_hash="hashed-password",
        is_active=True,
    )
    ok_resp = await client.post(
        "/api/v1/photos",
        json={"s3_key": s3_key, "caption": "owner", "is_public": True},
    )
    assert ok_resp.status_code == 201, ok_resp.text
