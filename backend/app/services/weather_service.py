import math

import httpx
from app.core.config import settings

# CWA 自動氣象站觀測資料 endpoint
_CWA_STATION_URL = f"{settings.CWA_BASE_URL}/O-A0003-001"

# 無效資料的 sentinel 值（CWA 以 -99 表示缺測）
_INVALID_SENTINEL = -99.0


def _haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """計算兩點之間的球面距離（公里）"""
    r = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return r * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


async def get_weather(lat: float, lng: float) -> dict:
    """從 CWA 自動氣象站取得最近測站的即時天氣"""
    params = {
        "Authorization": settings.CWA_API_KEY,
        "format": "JSON",
        "limit": "1000",
    }
    async with httpx.AsyncClient() as client:
        resp = await client.get(_CWA_STATION_URL, params=params, timeout=15)
        resp.raise_for_status()
        data = resp.json()

    stations = data.get("records", {}).get("Station", [])
    if not stations:
        return {}

    best_station = None
    best_dist = float("inf")

    for station in stations:
        # 取 WGS84 座標
        coords = station.get("GeoInfo", {}).get("Coordinates", [])
        wgs84 = next((c for c in coords if c.get("CoordinateName") == "WGS84"), None)
        if not wgs84:
            continue

        s_lat = wgs84.get("StationLatitude")
        s_lng = wgs84.get("StationLongitude")
        if s_lat is None or s_lng is None:
            continue

        # 過濾掉天氣欄位全為無效值的測站
        elements = station.get("WeatherElement", {})
        temp = elements.get("AirTemperature")
        if temp is None or float(temp) <= _INVALID_SENTINEL:
            continue

        dist = _haversine_km(lat, lng, float(s_lat), float(s_lng))
        if dist < best_dist:
            best_dist = dist
            best_station = station

    if not best_station:
        return {}

    elements = best_station.get("WeatherElement", {})

    def _safe(val, fallback: float = 0.0) -> float:
        try:
            f = float(val)
            return fallback if f <= _INVALID_SENTINEL else f
        except (TypeError, ValueError):
            return fallback

    return {
        "temperature_2m": _safe(elements.get("AirTemperature")),
        "precipitation": _safe(elements.get("Now", {}).get("Precipitation")),
        "wind_speed_10m": _safe(elements.get("WindSpeed")),
    }


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
