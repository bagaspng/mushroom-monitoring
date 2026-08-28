"""
app/main.py — FastAPI application entry point

Production Hardening:
  - Whitelisted CORS origins per environment (defaults to sirkulalestari.com in production)
  - Security headers middleware
  - Non-blocking SQLite schema & WAL initialization
  - Asynchronous background MQTT listener with graceful shutdown
  - Single-worker design optimized for 2GB RAM VPS & in-memory state
"""

import asyncio
import logging
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from app.database.db import init_db
from app.mqtt.client import mqtt_listener_task, set_broadcast_callback
from app.api.routes import router, get_broadcast_callback

APP_ENV = os.getenv("APP_ENV", "development").lower()

logging.basicConfig(
    level=logging.INFO if APP_ENV == "production" else logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


# CORS Origin Configuration
def get_cors_origins() -> list[str]:
    raw_origins = os.getenv("CORS_ORIGINS", "")
    if raw_origins.strip():
        return [origin.strip() for origin in raw_origins.split(",") if origin.strip()]

    if APP_ENV == "production":
        # Strict production origins
        return [
            "https://sirkulalestari.com",
            "https://www.sirkulalestari.com",
        ]
    else:
        # Development fallback
        return [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:8000",
            "http://127.0.0.1:8000",
            "http://localhost:3000",
        ]


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ---- Startup ----
    logger.info("Starting Rumah Jamur Monitoring Backend (env=%s)...", APP_ENV)
    logger.info("Initializing database with WAL mode...")
    await init_db()
    logger.info("Database initialized successfully")

    # Wire up WebSocket broadcast into MQTT handler
    set_broadcast_callback(get_broadcast_callback())

    # Start MQTT listener as a background task
    mqtt_task = asyncio.create_task(mqtt_listener_task())
    logger.info("MQTT listener background task started")

    yield

    # ---- Shutdown ----
    logger.info("Initiating graceful shutdown...")
    mqtt_task.cancel()
    try:
        await mqtt_task
    except asyncio.CancelledError:
        pass
    logger.info("Backend shutdown complete")


app = FastAPI(
    title="Rumah Jamur Dashboard API",
    description="Backend for mushroom house IoT monitoring system",
    version="1.0.0",
    docs_url="/docs" if APP_ENV != "production" else None,  # Hide swagger in prod unless configured
    redoc_url="/redoc" if APP_ENV != "production" else None,
    lifespan=lifespan,
)


# Security Headers Middleware
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        return response


app.add_middleware(SecurityHeadersMiddleware)

# CORS Configuration
origins = get_cors_origins()
logger.info("Configured CORS allowed origins: %s", origins)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "X-API-Key", "Authorization"],
)

app.include_router(router)


@app.get("/")
async def root():
    return {
        "service": "Rumah Jamur Dashboard API",
        "domain": "sirkulalestari.com",
        "environment": APP_ENV,
        "status_endpoint": "/api/status",
    }
