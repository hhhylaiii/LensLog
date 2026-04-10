"""
GET /locations/{id}/weather endpoint 整合測試

測試範圍：
- 正常取得天氣資料（mock 外部 API）
- Redis 快取命中（不繞過授權）
- 403：查詢他人的 location
- 404：location 不存在
- 401：未登入
- 502：外部 API 失敗
"""

from unittest.mock import patch

import pytest
from httpx import AsyncClient

REGISTER_URL = "/api/v1/auth/register"
LOGIN_URL = "/api/v1/auth/login"
LOCATIONS_URL = "/api/v1/locations"


# ─── Helpers ──────────────────────────────────────────────────────────────────

async def register_and_login(client: AsyncClient, username: str, email: str, password: str) -> str:
    await client.post(REGISTER_URL, json={"username": username, "email": email, "password": password})
    resp = await client.post(LOGIN_URL, json={"email": email, "password": password})
    return resp.json()["access_token"]


async def create_location(client: AsyncClient, token: str) -> str:
    resp = await client.post(
        LOCATIONS_URL,
        json={"name": "台北101", "latitude": 25.0338, "longitude": 121.5646, "tags": []},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 201
    return resp.json()["id"]


MOCK_WEATHER_DATA = {
    "temperature_2m": 28.5,
    "precipitation": 0.0,
    "wind_speed_10m": 3.2,
}

MOCK_SUN_DATA = {
    "sunrise": "2024-04-09T21:35:00+00:00",  # UTC → 台灣時間 05:35
    "sunset": "2024-04-09T10:14:00+00:00",   # UTC → 台灣時間 18:14
}


# ─── Tests ────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_get_weather_success(client: AsyncClient):
    """正常情境：登入後取得自己景點的天氣資料"""
    token = await register_and_login(client, "user_w1", "w1@test.com", "password123")
    location_id = await create_location(client, token)

    with patch("app.api.v1.locations.get_weather", return_value=MOCK_WEATHER_DATA), \
         patch("app.api.v1.locations.get_sunrise_sunset", return_value=MOCK_SUN_DATA):
        resp = await client.get(
            f"{LOCATIONS_URL}/{location_id}/weather",
            headers={"Authorization": f"Bearer {token}"},
        )

    assert resp.status_code == 200
    data = resp.json()
    assert data["temperature"] == 28.5
    assert data["precipitation"] == 0.0
    assert data["windspeed"] == 3.2
    assert data["sunrise"] == "05:35"
    assert data["sunset"] == "18:14"


@pytest.mark.asyncio
async def test_get_weather_forbidden(client: AsyncClient):
    """H-B 驗證：其他用戶無法查詢他人的 location 天氣"""
    owner_token = await register_and_login(client, "owner_w", "owner_w@test.com", "password123")
    other_token = await register_and_login(client, "other_w", "other_w@test.com", "password123")
    location_id = await create_location(client, owner_token)

    resp = await client.get(
        f"{LOCATIONS_URL}/{location_id}/weather",
        headers={"Authorization": f"Bearer {other_token}"},
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_get_weather_cache_respects_auth(client: AsyncClient):
    """H-B 驗證：快取命中時仍需通過授權，不能繞過 403"""
    owner_token = await register_and_login(client, "cache_owner", "cache_owner@test.com", "password123")
    other_token = await register_and_login(client, "cache_other", "cache_other@test.com", "password123")
    location_id = await create_location(client, owner_token)

    # owner 先呼叫一次，寫入快取
    with patch("app.api.v1.locations.get_weather", return_value=MOCK_WEATHER_DATA), \
         patch("app.api.v1.locations.get_sunrise_sunset", return_value=MOCK_SUN_DATA):
        owner_resp = await client.get(
            f"{LOCATIONS_URL}/{location_id}/weather",
            headers={"Authorization": f"Bearer {owner_token}"},
        )
    assert owner_resp.status_code == 200

    # 其他用戶即使有快取，也應該拿到 403
    other_resp = await client.get(
        f"{LOCATIONS_URL}/{location_id}/weather",
        headers={"Authorization": f"Bearer {other_token}"},
    )
    assert other_resp.status_code == 403


@pytest.mark.asyncio
async def test_get_weather_not_found(client: AsyncClient):
    """不存在的 location_id 應回傳 404"""
    token = await register_and_login(client, "user_w2", "w2@test.com", "password123")
    fake_id = "00000000-0000-0000-0000-000000000000"

    resp = await client.get(
        f"{LOCATIONS_URL}/{fake_id}/weather",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_get_weather_unauthorized(client: AsyncClient):
    """未登入應回傳 401"""
    fake_id = "00000000-0000-0000-0000-000000000000"
    resp = await client.get(f"{LOCATIONS_URL}/{fake_id}/weather")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_get_weather_cwa_api_failure(client: AsyncClient):
    """CWA API 失敗時應回傳 502"""
    token = await register_and_login(client, "user_w3", "w3@test.com", "password123")
    location_id = await create_location(client, token)

    with patch("app.api.v1.locations.get_weather", side_effect=Exception("CWA timeout")):
        resp = await client.get(
            f"{LOCATIONS_URL}/{location_id}/weather",
            headers={"Authorization": f"Bearer {token}"},
        )

    assert resp.status_code == 502
    assert "Weather service unavailable" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_get_weather_sunrise_api_failure(client: AsyncClient):
    """Sunrise-Sunset API 失敗時應回傳 502"""
    token = await register_and_login(client, "user_w4", "w4@test.com", "password123")
    location_id = await create_location(client, token)

    with patch("app.api.v1.locations.get_weather", return_value=MOCK_WEATHER_DATA), \
         patch("app.api.v1.locations.get_sunrise_sunset", side_effect=Exception("timeout")):
        resp = await client.get(
            f"{LOCATIONS_URL}/{location_id}/weather",
            headers={"Authorization": f"Bearer {token}"},
        )

    assert resp.status_code == 502
    assert "Sunrise-sunset service unavailable" in resp.json()["detail"]
