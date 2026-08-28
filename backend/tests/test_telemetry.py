"""
test_telemetry.py — Test telemetry validation and sanity checking
"""

from app.services.telemetry import validate_telemetry


def test_validate_telemetry_valid():
    """Valid payload passes through unchanged."""
    valid_payload = {
        "device_id": "rumah-jamur-01",
        "timestamp": "2026-08-28T12:00:00Z",
        "temperature": 28.5,
        "humidity": 87.1,
        "soil_average": 60.5,
        "dht_valid": 4,
        "dht_total": 4,
        "soil_valid": 2,
        "soil_total": 2,
        "pump": False,
        "pump_reason": "NO_THRESHOLD_MET",
        "system_state": "NORMAL",
        "cooldown_remaining_s": 0,
    }
    result = validate_telemetry(valid_payload)
    assert result is not None
    assert result["device_id"] == "rumah-jamur-01"


def test_validate_telemetry_missing_device_id():
    """Payload missing device_id is rejected."""
    payload = {
        "timestamp": "2026-08-28T12:00:00Z",
        "temperature": 28.5,
    }
    assert validate_telemetry(payload) is None


def test_validate_telemetry_missing_timestamp():
    """Payload missing timestamp is rejected."""
    payload = {
        "device_id": "rumah-jamur-01",
        "temperature": 28.5,
    }
    assert validate_telemetry(payload) is None


def test_validate_telemetry_invalid_numeric_type():
    """Payload with non-numeric temperature is rejected."""
    payload = {
        "device_id": "rumah-jamur-01",
        "timestamp": "2026-08-28T12:00:00Z",
        "temperature": "twenty-eight",
    }
    assert validate_telemetry(payload) is None
