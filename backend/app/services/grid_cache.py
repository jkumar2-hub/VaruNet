"""
Grid Cache — VaruNet
SQLite-backed cache for ocean model grid slices.
Avoids re-parsing NetCDF or re-computing physics on every request.

SIH 2026 | PS 26067
"""
import json
import logging
import os
import sqlite3
import time
from typing import Any

logger = logging.getLogger("varunet.grid_cache")

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DB_PATH = os.path.join(BASE_DIR, "varunet.db")


def _get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    """Create tables if they don't exist."""
    with _get_conn() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS ModelGridCache (
                id TEXT PRIMARY KEY,
                region_id TEXT NOT NULL,
                variable TEXT NOT NULL,
                depth REAL NOT NULL,
                timestamp TEXT NOT NULL,
                grid_data TEXT NOT NULL,
                source TEXT NOT NULL DEFAULT 'physics_model',
                created_at REAL NOT NULL
            )
        """)
        conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_grid_lookup
            ON ModelGridCache (region_id, variable, depth, timestamp)
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS FloatObservations (
                id TEXT PRIMARY KEY,
                float_id TEXT NOT NULL,
                lat REAL,
                lon REAL,
                depth REAL,
                timestamp TEXT,
                temp REAL,
                salinity REAL,
                created_at REAL NOT NULL
            )
        """)
        conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_float_id ON FloatObservations (float_id)
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS DriftRuns (
                id TEXT PRIMARY KEY,
                start_lat REAL NOT NULL,
                start_lon REAL NOT NULL,
                start_time TEXT NOT NULL,
                path_points TEXT NOT NULL,
                current_grid_ref TEXT,
                created_at REAL NOT NULL
            )
        """)
        conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_drift_time ON DriftRuns (start_time)
        """)
        conn.commit()


def get_cached_grid(
    variable: str, depth: float, timestamp: str = "", region_id: str = "indian_ocean", ttl: int = 3600
) -> dict[str, Any] | None:
    """Return cached grid data if it exists and is fresher than TTL."""
    try:
        with _get_conn() as conn:
            if timestamp:
                row = conn.execute(
                    """
                    SELECT grid_data, source, created_at FROM ModelGridCache
                    WHERE region_id=? AND variable=? AND ABS(depth-?)<=1 AND timestamp LIKE ?
                    ORDER BY created_at DESC LIMIT 1
                    """,
                    (region_id, variable, depth, f"{timestamp}%"),
                ).fetchone()
            else:
                row = conn.execute(
                    """
                    SELECT grid_data, source, created_at FROM ModelGridCache
                    WHERE region_id=? AND variable=? AND ABS(depth-?)<=1
                    ORDER BY created_at DESC LIMIT 1
                    """,
                    (region_id, variable, depth),
                ).fetchone()
            if row and (time.time() - row["created_at"]) < ttl:
                data = json.loads(row["grid_data"])
                data["cache_hit"] = True
                data["cached_source"] = row["source"]
                if not data.get("source"):
                    data["source"] = row["source"] or "INCOIS Numerical Model"
                return data
    except Exception as exc:
        logger.warning("Cache read failed: %s", exc)
    return None


def store_grid(
    variable: str,
    depth: float,
    grid_data: dict[str, Any],
    timestamp: str = "",
    source: str = "physics_model",
    region_id: str = "indian_ocean",
) -> None:
    """Persist a grid slice to the cache."""
    import uuid
    cache_id = str(uuid.uuid4())
    ts = timestamp if timestamp else time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    try:
        with _get_conn() as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO ModelGridCache
                (id, region_id, variable, depth, timestamp, grid_data, source, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (cache_id, region_id, variable, depth, ts, json.dumps(grid_data), source, time.time()),
            )
            conn.commit()
    except Exception as exc:
        logger.warning("Cache write failed: %s", exc)


def store_drift_run(
    start_lat: float,
    start_lon: float,
    start_time: str,
    path_points: list[dict[str, Any]],
    grid_ref: str | None = None,
) -> str:
    """Store a completed drift simulation for traceability."""
    import uuid
    run_id = str(uuid.uuid4())
    try:
        with _get_conn() as conn:
            conn.execute(
                """
                INSERT INTO DriftRuns
                (id, start_lat, start_lon, start_time, path_points, current_grid_ref, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (run_id, start_lat, start_lon, start_time, json.dumps(path_points), grid_ref, time.time()),
            )
            conn.commit()
    except Exception as exc:
        logger.warning("Drift run store failed: %s", exc)
    return run_id
