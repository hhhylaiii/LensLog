# Backend Structure

This README describes the backend file structure and what each main folder is responsible for.

## Directory Tree

```text
backend/
├── README.md
├── API_docs.md
├── Dockerfile
├── requirements.txt
├── pytest.ini
├── mypy.ini
├── alembic.ini
├── .env
├── .env.example
├── .dockerignore
├── app/
│   ├── main.py
│   ├── api/
│   │   ├── deps.py
│   │   └── v1/
│   │       ├── __init__.py
│   │       ├── auth.py
│   │       ├── photos.py
│   │       ├── locations.py
│   │       ├── gear.py
│   │       ├── stats.py
│   │       └── admin.py
│   ├── core/
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── filenames.py
│   │   ├── redis.py
│   │   └── security.py
│   ├── models/
│   │   ├── __init__.py
│   │   └── models.py
│   ├── schemas/
│   │   └── __init__.py
│   ├── services/
│   │   ├── exif_service.py
│   │   ├── storage_service.py
│   │   ├── s3_service.py
│   │   └── weather_service.py
│   └── tasks/
│       ├── exif_tasks.py
│       └── notification_tasks.py
├── alembic/
│   ├── env.py
│   ├── script.py.mako
│   └── versions/
│       ├── 001_initial.py
│       ├── 002_add_is_admin.py
│       ├── 003_add_locations_geom.py
│       └── 004_add_townships_table.py
├── data/
│   └── taiwan_townships.geojson
├── scripts/
│   └── seed_townships.py
├── tests/
│   ├── conftest.py
│   ├── test_auth.py
│   ├── test_blacklist.py
│   ├── test_exif.py
│   ├── test_main.py
│   ├── test_photos_presign_post_size.py
│   ├── test_photos_presign_security.py
│   ├── test_storage.py
│   ├── test_weather.py
│   └── test_weather_service.py
└── images/
    ├── auth_endpoints.mmd
    ├── auth_endpoints.png
    ├── auth_flow.mmd
    ├── auth_flow.png
    ├── er_diagram.mmd
    ├── er_diagram.png
    ├── photo_upload.mmd
    └── photo_upload.png
```

## Top-Level Files

`README.md`
- This file.
- Describes backend structure and the role of each folder.

`API_docs.md`
- API documentation.
- Contains endpoint summaries, request examples, and response examples.

`Dockerfile`
- Container build instructions for the backend service.

`requirements.txt`
- Python dependency list for the backend.

`pytest.ini`
- Pytest configuration.

`mypy.ini`
- Mypy type-checking configuration.

`alembic.ini`
- Alembic configuration file for database migrations.

`.env`
- Local environment variables used during development.

`.env.example`
- Example environment variable file for setup reference.

`.dockerignore`
- Files and folders excluded from Docker build context.

## App Folder

`app/`
- Main backend application code.
- Contains the FastAPI app, routes, dependencies, business logic, models, and schemas.

`app/main.py`
- FastAPI entry point.
- Creates the app, configures middleware, registers routers, and exposes `/health`.

### API Layer

`app/api/`
- Request handling layer.
- Holds dependencies and versioned API routes.

`app/api/deps.py`
- Shared FastAPI dependencies.
- Common examples: current user lookup, admin auth, token extraction, database dependency injection.

`app/api/v1/`
- Version 1 API routes.
- Each file groups endpoints by domain.

`app/api/v1/auth.py`
- Authentication endpoints.
- Registration, login, token refresh, logout, and current-user lookup.

`app/api/v1/photos.py`
- Photo endpoints.
- Photo listing, record creation, single-photo lookup, update, delete, and storage presign flow (MinIO/R2/S3).

`app/api/v1/locations.py`
- Location endpoints.
- Current-user private location CRUD, nearby search with coordinates, and `GET /locations/{id}/weather` for 7-day forecast.

`app/api/v1/location_directory.py`
- Global location directory endpoints.
- `GET /global-locations`, `GET /global-locations/{id}/weather`, and `GET /location-directory` for merged private/global matching results.

`app/api/v1/gear.py`
- Gear endpoints.
- Private gear CRUD for the current user.

`app/api/v1/stats.py`
- Statistics endpoints.
- Aggregated data such as focal length, aperture, and monthly counts.

`app/api/v1/admin.py`
- Admin-only endpoints.
- User listing, user deletion, and admin-role toggling.

### Core Layer

`app/core/`
- Shared infrastructure and application configuration.

`app/core/config.py`
- Reads and exposes application settings from environment variables.
- `DEBUG` also accepts common non-boolean values like `release` / `production` and treats them as `False` to avoid startup failures from globally-set environment variables.
- `PHOTO_UPLOAD_MAX_SIZE_MB` controls the maximum allowed direct-upload size for photo presigned POST policies.
- `PHOTO_PRESIGN_EXPIRE_SECONDS` controls how long a presigned upload URL is valid and is also used as the TTL for Redis `s3_key` ownership tracking (required by `POST /photos`).

