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

    # 我順便加了 tagging 的捕捉，方便你如果未來想驗證的話可以使用
    captured: dict[str, str | None] = {"key": None, "content_type": None, "tagging": None}

    # 加上 **kwargs 來吸收多出來的參數（例如 tagging）
    def fake_generate_presigned_url(key: str, expiration: int = 3600, content_type: str | None = None, **kwargs) -> str:
        captured["key"] = key
        captured["content_type"] = content_type
        captured["tagging"] = kwargs.get("tagging") # 把 tagging 存起來
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

    # ====== 以下是新增的測試邏輯 ======
    # 驗證 API 有正確回傳給前端需要的 S3 Headers
    assert "upload_headers" in data
    assert data["upload_headers"]["x-amz-tagging"] == "upload_state=pending"
    assert data["upload_headers"]["Content-Type"] == "image/jpeg"
    # =================================

    parts = data["s3_key"].split("/")
    assert parts[0] == "photos"
    uuid.UUID(parts[1])  # validate UUID format
    assert parts[2] == expected_filename
    assert "/" not in parts[2]
    assert "\\" not in parts[2]
    assert not parts[2].startswith(".")
