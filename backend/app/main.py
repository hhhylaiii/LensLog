from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import admin, auth, gear, location_directory, locations, photos, stats, users
from app.core.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    yield
    # Shutdown


def create_app() -> FastAPI:
    app = FastAPI(
        title="LensLog API",
        description="攝影走讀與器材管理社群平台 API",
        version="0.1.0",
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    # CORS
    origins = [settings.FRONTEND_URL]
    if settings.CORS_ORIGINS:
        origins.extend([o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()])
    if settings.DEBUG:
        for dev_origin in ["http://localhost:5173", "http://localhost:3000"]:
            if dev_origin not in origins:
                origins.append(dev_origin)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # 注冊路由
    prefix = "/api/v1"
    app.include_router(auth.router, prefix=prefix)
    app.include_router(photos.router, prefix=prefix)
    app.include_router(locations.router, prefix=prefix)
    app.include_router(location_directory.router, prefix=prefix)
    app.include_router(gear.router, prefix=prefix)
    app.include_router(stats.router, prefix=prefix)
    app.include_router(admin.router, prefix=prefix)
    app.include_router(users.router, prefix=prefix)

    @app.get("/health")
    async def health_check():
        return {"status": "ok", "app": settings.APP_NAME}

    return app


app = create_app()
