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

DEDUPLICATE_TELEMETRY_SQL = """
DELETE FROM telemetry
WHERE id NOT IN (
    SELECT MIN(id)
    FROM telemetry
    GROUP BY device_id, timestamp
);
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
        await db.execute(DEDUPLICATE_TELEMETRY_SQL)
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

        # Cleanup: delete rows older than retention window (12 hours) relative to incoming data
        row_ts = row.get("timestamp")
        if row_ts:
            try:
                clean_ts = row_ts.replace("Z", "+00:00") if not ("+" in row_ts or "-" in row_ts[10:]) else row_ts
                row_dt = datetime.fromisoformat(clean_ts)
                purge_cutoff = (row_dt - timedelta(hours=RETENTION_HOURS)).strftime("%Y-%m-%dT%H:%M:%SZ")
            except Exception:
                purge_cutoff = (datetime.now(timezone(timedelta(hours=7))) - timedelta(hours=RETENTION_HOURS)).strftime("%Y-%m-%dT%H:%M:%SZ")
        else:
            purge_cutoff = (datetime.now(timezone(timedelta(hours=7))) - timedelta(hours=RETENTION_HOURS)).strftime("%Y-%m-%dT%H:%M:%SZ")

        await db.execute(
            "DELETE FROM telemetry WHERE timestamp < ?", (purge_cutoff,)
        )
        await db.commit()


async def fetch_history(hours: float = 12.0) -> list[dict]:
    """Return telemetry rows from the last `hours` hours, oldest first."""
    _ensure_db_dir()
    async with aiosqlite.connect(DATABASE_URL) as db:
        await db.execute("PRAGMA busy_timeout = 5000;")
        db.row_factory = aiosqlite.Row

        # Calculate cutoff relative to latest recorded timestamp in telemetry table
        async with db.execute("SELECT MAX(timestamp) FROM telemetry;") as cur:
            max_row = await cur.fetchone()
            latest_str = max_row[0] if max_row else None

        if latest_str:
            try:
                clean_ts = latest_str.replace("Z", "+00:00") if not ("+" in latest_str or "-" in latest_str[10:]) else latest_str
                latest_dt = datetime.fromisoformat(clean_ts)
                cutoff = (latest_dt - timedelta(hours=hours)).strftime("%Y-%m-%dT%H:%M:%SZ")
            except Exception:
                cutoff = (datetime.now(timezone(timedelta(hours=7))) - timedelta(hours=hours)).strftime("%Y-%m-%dT%H:%M:%SZ")
        else:
            cutoff = (datetime.now(timezone(timedelta(hours=7))) - timedelta(hours=hours)).strftime("%Y-%m-%dT%H:%M:%SZ")

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
