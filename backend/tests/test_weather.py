"""
GET /locations/{id}/weather endpoint integration tests

Test scope:
- Success: forecast list returned with correct fields
- Cache hit: returns cached response with correct format
- Cache hit respects auth (no 403 bypass)
- 403: querying another user's location
- 404: location not found
- 401: unauthenticated
- 422: coordinates outside any known township
- 502: CWA F-D0047-091 API failure
- 502: Sunrise-Sunset API failure
- Field types: pop is int, wind_speed is str, start_time has timezone
"""

import json
from unittest.mock import AsyncMock, patch

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


# Two ForecastPeriod-shaped dicts covering 24 hours
MOCK_FORECAST_DATA = [
    {
        "start_time": "2026-04-21T12:00:00+08:00",
        "end_time": "2026-04-22T00:00:00+08:00",
        "temp_max": 28,
        "temp_min": 22,
        "pop": 30,
        "wind_speed": "3級",
        "weather_description": "多雲時晴",
    },
    {
        "start_time": "2026-04-22T00:00:00+08:00",
        "end_time": "2026-04-22T12:00:00+08:00",
        "temp_max": 25,
        "temp_min": 20,
        "pop": 60,
        "wind_speed": "2級",
        "weather_description": "陰短暫雨",
    },
]

MOCK_SUN_DATA = {
    "sunrise": "2024-04-09T21:35:00+00:00",  # UTC → Asia/Taipei 05:35
    "sunset": "2024-04-09T10:14:00+00:00",   # UTC → Asia/Taipei 18:14
}


class _MockTownship:
    name = "信義區"
    county = "臺北市"


# ─── Tests ────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_get_weather_success(client: AsyncClient):
    """Success: authenticated user gets forecast list for their location."""
    token = await register_and_login(client, "user_w1", "w1@test.com", "password123")
    location_id = await create_location(client, token)

    with patch("app.api.v1.locations._get_township", new=AsyncMock(return_value=_MockTownship())), \
         patch("app.api.v1.locations.get_weather_forecast", new=AsyncMock(return_value=MOCK_FORECAST_DATA)), \
         patch("app.api.v1.locations.get_sunrise_sunset", new=AsyncMock(return_value=MOCK_SUN_DATA)):
        resp = await client.get(
            f"{LOCATIONS_URL}/{location_id}/weather",
            headers={"Authorization": f"Bearer {token}"},
        )

    assert resp.status_code == 200
    data = resp.json()
    assert data["township"] == "信義區"
    assert data["county"] == "臺北市"
    assert len(data["forecasts"]) == 2
    assert data["forecasts"][0]["temp_max"] == 28
    assert data["forecasts"][0]["temp_min"] == 22
    assert data["forecasts"][0]["pop"] == 30
    assert data["forecasts"][0]["wind_speed"] == "3級"
    assert data["forecasts"][0]["weather_description"] == "多雲時晴"
    assert data["sunrise"] == "05:35"
    assert data["sunset"] == "18:14"


@pytest.mark.asyncio
async def test_get_weather_forbidden(client: AsyncClient):
    """H-B: another user cannot query someone else's location weather."""
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
    """H-B: cache hit still enforces auth — other user gets 403 even when cache is warm."""
    owner_token = await register_and_login(client, "cache_owner", "cache_owner@test.com", "password123")
    other_token = await register_and_login(client, "cache_other", "cache_other@test.com", "password123")
    location_id = await create_location(client, owner_token)

    with patch("app.api.v1.locations._get_township", new=AsyncMock(return_value=_MockTownship())), \
         patch("app.api.v1.locations.get_weather_forecast", new=AsyncMock(return_value=MOCK_FORECAST_DATA)), \
         patch("app.api.v1.locations.get_sunrise_sunset", new=AsyncMock(return_value=MOCK_SUN_DATA)):
        owner_resp = await client.get(
            f"{LOCATIONS_URL}/{location_id}/weather",
            headers={"Authorization": f"Bearer {owner_token}"},
        )
    assert owner_resp.status_code == 200

    other_resp = await client.get(
        f"{LOCATIONS_URL}/{location_id}/weather",
        headers={"Authorization": f"Bearer {other_token}"},
    )
    assert other_resp.status_code == 403


