"""
services/state.py — In-memory current state

Holds the most recent telemetry snapshot and metadata:
  - current_state  : last received telemetry dict (or None)
  - device_online  : True / False (from LWT + status topic)
  - last_seen_at   : datetime of last telemetry (for stale detection)
  - mqtt_connected : whether aiomqtt client is connected
  - stale          : True if now - last_seen_at > STALE_THRESHOLD_S

Rule: backend never calculates pump_reason or system_state.
      It only stores and forwards what ESP32 sends.
"""

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional

STALE_THRESHOLD_S = 30  # seconds before telemetry is considered stale


@dataclass
class AppState:
    current_telemetry: Optional[dict] = None
    device_online: bool = False
    last_seen_at: Optional[datetime] = None
    mqtt_connected: bool = False

    @property
    def stale(self) -> bool:
        if self.last_seen_at is None:
            return True
        delta = (datetime.now(timezone.utc) - self.last_seen_at).total_seconds()
        return delta > STALE_THRESHOLD_S

    def update_telemetry(self, payload: dict) -> None:
        self.current_telemetry = payload
        self.last_seen_at = datetime.now(timezone.utc)
        self.device_online = True

    def mark_device_offline(self) -> None:
        self.device_online = False

    def mark_device_online(self) -> None:
        self.device_online = True

    def to_dict(self) -> dict:
        return {
            "current_telemetry": self.current_telemetry,
            "device_online": self.device_online,
            "stale": self.stale,
            "last_seen_at": (
                self.last_seen_at.strftime("%Y-%m-%dT%H:%M:%SZ")
                if self.last_seen_at
                else None
            ),
            "mqtt_connected": self.mqtt_connected,
        }


# Singleton shared across the app
app_state = AppState()
