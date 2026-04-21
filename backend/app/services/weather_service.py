import logging
from typing import Any

import httpx
from app.core.config import settings

# F-D0047-091 is the REST API ID for 1-week township forecast
_CWA_FORECAST_URL = f"{settings.CWA_BASE_URL}/F-D0047-091"

logger = logging.getLogger(__name__)

_FORECAST_ELEMENTS = "最高溫度,最低溫度,12小時降雨機率,風速,天氣現象"
# Controls how many 12-hour forecast periods to return (max 14 = ~7 days).
# 2 = 24h, 4 = 2 days, 8 = 4 days, 14 = 7 days
_MAX_PERIODS = 14


def _safe_int(raw: str, default: int = 0) -> int:
    """Parse a CWA value string to int, returning default on empty or invalid input."""
    s = raw.strip()
    if not s:
        return default
    try:
        return int(float(s))
    except (ValueError, TypeError):
        return default


def _extract_element_times(elements: list[dict], element_name: str) -> list[dict]:
    for el in elements:
        if el.get("ElementName") == element_name:
            return el.get("Time", [])[:_MAX_PERIODS]
    return []


def _build_periods(elements: list[dict]) -> list[dict[str, Any]]:
    """Parse F-D0047-091 WeatherElement list into ForecastPeriod dicts."""
    max_t_times = _extract_element_times(elements, "最高溫度")
    min_t_times = _extract_element_times(elements, "最低溫度")
    pop_times = _extract_element_times(elements, "12小時降雨機率")
    ws_times = _extract_element_times(elements, "風速")
    wx_times = _extract_element_times(elements, "天氣現象")

    periods = []
    count = min(len(max_t_times), len(min_t_times), len(pop_times), len(ws_times), len(wx_times))
    for i in range(count):
        def _val(times: list[dict], key: str, idx: int = i) -> str:
            ev = times[idx].get("ElementValue", [{}])
            return str(ev[0].get(key, "")) if ev else ""

        ws_val = _val(ws_times, "BeaufortScale")
        wind_speed_desc = f"{ws_val}級" if ws_val and ws_val.isdigit() else ws_val

        periods.append({
            "start_time": max_t_times[i].get("StartTime", ""),
            "end_time": max_t_times[i].get("EndTime", ""),
            "temp_max": _safe_int(_val(max_t_times, "MaxTemperature")),
            "temp_min": _safe_int(_val(min_t_times, "MinTemperature")),
            "pop": _safe_int(_val(pop_times, "ProbabilityOfPrecipitation")),
            "wind_speed": wind_speed_desc,
            "weather_description": _val(wx_times, "Weather"),
        })
    return periods


async def get_weather_forecast(county_name: str) -> list[dict[str, Any]]:
    """Call CWA F-D0047-091 and return up to 2 forecast periods for the county."""
    params = {
        "Authorization": settings.CWA_API_KEY,
        "format": "JSON",
        "elementName": _FORECAST_ELEMENTS,
    }
    logger.debug("Fetching CWA forecast for county=%s", county_name)
    # CWA certificates lack Subject Key Identifier; SSL verification must be disabled.
    async with httpx.AsyncClient(verify=False) as client:
        resp = await client.get(_CWA_FORECAST_URL, params=params, timeout=15)
        resp.raise_for_status()
        data = resp.json()

    all_locations = (
        data.get("records", {})
        .get("Locations", [{}])[0]
        .get("Location", [])
    )
    # F-D0047-091 locationName query param does not filter — match county in Python
    location = next(
        (loc for loc in all_locations if loc.get("LocationName") == county_name),
        None,
    )
    if not location:
        logger.warning("No forecast location data for county=%s", county_name)
        return []

    elements = location.get("WeatherElement", [])
    return _build_periods(elements)


async def get_sunrise_sunset(lat: float, lng: float, date: str | None = None) -> dict:
    """Fetch sunrise and sunset times from the Sunrise-Sunset API."""
    params: dict[str, str | int | float] = {"lat": lat, "lng": lng, "formatted": 0}
    if date:
        params["date"] = date
    async with httpx.AsyncClient() as client:
        resp = await client.get(settings.SUNRISE_SUNSET_API_URL, params=params, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        return data.get("results", {})
