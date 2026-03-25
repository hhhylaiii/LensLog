# Pydantic v2、JWT 認證與安全性

## 版本

```
pydantic>=2.7.0
pydantic-settings>=2.3.0
python-jose[cryptography]>=3.3.0
passlib[bcrypt]>=1.7.4
```

## 在此專案中的用途與角色

- **Pydantic v2**：FastAPI 的請求/回應資料驗證與序列化層，以及設定管理（`pydantic-settings`）。
- **python-jose**：JWT（JSON Web Token）的產生與驗證，實作 Access Token + Refresh Token 的雙 token 認證策略。
- **passlib + bcrypt**：密碼雜湊與驗證，確保資料庫中不儲存明文密碼。

## 主要功能與特性說明

### 設定管理（pydantic-settings）

位於 `backend/app/core/config.py`，透過 `BaseSettings` 自動從環境變數或 `.env` 檔案載入設定：

```python
class Settings(BaseSettings):
    SECRET_KEY: str = "change-me-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15   # Access token 15 分鐘
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7      # Refresh token 7 天

    class Config:
        env_file = ".env"
        case_sensitive = True

@lru_cache()
def get_settings() -> Settings:
    return Settings()
```

`@lru_cache()` 確保 Settings 只被實例化一次，避免重複讀取 `.env`。

### JWT Token 策略

位於 `backend/app/core/security.py`：

- **Access Token**：15 分鐘有效期，用於 API 請求的身份驗證。
- **Refresh Token**：7 天有效期，用於取得新的 Access Token，不用於一般 API 請求。
- Token payload 中包含 `type` 欄位（`"access"` 或 `"refresh"`），避免 token 混用。

```python
def create_access_token(data: dict, expires_delta=None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
```

### 密碼雜湊

使用 bcrypt 演算法，透過 passlib 的 `CryptContext` 統一管理：

```python
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)
```

### Pydantic Schema 設計

Schemas 定義於 `backend/app/schemas/`，作為 API 層的輸入/輸出型別，獨立於 ORM 模型：

```python
# 請求 body 驗證
class PhotoCreate(BaseModel):
    s3_key: str
    caption: str | None = None
    location_id: uuid.UUID | None = None
    is_public: bool = True

# API 回應序列化
class PhotoResponse(BaseModel):
    id: uuid.UUID
    s3_key: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)  # 允許從 ORM 物件直接建立
```

### 前端 Token 儲存策略

| 平台 | 儲存方式 | 安全考量 |
|---|---|---|
| Web | `localStorage` | 適用開發環境；生產環境建議改為 httpOnly cookie |
| Mobile | `expo-secure-store` | 使用 iOS Keychain / Android Keystore，安全性高 |

## Email 通知

```
fastapi-mail>=1.4.1
```

透過 `fastapi-mail` 發送系統郵件（帳號驗證、密碼重置等），SMTP 設定：

| 變數 | 說明 |
|---|---|
| `MAIL_SERVER` | SMTP 伺服器（預設 `smtp.gmail.com`） |
| `MAIL_PORT` | SMTP port（預設 `587`，STARTTLS） |
| `MAIL_FROM` | 寄件人地址（`noreply@lenslog.app`） |

## 相關資源

- [Pydantic v2 文件](https://docs.pydantic.dev/latest/)
- [pydantic-settings 文件](https://docs.pydantic.dev/latest/concepts/pydantic_settings/)
- [python-jose 文件](https://python-jose.readthedocs.io/)
- [passlib 文件](https://passlib.readthedocs.io/)
- [fastapi-mail 文件](https://sabuhish.github.io/fastapi-mail/)
