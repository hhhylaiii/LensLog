# 測試工具（pytest、pytest-asyncio、httpx）

## 版本

```
pytest>=8.2.0
pytest-asyncio>=0.23.0
httpx>=0.27.0
```

## 在此專案中的用途與角色

測試工具目前用於 **Backend（FastAPI/Python）** 的測試：

- **pytest**：Python 測試框架，執行所有 backend 測試
- **pytest-asyncio**：讓 pytest 支援 `async def` 測試函式，配合 FastAPI 的非同步 endpoint
- **httpx**：非同步 HTTP 客戶端，配合 FastAPI 的 `TestClient` 或 `AsyncClient` 進行 API 整合測試

## 測試目錄結構

```
backend/
└── tests/
    ├── __init__.py
    ├── conftest.py        # pytest fixtures（DB session、test client 等）
    └── test_*.py         # 各模組測試檔案
```

## 基本使用方式

### 非同步 API 整合測試

```python
import pytest
from httpx import AsyncClient
from app.main import app

@pytest.mark.asyncio
async def test_health_check():
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"

@pytest.mark.asyncio
async def test_list_photos():
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/api/v1/photos")
    assert response.status_code == 200
    assert isinstance(response.json(), list)
```

### pytest Fixture 範例

```python
# tests/conftest.py
import pytest
from httpx import AsyncClient
from app.main import app

@pytest.fixture
async def client():
    async with AsyncClient(app=app, base_url="http://test") as c:
        yield c
```

### 執行測試

```bash
# 執行所有測試
docker-compose exec backend pytest

# 執行特定檔案
docker-compose exec backend pytest tests/test_photos.py

# 顯示詳細輸出
docker-compose exec backend pytest -v

# 顯示 print 輸出
docker-compose exec backend pytest -s
```

## pytest-asyncio 設定

在 `pyproject.toml` 或 `pytest.ini` 中設定 asyncio mode：

```toml
[tool.pytest.ini_options]
asyncio_mode = "auto"   # 自動識別 async 測試，不需要逐個加 @pytest.mark.asyncio
```

## 測試策略說明

目前 backend 測試偏重 **API 整合測試**（使用 httpx AsyncClient 直接呼叫 FastAPI），測試的是完整的請求/回應週期，而非單獨測試 service 層函式。

這確保了 Pydantic 驗證、FastAPI 依賴注入、ORM 查詢等整個 stack 都被覆蓋到。

## httpx 的雙重角色

httpx 在此專案中有兩個用途：
1. **測試用途**（backend/tests）：搭配 `AsyncClient(app=app)` 做 in-process 測試，不需要啟動真實伺服器
2. **生產用途**（`backend/app/services/weather_service.py`）：作為非同步 HTTP 客戶端呼叫外部 API（Open-Meteo、Sunrise-Sunset）

## 相關資源

- [pytest 文件](https://docs.pytest.org/)
- [pytest-asyncio 文件](https://pytest-asyncio.readthedocs.io/)
- [httpx 文件](https://www.python-httpx.org/)
- [FastAPI 測試指南](https://fastapi.tiangolo.com/tutorial/testing/)
