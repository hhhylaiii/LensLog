import uuid
import inspect
from collections.abc import Awaitable
from typing import Any, TypeGuard, cast

import redis.asyncio as aioredis

from app.core.config import settings


_PRESIGN_PREFIX = "presign:"

_CONSUME_PRESIGN_LUA = """
local v = redis.call('GET', KEYS[1])
if not v then
  return 0
end
if v ~= ARGV[1] then
  return 0
end
redis.call('DEL', KEYS[1])
return 1
"""


def _presign_key(s3_key: str) -> str:
    return f"{_PRESIGN_PREFIX}{s3_key}"


def _is_awaitable(value: Any) -> TypeGuard[Awaitable[Any]]:
    return inspect.isawaitable(value)


async def register_presign(redis: aioredis.Redis, s3_key: str, user_id: uuid.UUID) -> None:
    await redis.set(
        _presign_key(s3_key),
        str(user_id),
        ex=settings.PHOTO_PRESIGN_EXPIRE_SECONDS,
    )


async def consume_presign(redis: aioredis.Redis, s3_key: str, user_id: uuid.UUID) -> bool:
    """
    Atomically validate and consume a presigned s3_key.

    - Returns True only if the key exists and belongs to user_id.
    - Consumes (deletes) the key on success to prevent replay.
    - Leaves the key intact if the owner mismatches.
    """
    key = _presign_key(s3_key)
    try:
        raw_result = redis.eval(_CONSUME_PRESIGN_LUA, 1, key, str(user_id))
        if _is_awaitable(raw_result):
            value: str | int = await cast(Awaitable[str], raw_result)
        else:
            value = cast(str | int, raw_result)
        return bool(int(value))
    except Exception:
        owner_id = await redis.get(key)
        if not owner_id or owner_id != str(user_id):
            return False
        await redis.delete(key)
        return True
