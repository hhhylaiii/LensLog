import pytest
from httpx import AsyncClient


REGISTER_URL = "/api/v1/auth/register"
LOGIN_URL = "/api/v1/auth/login"
REFRESH_URL = "/api/v1/auth/refresh"
LOGOUT_URL = "/api/v1/auth/logout"
ME_URL = "/api/v1/auth/me"


async def register_and_login(client: AsyncClient, username: str, email: str, password: str) -> dict:
    await client.post(REGISTER_URL, json={"username": username, "email": email, "password": password})
    response = await client.post(LOGIN_URL, json={"email": email, "password": password})
    return response.json()


@pytest.mark.asyncio
async def test_register_success(client: AsyncClient):
    response = await client.post(REGISTER_URL, json={
        "username": "testuser1",
        "email": "test1@example.com",
        "password": "password123",
    })
    assert response.status_code == 201
    data = response.json()
    assert data["username"] == "testuser1"
    assert data["email"] == "test1@example.com"


@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient):
    payload = {"username": "testuser2", "email": "dup@example.com", "password": "password123"}
    await client.post(REGISTER_URL, json=payload)

    response = await client.post(REGISTER_URL, json={
        "username": "testuser2b",
        "email": "dup@example.com",
        "password": "password123",
    })
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient):
    await client.post(REGISTER_URL, json={
        "username": "testuser3",
        "email": "test3@example.com",
        "password": "password123",
    })
    response = await client.post(LOGIN_URL, json={
        "email": "test3@example.com",
        "password": "password123",
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient):
    await client.post(REGISTER_URL, json={
        "username": "testuser4",
        "email": "test4@example.com",
        "password": "password123",
    })
    response = await client.post(LOGIN_URL, json={
        "email": "test4@example.com",
        "password": "wrongpassword",
    })
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_refresh_success(client: AsyncClient):
    tokens = await register_and_login(client, "testuser5", "test5@example.com", "password123")
    refresh_token = tokens["refresh_token"]

    response = await client.post(REFRESH_URL, params={"refresh_token": refresh_token})
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data


@pytest.mark.asyncio
async def test_logout_success(client: AsyncClient):
    tokens = await register_and_login(client, "testuser6", "test6@example.com", "password123")
    access_token = tokens["access_token"]
    refresh_token = tokens["refresh_token"]

    response = await client.post(
        LOGOUT_URL,
        json={"refresh_token": refresh_token},
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_get_me(client: AsyncClient):
    tokens = await register_and_login(client, "testuser7", "test7@example.com", "password123")
    access_token = tokens["access_token"]

    response = await client.get(
        ME_URL,
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "testuser7"
    assert data["email"] == "test7@example.com"
