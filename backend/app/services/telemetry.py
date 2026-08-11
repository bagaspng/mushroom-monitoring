"""services/telemetry.py — Telemetry validation and persistence"""

import logging
from datetime import datetime, timezone
from typing import Optional

from app.database.db import insert_telemetry

logger = logging.getLogger(__name__)

# Required fields in every telemetry payload
REQUIRED_FIELDS = {"device_id", "timestamp"}


def validate_telemetry(payload: dict) -> Optional[dict]:
    """
    Validate a parsed telemetry dict.
    Returns the validated dict or None if invalid.
    Backend never adds or modifies values — only validates presence and types.
    """
    for field in REQUIRED_FIELDS:
        if field not in payload:
            logger.warning("Telemetry missing required field: %s | payload=%s", field, payload)
            return None

    # Sanity-check numeric types where present
    for num_field in ("temperature", "humidity", "soil_average"):
        val = payload.get(num_field)
        if val is not None and not isinstance(val, (int, float)):
            logger.warning("Telemetry field %s is not numeric: %r", num_field, val)
            return None

    return payload


async def persist_telemetry(payload: dict) -> None:
    """
    Persist a validated telemetry payload to SQLite.
    Cleanup of old rows is handled inside insert_telemetry().
    """
    row = {
        "timestamp":            payload.get("timestamp"),
        "device_id":            payload.get("device_id"),
        "temperature":          payload.get("temperature"),
        "humidity":             payload.get("humidity"),
        "soil_average":         payload.get("soil_average"),
        "dht_valid":            payload.get("dht_valid"),
        "dht_total":            payload.get("dht_total"),
        "soil_valid":           payload.get("soil_valid"),
        "soil_total":           payload.get("soil_total"),
        "pump_status":          1 if payload.get("pump") else 0,
        "pump_reason":          payload.get("pump_reason"),
        "system_state":         payload.get("system_state"),
        "cooldown_remaining_s": payload.get("cooldown_remaining_s"),
    }
    await insert_telemetry(row)
