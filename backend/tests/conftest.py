import os

import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy import text
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from app.main import app
from app.core.database import Base, get_db
from app.core.redis import get_redis


class FakeRedis:
    def __init__(self):
        self._store: dict[str, str] = {}

    async def exists(self, key: str) -> int:
        return 1 if key in self._store else 0

    async def get(self, key: str):
        return self._store.get(key)

    async def set(self, key: str, value: str, ex: int | None = None, nx: bool = False, **kwargs):
        if nx and key in self._store:
            return False
        self._store[key] = str(value)
        return True

    async def delete(self, key: str) -> int:
        existed = key in self._store
        self._store.pop(key, None)
        return 1 if existed else 0

    async def eval(self, script: str, numkeys: int, *keys_and_args: str):
        # Minimal implementation for consume_presign() Lua script.
        # Expected usage: eval(script, 1, key, user_id_str)
        if numkeys != 1 or len(keys_and_args) != 2:
            raise NotImplementedError("FakeRedis.eval only supports (numkeys=1, key, user_id)")
        key, user_id = keys_and_args
        current = self._store.get(key)
        if not current or current != user_id:
            return 0
        self._store.pop(key, None)
        return 1


def get_test_database_url() -> str:
    url = (
        os.getenv("TEST_DATABASE_URL")
        or os.getenv("DATABASE_URL")
        or "postgresql+asyncpg://postgres:password@localhost:5432/lenslog_test"
    )
    database = make_url(url).database
    if not database or not database.endswith("_test"):
        raise RuntimeError(
            f"Refusing to run tests against non-test database {database!r}. "
            "Set TEST_DATABASE_URL to a database ending in '_test'."
        )
    return url


@pytest.fixture(scope="function")
async def db_session():
    engine = create_async_engine(get_test_database_url(), echo=False)
    async with engine.begin() as conn:
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis"))
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with session_factory() as session:
        yield session

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    await engine.dispose()


@pytest.fixture(scope="function")
async def client(db_session: AsyncSession):
    async def override_get_db():
        try:
            yield db_session
            await db_session.commit()
        except Exception:
            await db_session.rollback()
            raise

    fake_redis = FakeRedis()

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_redis] = lambda: fake_redis

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()
