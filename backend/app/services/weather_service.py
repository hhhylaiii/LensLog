import httpx
from app.core.config import settings


async def get_weather(lat: float, lng: float) -> dict:
    """從 Open-Meteo API 取得即時天氣"""
    params: dict[str, str | float] = {
        "latitude": lat,
        "longitude": lng,
        "current": "temperature_2m,precipitation,weather_code,wind_speed_10m",
        "timezone": "auto",
    }
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{settings.OPENMETEO_BASE_URL}/forecast", params=params, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        current = data.get("current", {})
        # 將頂層的 utc_offset_seconds 合入 current，供呼叫端做本地時區轉換
        current["utc_offset_seconds"] = data.get("utc_offset_seconds", 0)
        return current


async def get_sunrise_sunset(lat: float, lng: float, date: str | None = None) -> dict:
    """從 Sunrise-Sunset API 取得日出日落時間"""
    params: dict[str, str | int | float] = {"lat": lat, "lng": lng, "formatted": 0}
    if date:
        params["date"] = date
    async with httpx.AsyncClient() as client:
        resp = await client.get(settings.SUNRISE_SUNSET_API_URL, params=params, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        return data.get("results", {})