`app/core/database.py`
- SQLAlchemy database engine and session setup.

`app/core/filenames.py`
- Filename sanitization helpers used by endpoints that accept user-provided filenames (e.g. presign upload).

`app/core/redis.py`
- Redis connection setup.

`app/core/security.py`
- Security utilities.
- Password hashing, password verification, JWT creation, and token decoding.

### Data Layer

`app/models/`
- SQLAlchemy ORM models.
- Defines database tables and relationships.

`app/models/models.py`
- Main model definitions such as `User`, `Photo`, `Location`, `Gear`, `Township`, and related records.
- Includes both private `Location` and platform-maintained `GlobalLocation`, plus dual photo location linkage (`user_location_id` / `global_location_id`).

`app/schemas/`
- Pydantic schemas.
- Defines request and response shapes used by the API.

`app/schemas/__init__.py`
- Central schema definitions currently used across route files.

### Service Layer

`app/services/`
- Service modules for reusable non-route logic and external integrations.

`app/services/storage_service.py`
- S3-compatible storage helpers (MinIO / Cloudflare R2 / AWS S3).
- Generates presigned upload URLs / POST policies (with size limits), uploads/downloads objects, and builds public object URLs.

`app/services/presign_service.py`
- Redis helpers for photo upload security.
- Registers `(s3_key -> user_id)` at presign time and consumes it at `POST /photos` to prevent clients from forging `s3_key` ownership.

`app/services/s3_service.py`
- Legacy compatibility shim kept for backward compatibility; new code should use `storage_service.py`.

`app/services/exif_service.py`
- EXIF parsing and photo metadata extraction logic.

`app/services/weather_service.py`
- CWA F-D0047-091 township forecast integration (7-day, up to 14 periods) and sunrise-sunset API calls.

### Task Layer

`app/tasks/`
- Background or deferred task modules.

`app/tasks/exif_tasks.py`
- Background processing for EXIF-related work.

`app/tasks/notification_tasks.py`
- Background processing for notification-related work.

## Database Migration Folder

`alembic/`
- Database migration directory.
- Tracks schema changes over time.

`alembic/env.py`
- Alembic runtime configuration for migrations.

`alembic/script.py.mako`
- Alembic template used when generating new migration files.

`alembic/versions/`
- Versioned migration scripts.
- Each file represents one database schema change.
- `004_add_townships_table.py` — adds `townships` table with PostGIS `MULTIPOLYGON` geometry for reverse geocoding.
- `005_add_global_locations_directory.py` — adds `global_locations`, splits photo location links into private/global FKs, and seeds initial global landmarks.

## Data Folder

`data/`
- Static seed data files bundled with the backend.

`data/taiwan_townships.geojson`
- NLSC 鄉鎮市區界線 GeoJSON (368 features). Used by `scripts/seed_townships.py` to populate the `townships` table.

## Scripts Folder

`scripts/`
- One-off or startup utility scripts.

`scripts/seed_townships.py`
- Seeds the `townships` table from `data/taiwan_townships.geojson`.
- Idempotent: skips if rows already exist. Use `--truncate` to re-seed.
- Run automatically on backend startup via `docker-compose.yml`.

## Test Folder

`tests/`
- Automated test suite for the backend.

`tests/conftest.py`
- Shared pytest fixtures and test setup.

`tests/test_main.py`
- Basic app-level tests, such as health checks.

`tests/test_photos_presign_security.py`
- Security regression tests for `POST /api/v1/photos/presign` filename sanitization.

`tests/test_auth.py`
- Authentication flow tests.

`tests/test_blacklist.py`
- Token blacklist behavior tests.

`tests/test_weather.py`
- Integration tests for `GET /locations/{id}/weather` (success, 403, 404, 401, 422, 502, cache hit, field types).

`tests/test_location_directory.py`
- Integration tests for `GET /global-locations`, `GET /location-directory`, and `GET /global-locations/{id}/weather`.

`tests/test_weather_service.py`
- Unit tests for `weather_service.py` helpers (`_safe_int`, `_extract_element_times`, `_build_periods`, `get_weather_forecast`). All HTTP calls mocked.

`tests/test_photos_presign_post_size.py`
- Regression tests for `POST /api/v1/photos/presign` returning a presigned POST and enforcing a max upload size.

`tests/test_photos.py`
- Photo endpoint tests for presign headers, private/global location validation, and photo record creation behavior.

`tests/test_photos_s3_key_ownership.py`
- Security tests for `POST /api/v1/photos` verifying `s3_key` ownership and one-time use (Redis-backed).

## Images Folder

`images/`
- Documentation assets used by Markdown files.
- Includes auth flow diagrams, endpoint diagrams, ER diagrams, and photo upload flow diagrams.

## Notes

- `backend/.venv/` exists locally but is part of the Python virtual environment, not the application source structure.
- `__pycache__/` folders are Python bytecode caches and are not part of the logical project design.
