"""
test_db.py — Test SQLite database initialization, WAL mode, deduplication, and retention
"""

import pytest
from datetime import datetime, timezone, timedelta
import aiosqlite

import app.database.db as db_module


@pytest.mark.asyncio
async def test_database_wal_mode():
    """Verify SQLite database runs with journal_mode = WAL."""
    async with aiosqlite.connect(db_module.DATABASE_URL) as db:
        async with db.execute("PRAGMA journal_mode;") as cursor:
            row = await cursor.fetchone()
            assert row[0].lower() == "wal"


@pytest.mark.asyncio
async def test_insert_and_fetch_history():
    """Test inserting telemetry records and fetching within time range."""
    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    row = {
        "timestamp": now_iso,
        "device_id": "rumah-jamur-01",
        "temperature": 27.8,
        "humidity": 88.2,
        "soil_average": 62.0,
        "dht_valid": 4,
        "dht_total": 4,
        "soil_valid": 2,
        "soil_total": 2,
        "pump_status": 0,
        "pump_reason": "NO_THRESHOLD_MET",
        "system_state": "NORMAL",
        "cooldown_remaining_s": 0,
    }
    await db_module.insert_telemetry(row)

    history = await db_module.fetch_history(hours=1.0)
    assert len(history) == 1
    assert history[0]["temperature"] == 27.8
    assert history[0]["humidity"] == 88.2


@pytest.mark.asyncio
async def test_deduplication():
    """Test that duplicate (device_id, timestamp) rows are ignored without error."""
    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    row = {
        "timestamp": now_iso,
        "device_id": "rumah-jamur-01",
        "temperature": 29.0,
        "humidity": 80.0,
        "soil_average": 50.0,
        "dht_valid": 4,
        "dht_total": 4,
        "soil_valid": 2,
        "soil_total": 2,
        "pump_status": 1,
        "pump_reason": "HUMIDITY_DEMAND",
        "system_state": "NORMAL",
        "cooldown_remaining_s": 0,
    }

    # Insert twice
    await db_module.insert_telemetry(row)
    await db_module.insert_telemetry(row)

    history = await db_module.fetch_history(hours=1.0)
    assert len(history) == 1


@pytest.mark.asyncio
async def test_retention_purge():
    """Test that rows older than 12 hours are purged on insert."""
    old_time = (datetime.now(timezone.utc) - timedelta(hours=13)).strftime("%Y-%m-%dT%H:%M:%SZ")
    new_time = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    old_row = {
        "timestamp": old_time,
        "device_id": "rumah-jamur-01",
        "temperature": 25.0,
        "humidity": 70.0,
        "soil_average": 50.0,
        "dht_valid": 4,
        "dht_total": 4,
        "soil_valid": 2,
        "soil_total": 2,
        "pump_status": 0,
        "pump_reason": "NONE",
        "system_state": "NORMAL",
        "cooldown_remaining_s": 0,
    }
    # Direct insert old row without trigger
    async with aiosqlite.connect(db_module.DATABASE_URL) as db:
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
            old_row,
        )
        await db.commit()

    # Now insert a new row via insert_telemetry which runs cleanup
    new_row = {
        "timestamp": new_time,
        "device_id": "rumah-jamur-01",
        "temperature": 28.0,
        "humidity": 85.0,
        "soil_average": 60.0,
        "dht_valid": 4,
        "dht_total": 4,
        "soil_valid": 2,
        "soil_total": 2,
        "pump_status": 0,
        "pump_reason": "NO_THRESHOLD_MET",
        "system_state": "NORMAL",
        "cooldown_remaining_s": 0,
    }
    await db_module.insert_telemetry(new_row)

    # Fetch 24 hours back — old row should be gone!
    history = await db_module.fetch_history(hours=24.0)
    assert len(history) == 1
    assert history[0]["timestamp"] == new_time
