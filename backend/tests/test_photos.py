from unittest.mock import Mock

from geoalchemy2.elements import WKTElement
import pytest
from sqlalchemy import select

from app.api.deps import get_current_active_user
from app.api.v1 import photos as photos_api
from app.main import app
from app.core.config import settings
from app.models.models import GlobalLocation, Location, Photo, User


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
async def test_presign_upload_rejects_unsupported_content_type(client, active_user):
    app.dependency_overrides[get_current_active_user] = lambda: active_user

    response = await client.post(
        "/api/v1/photos/presign",
        params={"filename": "payload.html", "content_type": "text/html"},
    )

    assert response.status_code == 400, response.text
    assert response.json()["detail"] == "Unsupported file type"


@pytest.mark.asyncio
async def test_presign_upload_requires_content_type(client, active_user):
    app.dependency_overrides[get_current_active_user] = lambda: active_user

    response = await client.post(
        "/api/v1/photos/presign",
        params={"filename": "test.jpg"},
    )

    assert response.status_code == 422, response.text


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
            "tags": ["night", "street", "night", " city "],
            "is_public": True,
        },
    )

    assert response.status_code == 201, response.text
    body = response.json()
    assert body["s3_key"] == s3_key
    assert body["tags"] == ["night", "street", "city"]
    put_object_tags.assert_called_once_with(
        s3_key,
        {"upload_state": "confirmed"},
    )

    result = await db_session.execute(
        select(Photo).where(Photo.s3_key == s3_key)
    )
    photo = result.scalar_one_or_none()
    assert photo is not None
    assert photo.tags == ["night", "street", "city"]


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


@pytest.mark.asyncio
async def test_create_photo_accepts_owned_user_location(client, db_session, active_user, monkeypatch):
    generate_presigned_url = Mock(return_value="http://storage.local/upload")
    monkeypatch.setattr(photos_api, "generate_presigned_url", generate_presigned_url)
    monkeypatch.setattr(photos_api, "put_object_tags", Mock())
    monkeypatch.setattr(photos_api.process_exif_task, "delay", Mock())
    monkeypatch.setattr(photos_api.generate_thumbnail_task, "delay", Mock())
    app.dependency_overrides[get_current_active_user] = lambda: active_user

    location = Location(
        user_id=active_user.id,
        name="我的景點",
        latitude=25.0,
        longitude=121.5,
    )
    location.geom = WKTElement("POINT(121.5 25.0)", srid=4326)
    db_session.add(location)
    await db_session.commit()

    presign_resp = await client.post(
        "/api/v1/photos/presign",
        params={"filename": "owned.jpg", "content_type": "image/jpeg"},
    )
    s3_key = presign_resp.json()["s3_key"]

    response = await client.post(
        "/api/v1/photos",
        json={
            "s3_key": s3_key,
            "caption": "Owned location",
            "user_location_id": str(location.id),
            "is_public": True,
        },
    )

    assert response.status_code == 201, response.text
    body = response.json()
    assert body["user_location_id"] == str(location.id)
    assert body["global_location_id"] is None
    assert body["location_source"] == "user"


@pytest.mark.asyncio
async def test_create_photo_accepts_global_location(client, db_session, active_user, monkeypatch):
    generate_presigned_url = Mock(return_value="http://storage.local/upload")
    monkeypatch.setattr(photos_api, "generate_presigned_url", generate_presigned_url)
    monkeypatch.setattr(photos_api, "put_object_tags", Mock())
    monkeypatch.setattr(photos_api.process_exif_task, "delay", Mock())
    monkeypatch.setattr(photos_api.generate_thumbnail_task, "delay", Mock())
    app.dependency_overrides[get_current_active_user] = lambda: active_user

    global_location = GlobalLocation(
        name="台北101",
        description="公共地標",
        latitude=25.033968,
        longitude=121.564468,
        is_active=True,
        geom=WKTElement("POINT(121.564468 25.033968)", srid=4326),
    )
    db_session.add(global_location)
    await db_session.commit()

    presign_resp = await client.post(
        "/api/v1/photos/presign",
        params={"filename": "global.jpg", "content_type": "image/jpeg"},
    )
    s3_key = presign_resp.json()["s3_key"]

    response = await client.post(
        "/api/v1/photos",
        json={
            "s3_key": s3_key,
            "caption": "Global location",
            "global_location_id": str(global_location.id),
            "is_public": True,
        },
    )

    assert response.status_code == 201, response.text
    body = response.json()
    assert body["global_location_id"] == str(global_location.id)
    assert body["user_location_id"] is None
    assert body["location_source"] == "global"


