"""
Unit tests for app/services/weather_service.py

Covers: _safe_int, _extract_element_times, _build_periods, get_weather_forecast
All external HTTP calls are mocked — no real CWA API is hit.
"""

from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

from app.services.weather_service import (
    _build_periods,
    _extract_element_times,
    _safe_int,
    get_weather_forecast,
)


# ─── _safe_int ────────────────────────────────────────────────────────────────

def test_safe_int_normal():
    assert _safe_int("28") == 28


def test_safe_int_float_string():
    assert _safe_int("27.9") == 27


def test_safe_int_empty_string():
    assert _safe_int("") == 0


def test_safe_int_whitespace():
    assert _safe_int("   ") == 0


def test_safe_int_non_numeric():
    assert _safe_int("N/A") == 0


def test_safe_int_custom_default():
    assert _safe_int("", default=-1) == -1


def test_safe_int_negative():
    assert _safe_int("-5") == -5


# ─── _extract_element_times ───────────────────────────────────────────────────

def _make_elements(name: str, count: int) -> list[dict]:
    return [{"ElementName": name, "Time": [{"StartTime": f"T{i}"} for i in range(count)]}]


def test_extract_element_times_found():
    elements = _make_elements("最高溫度", 5)
    result = _extract_element_times(elements, "最高溫度")
    assert len(result) == 5
    assert result[0]["StartTime"] == "T0"


def test_extract_element_times_not_found():
    elements = _make_elements("最高溫度", 5)
    result = _extract_element_times(elements, "不存在的元素")
    assert result == []


def test_extract_element_times_respects_max_periods():
    elements = _make_elements("最高溫度", 20)
    result = _extract_element_times(elements, "最高溫度")
    from app.services.weather_service import _MAX_PERIODS
    assert len(result) == _MAX_PERIODS


def test_extract_element_times_empty_elements():
    assert _extract_element_times([], "最高溫度") == []


# ─── _build_periods ───────────────────────────────────────────────────────────

def _make_time_entry(start: str, end: str, values: dict) -> dict:
    return {
        "StartTime": start,
        "EndTime": end,
        "ElementValue": [values],
    }


def _make_full_elements(count: int = 2) -> list[dict]:
    def times(values: dict) -> list[dict]:
        return [
            _make_time_entry(f"2026-04-21T{6*i:02d}:00:00+08:00", f"2026-04-21T{6*i+6:02d}:00:00+08:00", values)
            for i in range(count)
        ]

    return [
        {"ElementName": "最高溫度", "Time": times({"MaxTemperature": "30"})},
        {"ElementName": "最低溫度", "Time": times({"MinTemperature": "22"})},
        {"ElementName": "12小時降雨機率", "Time": times({"ProbabilityOfPrecipitation": "20"})},
        {"ElementName": "風速", "Time": times({"BeaufortScale": "3"})},
        {"ElementName": "天氣現象", "Time": times({"Weather": "多雲時晴"})},
    ]


def test_build_periods_normal():
    periods = _build_periods(_make_full_elements(2))
    assert len(periods) == 2
    assert periods[0]["temp_max"] == 30
    assert periods[0]["temp_min"] == 22
    assert periods[0]["pop"] == 20
    assert periods[0]["wind_speed"] == "3級"
    assert periods[0]["weather_description"] == "多雲時晴"
    assert "+08:00" in periods[0]["start_time"]


def test_build_periods_wind_speed_digit_formatted():
    periods = _build_periods(_make_full_elements(1))
    assert periods[0]["wind_speed"] == "3級"


def test_build_periods_wind_speed_non_digit_passthrough():
    elements = _make_full_elements(1)
    for el in elements:
        if el["ElementName"] == "風速":
            el["Time"][0]["ElementValue"] = [{"BeaufortScale": "輕風"}]
    periods = _build_periods(elements)
    assert periods[0]["wind_speed"] == "輕風"


def test_build_periods_empty_element_value():
    elements = _make_full_elements(1)
    for el in elements:
        if el["ElementName"] == "12小時降雨機率":
            el["Time"][0]["ElementValue"] = [{"ProbabilityOfPrecipitation": ""}]
    periods = _build_periods(elements)
    assert periods[0]["pop"] == 0


def test_build_periods_empty_element_value_list():
    elements = _make_full_elements(1)
    for el in elements:
        if el["ElementName"] == "天氣現象":
            el["Time"][0]["ElementValue"] = []
    periods = _build_periods(elements)
    assert periods[0]["weather_description"] == ""


def test_build_periods_unequal_time_counts():
    elements = _make_full_elements(3)
    for el in elements:
        if el["ElementName"] == "風速":
            el["Time"] = el["Time"][:1]
    periods = _build_periods(elements)
    assert len(periods) == 1


def test_build_periods_missing_element_returns_empty():
    elements = [el for el in _make_full_elements(2) if el["ElementName"] != "天氣現象"]
    periods = _build_periods(elements)
    assert periods == []


def test_build_periods_no_elements():
    assert _build_periods([]) == []


# ─── get_weather_forecast ─────────────────────────────────────────────────────

def _make_cwa_response(county_name: str, element_count: int = 2) -> dict:
    elements = _make_full_elements(element_count)
    return {
        "records": {
            "Locations": [
                {
                    "Location": [
                        {"LocationName": county_name, "WeatherElement": elements},
                        {"LocationName": "其他縣市", "WeatherElement": []},
                    ]
                }
            ]
        }
    }


@pytest.mark.asyncio
async def test_get_weather_forecast_county_found():
    mock_resp = MagicMock()
    mock_resp.json.return_value = _make_cwa_response("臺北市", 2)
    mock_resp.raise_for_status = MagicMock()

    with patch("httpx.AsyncClient") as mock_client_cls:
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=mock_resp)
        mock_client_cls.return_value.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client_cls.return_value.__aexit__ = AsyncMock(return_value=False)

        result = await get_weather_forecast("臺北市")

    assert len(result) == 2
    assert result[0]["temp_max"] == 30
    assert result[0]["wind_speed"] == "3級"


@pytest.mark.asyncio
async def test_get_weather_forecast_county_not_found():
    mock_resp = MagicMock()
    mock_resp.json.return_value = _make_cwa_response("臺北市", 2)
    mock_resp.raise_for_status = MagicMock()

    with patch("httpx.AsyncClient") as mock_client_cls:
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=mock_resp)
        mock_client_cls.return_value.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client_cls.return_value.__aexit__ = AsyncMock(return_value=False)

        result = await get_weather_forecast("不存在縣市")

    assert result == []


@pytest.mark.asyncio
async def test_get_weather_forecast_http_error():
    with patch("httpx.AsyncClient") as mock_client_cls:
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(side_effect=httpx.HTTPStatusError(
            "502", request=MagicMock(), response=MagicMock()
        ))
        mock_client_cls.return_value.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client_cls.return_value.__aexit__ = AsyncMock(return_value=False)

        with pytest.raises(httpx.HTTPStatusError):
            await get_weather_forecast("臺北市")


@pytest.mark.asyncio
async def test_get_weather_forecast_empty_locations():
    mock_resp = MagicMock()
    mock_resp.json.return_value = {"records": {"Locations": [{"Location": []}]}}
    mock_resp.raise_for_status = MagicMock()

    with patch("httpx.AsyncClient") as mock_client_cls:
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=mock_resp)
        mock_client_cls.return_value.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client_cls.return_value.__aexit__ = AsyncMock(return_value=False)

        result = await get_weather_forecast("臺北市")

    assert result == []
