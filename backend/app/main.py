"""
app/main.py — FastAPI application entry point

Startup sequence:
  1. Load .env
  2. Initialize SQLite schema
  3. Register WebSocket broadcast callback into MQTT handler
  4. Start MQTT listener as background asyncio task
  5. Mount router

The MQTT listener runs as a persistent asyncio task — if it disconnects,
it retries automatically without affecting the REST/WS layer.
"""

import asyncio
import logging
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database.db import init_db
from app.mqtt.client import mqtt_listener_task, set_broadcast_callback
from app.api.routes import router, get_broadcast_callback

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ---- Startup ----
    logger.info("Initializing database...")
    await init_db()
    logger.info("Database ready")

    # Wire up WebSocket broadcast into MQTT handler
    set_broadcast_callback(get_broadcast_callback())

    # Start MQTT listener as a background task
    mqtt_task = asyncio.create_task(mqtt_listener_task())
    logger.info("MQTT listener task started")

    yield

    # ---- Shutdown ----
    mqtt_task.cancel()
    try:
        await mqtt_task
    except asyncio.CancelledError:
        pass
    logger.info("Shutdown complete")


app = FastAPI(
    title="Rumah Jamur Dashboard API",
    description="Backend for mushroom house IoT monitoring system",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow frontend dev server and any localhost origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/")
async def root():
    return {
        "service": "Rumah Jamur Dashboard API",
        "docs": "/docs",
        "status": "/api/status",
    }