@pytest.mark.asyncio
async def test_create_photo_rejects_multiple_location_sources(client, active_user, monkeypatch):
    generate_presigned_url = Mock(return_value="http://storage.local/upload")
    monkeypatch.setattr(photos_api, "generate_presigned_url", generate_presigned_url)
    monkeypatch.setattr(photos_api, "put_object_tags", Mock())
    monkeypatch.setattr(photos_api.process_exif_task, "delay", Mock())
    monkeypatch.setattr(photos_api.generate_thumbnail_task, "delay", Mock())
    app.dependency_overrides[get_current_active_user] = lambda: active_user

    presign_resp = await client.post(
        "/api/v1/photos/presign",
        params={"filename": "double.jpg", "content_type": "image/jpeg"},
    )
    s3_key = presign_resp.json()["s3_key"]

    response = await client.post(
        "/api/v1/photos",
        json={
            "s3_key": s3_key,
            "user_location_id": str(active_user.id),
            "global_location_id": str(active_user.id),
            "is_public": True,
        },
    )

    assert response.status_code == 422, response.text


@pytest.mark.asyncio
async def test_create_photo_rejects_other_users_location(client, db_session, active_user, monkeypatch):
    generate_presigned_url = Mock(return_value="http://storage.local/upload")
    monkeypatch.setattr(photos_api, "generate_presigned_url", generate_presigned_url)
    monkeypatch.setattr(photos_api, "put_object_tags", Mock())
    monkeypatch.setattr(photos_api.process_exif_task, "delay", Mock())
    monkeypatch.setattr(photos_api.generate_thumbnail_task, "delay", Mock())
    app.dependency_overrides[get_current_active_user] = lambda: active_user

    other_user = User(
        username="other-photo-user",
        email="other-photo-user@example.com",
        password_hash="hashed-password",
        is_active=True,
    )
    db_session.add(other_user)
    await db_session.commit()
    await db_session.refresh(other_user)

    foreign_location = Location(
        user_id=other_user.id,
        name="別人的景點",
        latitude=25.0,
        longitude=121.5,
        geom=WKTElement("POINT(121.5 25.0)", srid=4326),
    )
    db_session.add(foreign_location)
    await db_session.commit()

    presign_resp = await client.post(
        "/api/v1/photos/presign",
        params={"filename": "forbidden.jpg", "content_type": "image/jpeg"},
    )
    s3_key = presign_resp.json()["s3_key"]

    response = await client.post(
        "/api/v1/photos",
        json={
            "s3_key": s3_key,
            "user_location_id": str(foreign_location.id),
            "is_public": True,
        },
    )

    assert response.status_code == 403, response.text


@pytest.mark.asyncio
async def test_update_photo_tags(client, active_user, monkeypatch):
    generate_presigned_url = Mock(return_value="http://storage.local/upload")
    monkeypatch.setattr(photos_api, "generate_presigned_url", generate_presigned_url)
    monkeypatch.setattr(photos_api, "put_object_tags", Mock())
    monkeypatch.setattr(photos_api.process_exif_task, "delay", Mock())
    monkeypatch.setattr(photos_api.generate_thumbnail_task, "delay", Mock())
    app.dependency_overrides[get_current_active_user] = lambda: active_user

    presign_resp = await client.post(
        "/api/v1/photos/presign",
        params={"filename": "retag.jpg", "content_type": "image/jpeg"},
    )
    assert presign_resp.status_code == 200, presign_resp.text
    s3_key = presign_resp.json()["s3_key"]

    create_resp = await client.post(
        "/api/v1/photos",
        json={
            "s3_key": s3_key,
            "caption": "Initial",
            "tags": ["before"],
            "is_public": True,
        },
    )
    assert create_resp.status_code == 201, create_resp.text
    photo_id = create_resp.json()["id"]

    update_resp = await client.patch(
        f"/api/v1/photos/{photo_id}",
        json={"tags": ["after", " after ", "", "travel"]},
    )

    assert update_resp.status_code == 200, update_resp.text
    assert update_resp.json()["tags"] == ["after", "travel"]


@pytest.mark.asyncio
async def test_openapi_photo_schemas_include_tags_examples(client):
    response = await client.get("/openapi.json")

    assert response.status_code == 200, response.text
    components = response.json()["components"]["schemas"]

    create_schema = components["PhotoCreate"]
    update_schema = components["PhotoUpdate"]
    response_schema = components["PhotoResponse"]

    assert "tags" in create_schema["properties"]
    assert create_schema["properties"]["tags"]["type"] == "array"
    assert create_schema["properties"]["tags"]["items"]["type"] == "string"
    assert create_schema["examples"][0]["tags"] == ["street", "night", "city"]

    assert "tags" in update_schema["properties"]
    assert update_schema["examples"][0]["tags"] == ["street", "rain", "night"]

    assert "tags" in response_schema["properties"]
    assert response_schema["examples"][0]["tags"] == ["street", "night", "city"]
    assert "thumb_url" in response_schema["properties"]
    assert "exif" in response_schema["properties"]
