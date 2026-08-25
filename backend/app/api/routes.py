"""
api/routes.py — REST API and WebSocket endpoints

Endpoints:
  GET  /api/status             → backend + MQTT + device health
  GET  /api/telemetry/current  → current in-memory state
  GET  /api/history            → SQLite history (default 12h)
  GET  /api/config             → static configuration info
  WS   /ws                     → real-time telemetry push
"""

import json
import logging
from typing import Optional

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from pydantic import BaseModel

from app.services.state import app_state, STALE_THRESHOLD_S
from app.database.db import fetch_history, RETENTION_HOURS
from app.mqtt.client import publish_control_command

logger = logging.getLogger(__name__)
router = APIRouter()


class ControlRequest(BaseModel):
    mode: Optional[str] = None
    pump: Optional[bool] = None


# -----------------------------------------------------------------------
# WebSocket connection manager
# -----------------------------------------------------------------------
class ConnectionManager:
    def __init__(self):
        self._clients: list[WebSocket] = []

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        self._clients.append(ws)
        logger.info("WS client connected (total=%d)", len(self._clients))

    def disconnect(self, ws: WebSocket) -> None:
        self._clients.remove(ws)
        logger.info("WS client disconnected (total=%d)", len(self._clients))

    async def broadcast(self, data: dict) -> None:
        """Send data to all connected WebSocket clients."""
        message = json.dumps(data)
        dead: list[WebSocket] = []
        for client in self._clients:
            try:
                await client.send_text(message)
            except Exception:
                dead.append(client)
        for d in dead:
            if d in self._clients:
                self._clients.remove(d)


ws_manager = ConnectionManager()


def get_broadcast_callback():
    """Return the broadcast coroutine for injection into MQTT handler."""
    return ws_manager.broadcast


# -----------------------------------------------------------------------
# REST endpoints
# -----------------------------------------------------------------------

@router.get("/api/status")
async def get_status():
    """Backend health, MQTT connection, device online/offline, stale flag."""
    return {
        "backend": "ok",
        "mqtt_connected": app_state.mqtt_connected,
        "device_online": app_state.device_online,
        "stale": app_state.stale,
        "last_seen_at": (
            app_state.last_seen_at.strftime("%Y-%m-%dT%H:%M:%SZ")
            if app_state.last_seen_at else None
        ),
    }


@router.get("/api/telemetry/current")
async def get_current_telemetry():
    """Return the most recent telemetry snapshot from memory."""
    return {
        **app_state.to_dict(),
    }


@router.get("/api/history")
async def get_history(hours: float = Query(default=12.0, ge=0.1, le=24.0)):
    """Return historical telemetry from SQLite for the last `hours` hours."""
    rows = await fetch_history(hours)
    return {"count": len(rows), "hours": hours, "data": rows}


@router.get("/api/config")
async def get_config():
    """Return static backend configuration values (read-only)."""
    return {
        "stale_threshold_s": STALE_THRESHOLD_S,
        "retention_hours": RETENTION_HOURS,
        "publish_interval_s": 10,
        "device_id": "rumah-jamur-01",
        "mqtt_topics": {
            "telemetry": "rumahjamur/rumah-jamur-01/telemetry",
            "status":    "rumahjamur/rumah-jamur-01/status",
            "control":   "rumahjamur/rumah-jamur-01/control",
        },
        "pump_reason_values": [
            "NONE",
            "NO_VALID_DHT",
            "RH_MAX_THRESHOLD",
            "HUMIDITY_DEMAND",
            "TEMP_HIGH_THRESHOLD",
            "NO_THRESHOLD_MET",
            "COOLDOWN",
            "MANUAL_ON",
            "MANUAL_OFF",
        ],
        "system_state_values": ["NORMAL", "DEGRADED", "ERROR"],
        "control_modes": ["AUTO", "MANUAL"],
    }


@router.post("/api/control")
async def send_control(req: ControlRequest):
    """Publish a control command to ESP32 via MQTT and update local state."""
    command = {}
    if req.mode is not None:
        mode_val = req.mode.upper()
        if mode_val in ("AUTO", "MANUAL"):
            command["mode"] = mode_val
            app_state.mode = mode_val
            if app_state.current_telemetry:
                app_state.current_telemetry["mode"] = mode_val

    if req.pump is not None:
        command["pump"] = bool(req.pump)
        if app_state.current_telemetry:
            app_state.current_telemetry["pump"] = bool(req.pump)
            app_state.current_telemetry["pump_reason"] = "MANUAL_ON" if req.pump else "MANUAL_OFF"

    device_id = "rumah-jamur-01"
    ok = await publish_control_command(device_id, command)

    # Broadcast updated state immediately to all WS clients
    await ws_manager.broadcast(app_state.to_dict())

    return {
        "status": "ok" if ok else "mqtt_publish_failed",
        "command": command,
        "mode": app_state.mode,
    }


# -----------------------------------------------------------------------
# WebSocket endpoint
# -----------------------------------------------------------------------

@router.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    """
    Real-time telemetry WebSocket.
    Sends current state immediately on connect, then broadcasts on every
    new telemetry message received via MQTT.
    """
    await ws_manager.connect(ws)
    try:
        # Send current state immediately so client doesn't have to wait
        await ws.send_text(json.dumps(app_state.to_dict()))

        # Keep connection alive; MQTT handler does the pushing
        while True:
            # Just wait for client disconnect or ping
            await ws.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(ws)
