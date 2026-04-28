import pytest

from app.api.v1 import photos as photos_api
from app.core.config import settings


@pytest.mark.asyncio
async def test_presign_upload_returns_presigned_post_with_size_limit(monkeypatch):
    captured: dict[str, object] = {}

    def fake_generate_presigned_post(
        key: str,
        expiration: int = 3600,
        content_type: str | None = None,
        max_size_mb: int | None = None,
    ) -> dict:
        captured["key"] = key
        captured["expiration"] = expiration
        captured["content_type"] = content_type
        captured["max_size_mb"] = max_size_mb
        return {"url": "http://example.test/upload", "fields": {"key": key, "Content-Type": content_type or ""}}

    monkeypatch.setattr(photos_api, "generate_presigned_post", fake_generate_presigned_post)

    resp = await photos_api.presign_upload(
        filename="test.jpg",
        content_type="image/jpeg",
        redis=object(),
        current_user=object(),
    )

    assert resp.presigned_url == "http://example.test/upload"
    assert resp.s3_key.startswith("photos/")
    assert resp.fields and resp.fields["key"] == captured["key"]
    assert resp.max_size_mb == settings.PHOTO_UPLOAD_MAX_SIZE_MB
    assert captured["max_size_mb"] == settings.PHOTO_UPLOAD_MAX_SIZE_MB
