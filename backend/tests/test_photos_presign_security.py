import uuid

import pytest
from httpx import AsyncClient

from app.api.v1 import photos as photos_api


REGISTER_URL = "/api/v1/auth/register"
LOGIN_URL = "/api/v1/auth/login"
PRESIGN_URL = "/api/v1/photos/presign"


async def register_and_login(client: AsyncClient, username: str, email: str, password: str) -> dict:
    await client.post(REGISTER_URL, json={"username": username, "email": email, "password": password})
    response = await client.post(LOGIN_URL, json={"email": email, "password": password})
    return response.json()


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("raw_filename", "expected_filename"),
    [
        ("../../other-prefix/file name?.jpg", "file_name_.jpg"),
        (".env", "env"),
        ("...", "file"),
        ("..\\..\\windows\\path\\a:b*c?.png", "a_b_c_.png"),
    ],
)
async def test_presign_upload_sanitizes_filename(
    client: AsyncClient,
    monkeypatch,
    raw_filename: str,
    expected_filename: str,
):
    tokens = await register_and_login(client, "photo-user", "photo-user@example.com", "password123")
    access_token = tokens["access_token"]

    captured: dict[str, str | None] = {"key": None, "content_type": None}

    def fake_generate_presigned_url(key: str, expiration: int = 3600, content_type: str | None = None) -> str:
        captured["key"] = key
        captured["content_type"] = content_type
        return "http://example.test/presigned"

    monkeypatch.setattr(photos_api, "generate_presigned_url", fake_generate_presigned_url)

    response = await client.post(
        PRESIGN_URL,
        params={"filename": raw_filename, "content_type": "image/jpeg"},
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert response.status_code == 200

    data = response.json()
    assert data["presigned_url"] == "http://example.test/presigned"
    assert data["s3_key"] == captured["key"]
    assert captured["content_type"] == "image/jpeg"

    parts = data["s3_key"].split("/")
    assert parts[0] == "photos"
    uuid.UUID(parts[1])  # validate UUID format
    assert parts[2] == expected_filename
    assert "/" not in parts[2]
    assert "\\" not in parts[2]
    assert not parts[2].startswith(".")
