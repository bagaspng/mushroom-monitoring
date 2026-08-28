"""
test_api.py — Test public REST API endpoints
"""

import pytest
from datetime import datetime, timezone
from app.services.state import app_state
from app.database.db import insert_telemetry


@pytest.mark.asyncio
async def test_root_endpoint(client):
    """Test GET / returns service info."""
    response = await client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "Rumah Jamur" in data["service"]
    assert data["domain"] == "sirkulalestari.com"


@pytest.mark.asyncio
async def test_status_endpoint(client):
    """Test GET /api/status returns backend health."""
    response = await client.get("/api/status")
    assert response.status_code == 200
    data = response.json()
    assert data["backend"] == "ok"
    assert "stale" in data
    assert "mqtt_connected" in data


@pytest.mark.asyncio
async def test_telemetry_current_endpoint(client):
    """Test GET /api/telemetry/current returns current in-memory telemetry."""
    # Seed state
    mock_payload = {
        "device_id": "rumah-jamur-01",
        "timestamp": "2026-08-28T12:00:00Z",
        "temperature": 28.5,
        "humidity": 86.0,
        "soil_average": 65.0,
        "dht_valid": 4,
        "dht_total": 4,
        "soil_valid": 2,
        "soil_total": 2,
        "pump": False,
        "pump_reason": "NO_THRESHOLD_MET",
        "system_state": "NORMAL",
        "cooldown_remaining_s": 0,
        "mode": "AUTO",
    }
    app_state.update_telemetry(mock_payload)

    response = await client.get("/api/telemetry/current")
    assert response.status_code == 200
    data = response.json()
    assert data["current_telemetry"]["temperature"] == 28.5
    assert data["current_telemetry"]["pump_reason"] == "NO_THRESHOLD_MET"
    assert data["mode"] == "AUTO"
    assert data["stale"] is False


@pytest.mark.asyncio
async def test_config_endpoint(client):
    """Test GET /api/config returns static read-only configurations."""
    response = await client.get("/api/config")
    assert response.status_code == 200
    data = response.json()
    assert data["device_id"] == "rumah-jamur-01"
    assert data["retention_hours"] == 12
    assert "HUMIDITY_DEMAND" in data["pump_reason_values"]
    assert data["auth_required_for_control"] is True
