"""
conftest.py — Pytest configuration and shared fixtures for backend tests
"""

import os
import tempfile
import pytest
from pathlib import Path
from unittest.mock import AsyncMock, patch

# Set testing environment variables before importing app modules
os.environ["APP_ENV"] = "development"
os.environ["CONTROL_API_KEY"] = "test-secret-control-key-12345"
os.environ["CORS_ORIGINS"] = "https://sirkulalestari.com,http://localhost:5173"

import aiosqlite
from httpx import AsyncClient, ASGITransport

from app.main import app
import app.database.db as db_module
from app.services.state import app_state


@pytest.fixture(autouse=True)
async def setup_test_db(tmp_path):
    """Setup a fresh temporary SQLite database for each test."""
    test_db_path = str(tmp_path / "test_jamur.db")
    db_module.DATABASE_URL = test_db_path

    # Initialize schema
    await db_module.init_db()

    # Reset in-memory state
    app_state.current_telemetry = None
    app_state.device_online = False
    app_state.last_seen_at = None
    app_state.mqtt_connected = False
    app_state.mode = "AUTO"

    yield test_db_path


@pytest.fixture
async def client():
    """Async HTTP client for FastAPI app testing."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        yield ac
