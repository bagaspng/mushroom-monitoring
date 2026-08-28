"""
test_websocket.py — Test WebSocket connection lifecycle and broadcasting
"""

import pytest
from starlette.testclient import TestClient
from app.main import app
from app.services.state import app_state


def test_websocket_connection_and_initial_snapshot():
    """Test connecting to /ws receives the initial JSON telemetry snapshot."""
    # Seed state
    mock_payload = {
        "device_id": "rumah-jamur-01",
        "timestamp": "2026-08-28T12:00:00Z",
        "temperature": 27.5,
        "humidity": 85.0,
        "soil_average": 60.0,
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

    client = TestClient(app)
    with client.websocket_connect("/ws") as websocket:
        data = websocket.receive_json()
        assert "current_telemetry" in data
        assert data["current_telemetry"]["temperature"] == 27.5
        assert data["device_online"] is True
