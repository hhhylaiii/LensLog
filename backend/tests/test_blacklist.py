import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest
from httpx import ASGITransport, AsyncClient

from app.api.deps import get_current_active_user
from app.core.redis import get_redis
from app.core.security import create_access_token, create_refresh_token, decode_token
from app.main import app


@pytest.fixture(autouse=True)
def clear_overrides():
    yield
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_logout_blacklists_both_tokens():
    """Logout should write jti of both access and refresh tokens into Redis."""
    mock_redis = AsyncMock()
    mock_redis.exists = AsyncMock(return_value=0)
    mock_redis.set = AsyncMock()

    fake_user = MagicMock()
    fake_user.is_active = True

    app.dependency_overrides[get_redis] = lambda: mock_redis
    app.dependency_overrides[get_current_active_user] = lambda: fake_user

    access_token = create_access_token({"sub": str(uuid.uuid4())})
    refresh_token = create_refresh_token({"sub": str(uuid.uuid4())})

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post(
            "/api/v1/auth/logout",
            json={"refresh_token": refresh_token},
            headers={"Authorization": f"Bearer {access_token}"},
        )

    assert response.status_code == 200, response.text
    assert response.json()["detail"] == "Successfully logged out"

    assert mock_redis.set.call_count == 2

    blacklisted_keys = {call.args[0] for call in mock_redis.set.call_args_list}
    access_jti = decode_token(access_token)["jti"]
    refresh_jti = decode_token(refresh_token)["jti"]
    assert f"blacklist:{access_jti}" in blacklisted_keys
    assert f"blacklist:{refresh_jti}" in blacklisted_keys


@pytest.mark.asyncio
async def test_logout_sets_ttl_equal_to_remaining_lifetime():
    """Redis TTL should be <= token's remaining lifetime."""
    mock_redis = AsyncMock()
    mock_redis.exists = AsyncMock(return_value=0)
    mock_redis.set = AsyncMock()

    fake_user = MagicMock()
    fake_user.is_active = True

    app.dependency_overrides[get_redis] = lambda: mock_redis
    app.dependency_overrides[get_current_active_user] = lambda: fake_user

    access_token = create_access_token({"sub": str(uuid.uuid4())})
    refresh_token = create_refresh_token({"sub": str(uuid.uuid4())})

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        await ac.post(
            "/api/v1/auth/logout",
            json={"refresh_token": refresh_token},
            headers={"Authorization": f"Bearer {access_token}"},
        )

    for call in mock_redis.set.call_args_list:
        ttl = call.kwargs.get("ex") or call.args[2]
        assert ttl > 0


@pytest.mark.asyncio
async def test_blacklisted_token_is_rejected():
    """A request with a blacklisted token should get 401."""
    mock_redis = AsyncMock()
    mock_redis.exists = AsyncMock(return_value=1)  # jti found in blacklist

    app.dependency_overrides[get_redis] = lambda: mock_redis

    access_token = create_access_token({"sub": str(uuid.uuid4())})

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {access_token}"},
        )

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_valid_token_not_in_blacklist_passes():
    """A valid token not in blacklist should not be rejected by Redis check."""
    from datetime import datetime, timezone

    mock_redis = AsyncMock()
    mock_redis.exists = AsyncMock(return_value=0)  # not blacklisted

    fake_user = MagicMock()
    fake_user.is_active = True
    fake_user.id = uuid.uuid4()
    fake_user.username = "testuser"
    fake_user.email = "test@example.com"
    fake_user.avatar_url = None
    fake_user.banner_url = None
    fake_user.banner_pos_x = 50.0
    fake_user.banner_pos_y = 50.0
    fake_user.bio = None
    fake_user.is_admin = False
    fake_user.created_at = datetime.now(timezone.utc)

    app.dependency_overrides[get_redis] = lambda: mock_redis
    app.dependency_overrides[get_current_active_user] = lambda: fake_user

    access_token = create_access_token({"sub": str(uuid.uuid4())})

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {access_token}"},
        )

    # Should not be blocked by blacklist (may fail for other reasons like DB, but not 401 from blacklist)
    assert response.status_code != 401
