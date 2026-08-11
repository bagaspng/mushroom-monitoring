"""
database/db.py — SQLite initialization and query helpers

Schema:
  telemetry  — time-series data from ESP32, retained for 12 hours

Cleanup runs automatically on every successful insert so the database
never grows beyond ~12 hours of telemetry at 10-second intervals
(≈ 4 320 rows maximum).
"""

import aiosqlite
from pathlib import Path
from datetime import datetime, timezone, timedelta
import os

DATABASE_URL = os.getenv("DATABASE_URL", "./jamur_dashboard.db")

CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS telemetry (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp             TEXT    NOT NULL,
    device_id             TEXT    NOT NULL,
    temperature           REAL,
    humidity              REAL,
    soil_average          REAL,
    dht_valid             INTEGER,
    dht_total             INTEGER,
    soil_valid            INTEGER,
    soil_total            INTEGER,
    pump_status           INTEGER,
    pump_reason           TEXT,
    system_state          TEXT,
    cooldown_remaining_s  INTEGER
);
"""

CREATE_INDEX_SQL = """
CREATE INDEX IF NOT EXISTS idx_telemetry_timestamp
ON telemetry (timestamp);
"""

RETENTION_HOURS = 12


async def init_db() -> None:
    """Create tables and indexes on startup."""
    async with aiosqlite.connect(DATABASE_URL) as db:
        await db.execute(CREATE_TABLE_SQL)
        await db.execute(CREATE_INDEX_SQL)
        await db.commit()


async def insert_telemetry(row: dict) -> None:
    """Insert one telemetry row and clean up rows older than RETENTION_HOURS."""
    async with aiosqlite.connect(DATABASE_URL) as db:
        await db.execute(
            """
            INSERT INTO telemetry
              (timestamp, device_id, temperature, humidity, soil_average,
               dht_valid, dht_total, soil_valid, soil_total,
               pump_status, pump_reason, system_state, cooldown_remaining_s)
            VALUES
              (:timestamp, :device_id, :temperature, :humidity, :soil_average,
               :dht_valid, :dht_total, :soil_valid, :soil_total,
               :pump_status, :pump_reason, :system_state, :cooldown_remaining_s)
            """,
            row,
        )

        # Cleanup: delete rows older than retention window
        cutoff = (
            datetime.now(timezone.utc) - timedelta(hours=RETENTION_HOURS)
        ).strftime("%Y-%m-%dT%H:%M:%SZ")

        await db.execute(
            "DELETE FROM telemetry WHERE timestamp < ?", (cutoff,)
        )
        await db.commit()


async def fetch_history(hours: float = 12.0) -> list[dict]:
    """Return telemetry rows from the last `hours` hours, oldest first."""
    cutoff = (
        datetime.now(timezone.utc) - timedelta(hours=hours)
    ).strftime("%Y-%m-%dT%H:%M:%SZ")

    async with aiosqlite.connect(DATABASE_URL) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            """
            SELECT * FROM telemetry
            WHERE timestamp >= ?
            ORDER BY timestamp ASC
            """,
            (cutoff,),
        ) as cursor:
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]
