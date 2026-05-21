import uuid

import pytest
from geoalchemy2.elements import WKTElement
from unittest.mock import AsyncMock, patch

from app.api.deps import get_current_active_user
from app.main import app
from app.models.models import GlobalLocation, Location, User


@pytest.fixture(autouse=True)
def clear_overrides():
    yield
    app.dependency_overrides.clear()


@pytest.fixture
async def active_user(db_session):
    user = User(
        username="directory-owner",
        email="directory-owner@example.com",
        password_hash="hashed-password",
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
async def other_user(db_session):
    user = User(
        username="directory-other",
        email="directory-other@example.com",
        password_hash="hashed-password",
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.mark.asyncio
async def test_location_directory_returns_user_and_global_matches(client, db_session, active_user, other_user):
    app.dependency_overrides[get_current_active_user] = lambda: active_user

    my_location = Location(
        user_id=active_user.id,
        name="我的台北101機位",
        description="私人機位",
        latitude=25.0339,
        longitude=121.5645,
    )
    my_location.geom = WKTElement("POINT(121.5645 25.0339)", srid=4326)
    other_location = Location(
        user_id=other_user.id,
        name="別人的秘密機位",
        description="不應出現在我的目錄",
        latitude=25.0345,
        longitude=121.5650,
    )
    other_location.geom = WKTElement("POINT(121.5650 25.0345)", srid=4326)
    global_location = GlobalLocation(
        name="台北101",
        description="公共地標",
        latitude=25.033968,
        longitude=121.564468,
        is_active=True,
    )
    global_location.geom = WKTElement("POINT(121.564468 25.033968)", srid=4326)
    db_session.add_all([my_location, other_location, global_location])
    await db_session.commit()

    response = await client.get(
        "/api/v1/location-directory",
        params={"lat": 25.0338, "lng": 121.5646, "radius": 1000, "query": "101"},
    )

    assert response.status_code == 200, response.text
    body = response.json()
    assert {item["source"] for item in body} == {"global", "user"}
    names = {item["name"] for item in body}
    assert "台北101" in names
    assert "我的台北101機位" in names
    assert all(item["distance_m"] is not None for item in body)


@pytest.mark.asyncio
async def test_global_locations_keyword_search(client, db_session):
    db_session.add_all([
        GlobalLocation(
            name="台北101",
            description="公共地標",
            latitude=25.033968,
            longitude=121.564468,
            is_active=True,
            geom=WKTElement("POINT(121.564468 25.033968)", srid=4326),
        ),
        GlobalLocation(
            name="象山",
            description="山景",
            latitude=25.027055,
            longitude=121.570370,
            is_active=True,
            geom=WKTElement("POINT(121.570370 25.027055)", srid=4326),
        ),
    ])
    await db_session.commit()

    response = await client.get("/api/v1/global-locations", params={"query": "101"})

    assert response.status_code == 200, response.text
    body = response.json()
    assert len(body) == 1
    assert body[0]["name"] == "台北101"


@pytest.mark.asyncio
async def test_user_locations_list_only_returns_current_user_rows(client, db_session, active_user, other_user):
    app.dependency_overrides[get_current_active_user] = lambda: active_user

    owned = Location(
        user_id=active_user.id,
        name="我的景點",
        latitude=25.0,
        longitude=121.5,
        geom=WKTElement("POINT(121.5 25.0)", srid=4326),
    )
    foreign = Location(
        user_id=other_user.id,
        name="別人的景點",
        latitude=25.1,
        longitude=121.6,
        geom=WKTElement("POINT(121.6 25.1)", srid=4326),
    )
    db_session.add_all([owned, foreign])
    await db_session.commit()

    response = await client.get("/api/v1/locations")

    assert response.status_code == 200, response.text
    body = response.json()
    assert len(body) == 1
    assert body[0]["name"] == "我的景點"


@pytest.mark.asyncio
async def test_global_location_weather_success(client, db_session):
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

    class _MockTownship:
        name = "信義區"
        county = "臺北市"

    forecast = [{
        "start_time": "2026-04-21T12:00:00+08:00",
        "end_time": "2026-04-22T00:00:00+08:00",
        "temp_max": 28,
        "temp_min": 22,
        "pop": 30,
        "wind_speed": "3級",
        "weather_description": "多雲時晴",
    }]
    sun = {
        "sunrise": "2024-04-09T21:35:00+00:00",
        "sunset": "2024-04-09T10:14:00+00:00",
    }

    with patch("app.api.v1.location_directory._get_township", new=AsyncMock(return_value=_MockTownship())), \
         patch("app.api.v1.location_directory.get_weather_forecast", new=AsyncMock(return_value=forecast)), \
         patch("app.api.v1.location_directory.get_sunrise_sunset", new=AsyncMock(return_value=sun)):
        response = await client.get(f"/api/v1/global-locations/{global_location.id}/weather")

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["county"] == "臺北市"
    assert body["township"] == "信義區"
    assert body["sunrise"] == "05:35"
    assert body["sunset"] == "18:14"
    assert len(body["forecasts"]) == 1
