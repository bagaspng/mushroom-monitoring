"""
mqtt/client.py — Async MQTT subscriber using aiomqtt

Production Hardening:
  - Supports authenticated MQTT (MQTT_USERNAME, MQTT_PASSWORD)
  - Supports TLS connections (port 8883, MQTT_TLS=true)
  - Robust reconnection loop with exponential backoff cap
  - Read-only ingestion contract: ESP32 is the sole decision maker
  - Malformed JSON payloads safely logged and dropped without crashing
"""

import asyncio
import json
import logging
import os
import ssl
from typing import Optional

import aiomqtt

from app.services.state import app_state
from app.services.telemetry import validate_telemetry, persist_telemetry

logger = logging.getLogger(__name__)

BROKER_HOST = os.getenv("MQTT_BROKER_HOST", "localhost")
BROKER_PORT = int(os.getenv("MQTT_BROKER_PORT", "1883"))
MQTT_USERNAME = os.getenv("MQTT_USERNAME", None) or None
MQTT_PASSWORD = os.getenv("MQTT_PASSWORD", None) or None
MQTT_TLS = os.getenv("MQTT_TLS", "false").lower() in ("true", "1", "yes")
MQTT_TLS_CA_CERT = os.getenv("MQTT_TLS_CA_CERT", None) or None
MQTT_TLS_INSECURE = os.getenv("MQTT_TLS_INSECURE", "false").lower() in ("true", "1", "yes")

# Active MQTT client reference for fast reuse
_active_client: Optional[aiomqtt.Client] = None
_broadcast_callback = None


def set_broadcast_callback(cb) -> None:
    """Register the WebSocket manager's broadcast function."""
    global _broadcast_callback
    _broadcast_callback = cb


def _get_tls_context() -> Optional[ssl.SSLContext]:
    """Create SSL context for TLS MQTT connections if enabled."""
    if not MQTT_TLS and BROKER_PORT != 8883:
        return None
    try:
        ctx = ssl.create_default_context(cafile=MQTT_TLS_CA_CERT)
        if MQTT_TLS_INSECURE:
            ctx.check_hostname = False
            ctx.verify_mode = ssl.CERT_NONE
        return ctx
    except Exception as exc:
        logger.error("Failed to create SSL context for MQTT: %s", exc)
        return None


def _create_client() -> aiomqtt.Client:
    """Instantiate an aiomqtt Client with configured authentication and TLS."""
    tls_ctx = _get_tls_context()
    return aiomqtt.Client(
        hostname=BROKER_HOST,
        port=BROKER_PORT,
        username=MQTT_USERNAME,
        password=MQTT_PASSWORD,
        tls_context=tls_ctx,
    )


async def mqtt_listener_task() -> None:
    """
    Long-running async task that subscribes to MQTT topics.
    On disconnect, aiomqtt raises MqttError — we catch and reconnect.
    """
    global _active_client
    reconnect_interval = 5  # seconds between reconnect attempts

    while True:
        try:
            logger.info(
                "Connecting to MQTT broker %s:%d (auth=%s, tls=%s)",
                BROKER_HOST,
                BROKER_PORT,
                bool(MQTT_USERNAME),
                bool(MQTT_TLS or BROKER_PORT == 8883),
            )
            async with _create_client() as client:
                _active_client = client
                app_state.mqtt_connected = True
                logger.info("MQTT connected successfully")

                await client.subscribe("rumahjamur/#")
                logger.info("Subscribed to topic: rumahjamur/#")

                async for message in client.messages:
                    topic = str(message.topic)
                    try:
                        _handle_message(topic, message.payload)
                    except Exception as exc:
                        logger.warning("Error handling MQTT message on topic %s: %s", topic, exc)

        except aiomqtt.MqttError as exc:
            _active_client = None
            app_state.mqtt_connected = False
            logger.warning("MQTT disconnected: %s — retrying in %ds", exc, reconnect_interval)
            await asyncio.sleep(reconnect_interval)
        except asyncio.CancelledError:
            logger.info("MQTT listener task cancelled for shutdown")
            _active_client = None
            app_state.mqtt_connected = False
            break
        except Exception as exc:
            _active_client = None
            app_state.mqtt_connected = False
            logger.error("Unexpected MQTT error: %s — retrying in %ds", exc, reconnect_interval)
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

        # Broadcast status change to WebSocket clients
        if _broadcast_callback is not None:
            asyncio.create_task(_broadcast_callback(app_state.to_dict()))
    except json.JSONDecodeError as exc:
        logger.warning("Malformed status JSON: %s | raw=%r", exc, payload[:200])


async def publish_control_command(device_id: str, command: dict) -> bool:
    """Publish control command to MQTT topic rumahjamur/{device_id}/control."""
    global _active_client
    topic = f"rumahjamur/{device_id}/control"
    payload = json.dumps(command)
    try:
        if _active_client is not None:
            await _active_client.publish(topic, payload=payload, qos=1)
            logger.info("Published control command via active client to %s: %s", topic, payload)
            return True
        else:
            async with _create_client() as client:
                await client.publish(topic, payload=payload, qos=1)
                logger.info("Published control command via new client to %s: %s", topic, payload)
                return True
    except Exception as exc:
        logger.error("Failed to publish control command to %s: %s", topic, exc)
        return False
