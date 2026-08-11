"""
mqtt/client.py — Async MQTT subscriber using aiomqtt

Subscriptions:
  rumahjamur/+/telemetry  → validate, persist, update state, broadcast WS
  rumahjamur/+/status     → update device_online flag

Design rules:
  - Backend is read-only: never publishes commands to ESP32
  - pump_reason and system_state are taken verbatim from payload
  - Malformed payloads are logged and dropped (no crash)
"""

import asyncio
import json
import logging
import os

import aiomqtt

from app.services.state import app_state
from app.services.telemetry import validate_telemetry, persist_telemetry

logger = logging.getLogger(__name__)

BROKER_HOST = os.getenv("MQTT_BROKER_HOST", "localhost")
BROKER_PORT = int(os.getenv("MQTT_BROKER_PORT", "1883"))

# WebSocket broadcast callback (injected by main.py at startup)
_broadcast_callback = None


def set_broadcast_callback(cb) -> None:
    """Register the WebSocket manager's broadcast function."""
    global _broadcast_callback
    _broadcast_callback = cb


async def mqtt_listener_task() -> None:
    """
    Long-running async task that subscribes to MQTT topics.
    On disconnect, aiomqtt raises MqttError — we catch and reconnect.
    """
    reconnect_interval = 5  # seconds between reconnect attempts

    while True:
        try:
            logger.info("Connecting to MQTT broker %s:%d", BROKER_HOST, BROKER_PORT)
            async with aiomqtt.Client(BROKER_HOST, port=BROKER_PORT) as client:
                app_state.mqtt_connected = True
                logger.info("MQTT connected")

                await client.subscribe("rumahjamur/#")
                logger.info("Subscribed to rumahjamur/#")

                async for message in client.messages:
                    topic = str(message.topic)
                    try:
                        _handle_message(topic, message.payload)
                    except Exception as exc:
                        logger.warning("Error handling MQTT message: %s", exc)

        except aiomqtt.MqttError as exc:
            app_state.mqtt_connected = False
            logger.warning("MQTT disconnected: %s — retrying in %ds", exc, reconnect_interval)
            await asyncio.sleep(reconnect_interval)
        except Exception as exc:
            app_state.mqtt_connected = False
            logger.error("Unexpected MQTT error: %s", exc)
            await asyncio.sleep(reconnect_interval)


def _handle_message(topic: str, payload: bytes) -> None:
    """Dispatch incoming MQTT message by topic suffix."""
    parts = topic.split("/")
    # Expected format: rumahjamur/<device_id>/<type>
    if len(parts) < 3:
        return

    topic_type = parts[-1]

    if topic_type == "telemetry":
        _handle_telemetry(payload)
    elif topic_type == "status":
        _handle_status(payload)
    else:
        logger.debug("Unhandled topic: %s", topic)


def _handle_telemetry(payload: bytes) -> None:
    """Parse, validate, persist, and broadcast a telemetry payload."""
    try:
        data = json.loads(payload)
    except json.JSONDecodeError as exc:
        logger.warning("Malformed telemetry JSON: %s | raw=%r", exc, payload[:200])
        return

    validated = validate_telemetry(data)
    if validated is None:
        return  # Validation logged the warning

    app_state.update_telemetry(validated)

    # Persist to SQLite (fire-and-forget via asyncio.create_task)
    asyncio.create_task(persist_telemetry(validated))

    # Broadcast to all WebSocket clients
    if _broadcast_callback is not None:
        asyncio.create_task(_broadcast_callback(app_state.to_dict()))


def _handle_status(payload: bytes) -> None:
    """Handle online/offline status message (LWT)."""
    try:
        data = json.loads(payload)
        online = bool(data.get("online", False))
        if online:
            app_state.mark_device_online()
        else:
            app_state.mark_device_offline()
        logger.info("Device status updated: online=%s", online)
    except json.JSONDecodeError as exc:
        logger.warning("Malformed status JSON: %s | raw=%r", exc, payload[:200])
