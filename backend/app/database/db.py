"""
database/db.py — SQLite initialization and query helpers

Production Hardening:
  - WAL mode (Write-Ahead Logging) enabled for concurrency & low I/O
  - PRAGMA synchronous = NORMAL for optimal performance with WAL
  - Busy timeout = 5000ms to prevent lock errors
  - Compound index and INSERT OR IGNORE to prevent duplicate telemetry rows
  - Rolling 12-hour retention window
"""

import aiosqlite
from pathlib import Path
from datetime import datetime, timezone, timedelta
import os
import logging

logger = logging.getLogger(__name__)

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

CREATE_UNIQUE_INDEX_SQL = """
CREATE UNIQUE INDEX IF NOT EXISTS idx_telemetry_device_timestamp
ON telemetry (device_id, timestamp);
"""

RETENTION_HOURS = 12


def _ensure_db_dir() -> None:
    """Ensure the directory for the database file exists."""
    db_path = Path(DATABASE_URL)
    if db_path.parent and not db_path.parent.exists():
        db_path.parent.mkdir(parents=True, exist_ok=True)


async def init_db() -> None:
    """Initialize database tables, indexes, and performance PRAGMAs."""
    _ensure_db_dir()
    async with aiosqlite.connect(DATABASE_URL) as db:
        # Enable WAL mode and performance optimizations
        await db.execute("PRAGMA journal_mode = WAL;")
        await db.execute("PRAGMA synchronous = NORMAL;")
        await db.execute("PRAGMA busy_timeout = 5000;")

        await db.execute(CREATE_TABLE_SQL)
        await db.execute(CREATE_INDEX_SQL)
        await db.execute(CREATE_UNIQUE_INDEX_SQL)
        await db.commit()
    logger.info("SQLite database initialized at %s with WAL mode enabled", DATABASE_URL)


async def insert_telemetry(row: dict) -> None:
    """Insert one telemetry row (ignoring duplicates) and clean up old rows."""
    _ensure_db_dir()
    async with aiosqlite.connect(DATABASE_URL) as db:
        await db.execute("PRAGMA busy_timeout = 5000;")
        await db.execute(
            """
            INSERT OR IGNORE INTO telemetry
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

        # Cleanup: delete rows older than retention window (12 hours)
        cutoff = (
            datetime.now(timezone.utc) - timedelta(hours=RETENTION_HOURS)
        ).strftime("%Y-%m-%dT%H:%M:%SZ")

        await db.execute(
            "DELETE FROM telemetry WHERE timestamp < ?", (cutoff,)
        )
        await db.commit()


async def fetch_history(hours: float = 12.0) -> list[dict]:
    """Return telemetry rows from the last `hours` hours, oldest first."""
    _ensure_db_dir()
    cutoff = (
        datetime.now(timezone.utc) - timedelta(hours=hours)
    ).strftime("%Y-%m-%dT%H:%M:%SZ")

    async with aiosqlite.connect(DATABASE_URL) as db:
        await db.execute("PRAGMA busy_timeout = 5000;")
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