@pytest.mark.asyncio
async def test_get_weather_not_found(client: AsyncClient):
    """Non-existent location_id returns 404."""
    token = await register_and_login(client, "user_w2", "w2@test.com", "password123")
    fake_id = "00000000-0000-0000-0000-000000000000"

    resp = await client.get(
        f"{LOCATIONS_URL}/{fake_id}/weather",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_get_weather_unauthorized(client: AsyncClient):
    """Unauthenticated request returns 401."""
    fake_id = "00000000-0000-0000-0000-000000000000"
    resp = await client.get(f"{LOCATIONS_URL}/{fake_id}/weather")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_get_weather_no_township(client: AsyncClient):
    """Coordinates outside all known administrative districts return 422."""
    token = await register_and_login(client, "user_w5", "w5@test.com", "password123")
    location_id = await create_location(client, token)

    with patch("app.api.v1.locations._get_township", new=AsyncMock(return_value=None)):
        resp = await client.get(
            f"{LOCATIONS_URL}/{location_id}/weather",
            headers={"Authorization": f"Bearer {token}"},
        )

    assert resp.status_code == 422
    assert "administrative district" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_get_weather_cwa_api_failure(client: AsyncClient):
    """CWA F-D0047-093 API failure returns 502."""
    token = await register_and_login(client, "user_w3", "w3@test.com", "password123")
    location_id = await create_location(client, token)

    with patch("app.api.v1.locations._get_township", new=AsyncMock(return_value=_MockTownship())), \
         patch("app.api.v1.locations.get_weather_forecast", side_effect=Exception("CWA timeout")):
        resp = await client.get(
            f"{LOCATIONS_URL}/{location_id}/weather",
            headers={"Authorization": f"Bearer {token}"},
        )

    assert resp.status_code == 502
    assert "Weather service unavailable" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_get_weather_sunrise_api_failure(client: AsyncClient):
    """Sunrise-Sunset API failure returns 502."""
    token = await register_and_login(client, "user_w4", "w4@test.com", "password123")
    location_id = await create_location(client, token)

    with patch("app.api.v1.locations._get_township", new=AsyncMock(return_value=_MockTownship())), \
         patch("app.api.v1.locations.get_weather_forecast", new=AsyncMock(return_value=MOCK_FORECAST_DATA)), \
         patch("app.api.v1.locations.get_sunrise_sunset", side_effect=Exception("timeout")):
        resp = await client.get(
            f"{LOCATIONS_URL}/{location_id}/weather",
            headers={"Authorization": f"Bearer {token}"},
        )

    assert resp.status_code == 502
    assert "Sunrise-sunset service unavailable" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_forecast_field_types(client: AsyncClient):
    """US3: pop is int 0-100, wind_speed is str, start_time contains timezone."""
    token = await register_and_login(client, "user_w6", "w6@test.com", "password123")
    location_id = await create_location(client, token)

    with patch("app.api.v1.locations._get_township", new=AsyncMock(return_value=_MockTownship())), \
         patch("app.api.v1.locations.get_weather_forecast", new=AsyncMock(return_value=MOCK_FORECAST_DATA)), \
         patch("app.api.v1.locations.get_sunrise_sunset", new=AsyncMock(return_value=MOCK_SUN_DATA)):
        resp = await client.get(
            f"{LOCATIONS_URL}/{location_id}/weather",
            headers={"Authorization": f"Bearer {token}"},
        )

    assert resp.status_code == 200
    period = resp.json()["forecasts"][0]
    assert isinstance(period["pop"], int)
    assert 0 <= period["pop"] <= 100
    assert isinstance(period["wind_speed"], str)
    assert isinstance(period["weather_description"], str)
    assert len(period["weather_description"]) > 0
    assert "+08:00" in period["start_time"]


@pytest.mark.asyncio
async def test_get_weather_cache_hit_returns_correct_response(client: AsyncClient):
    """Cache hit path: cached JSON is returned with correct structure and fields."""
    token = await register_and_login(client, "user_w7", "w7@test.com", "password123")
    location_id = await create_location(client, token)

    cached_payload = {
        "township": "信義區",
        "county": "臺北市",
        "forecasts": [
            {
                "start_time": "2026-04-21T12:00:00+08:00",
                "end_time": "2026-04-22T00:00:00+08:00",
                "temp_max": 28,
                "temp_min": 22,
                "pop": 30,
                "wind_speed": "3級",
                "weather_description": "多雲時晴",
            }
        ],
        "sunrise": "05:35",
        "sunset": "18:14",
    }

    from app.core.redis import get_redis
    from app.main import app

    mock_redis = AsyncMock()
    mock_redis.exists = AsyncMock(return_value=0)
    mock_redis.get = AsyncMock(return_value=json.dumps(cached_payload))

    app.dependency_overrides[get_redis] = lambda: mock_redis

    resp = await client.get(
        f"{LOCATIONS_URL}/{location_id}/weather",
        headers={"Authorization": f"Bearer {token}"},
    )

    app.dependency_overrides.clear()

    assert resp.status_code == 200
    data = resp.json()
    assert data["township"] == "信義區"
    assert data["county"] == "臺北市"
    assert len(data["forecasts"]) == 1
    assert data["forecasts"][0]["temp_max"] == 28
    assert data["forecasts"][0]["wind_speed"] == "3級"
    assert data["sunrise"] == "05:35"
    assert data["sunset"] == "18:14"
