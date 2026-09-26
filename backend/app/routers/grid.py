"""
Grid Router — VaruNet v3.1
GET /api/grid         — 2D ocean variable slice (temperature | salinity | density)
GET /api/las/status   — Real-time INCOIS LAS probe
GET /api/las/refresh  — Force-clear LAS cache and re-probe

Data priority: INCOIS LAS THREDDS OPeNDAP → SQLite cache → Physics model fallback
Source transparency: every response labeled with actual data origin.

SIH 2026 | PS 26067
"""
import threading
from fastapi import APIRouter, Query
from typing import Any

from app.services.ocean_physics import generate_ocean_grid
from app.services.incois_client import (
    fetch_grid_slice,
    get_las_status,
    reset_las_cache,
    _las_status_cache,   # read-only access to cached state
)
from app.services.grid_cache import get_cached_grid, store_grid, init_db

router = APIRouter(prefix="/api")
init_db()


# ── Background LAS probe at startup ───────────────────────────────────────────
# Runs once in a daemon thread so the first /api/grid call is never blocked.
def _prewarm():
    try:
        get_las_status()   # this calls _las_is_available internally
    except Exception:
        pass

threading.Thread(target=_prewarm, daemon=True).start()


# ── LAS status endpoints ───────────────────────────────────────────────────────
@router.get("/las/status")
def las_status() -> dict[str, Any]:
    """Real-time INCOIS LAS availability probe. Forces a fresh probe each call."""
    reset_las_cache()
    return get_las_status()


@router.get("/las/refresh")
def las_refresh() -> dict[str, Any]:
    """Force-clear LAS cache and re-probe immediately."""
    reset_las_cache()
    status = get_las_status()
    status["message"] = "Cache cleared. Fresh probe executed."
    return status


# ── Grid endpoint ──────────────────────────────────────────────────────────────
@router.get("/grid")
def get_grid(
    variable: str = Query("temperature", description="temperature | salinity | density"),
    depth: float = Query(0.0, ge=0.0, le=2000.0, description="Depth in metres"),
    timestamp: str = Query("", description="ISO-8601 date for model snapshot (optional)"),
) -> dict[str, Any]:
    """
    Returns a 2D JSON grid slice for the Indian Ocean basin.

    Data priority:
    1. SQLite cache (fresh within TTL) — instant response
    2. INCOIS LAS THREDDS OPeNDAP (real data, if LAS online)
    3. Physics model fallback — always labeled, never silent
    """
    # Read LAS status from cache — never block the grid request for a fresh probe
    las_online = bool(_las_status_cache.get("online", False))

    # If cache is completely cold (first request before prewarm finishes), use False
    # and trigger a background refresh so the next request gets the real value
    import time as _t
    cache_age = _t.time() - _las_status_cache.get("checked_at", 0.0)
    if cache_age > 55:
        threading.Thread(target=get_las_status, daemon=True).start()

    # ── 1. Cache ──────────────────────────────────────────────────────────────
    cached = get_cached_grid(variable, depth, timestamp=timestamp)
    if cached:
        cached["using_cache"] = True
        cached["las_online"] = las_online
        if not las_online:
            cached["is_live"] = False
            cached["source"] = "Indian Ocean Thermodynamic Model (Physics-Based Climatology)"
            cached["cache_notice"] = (
                "SIMULATION: INCOIS LAS unreachable — showing local physics model."
            )
        else:
            cached["is_live"] = bool(cached.get("is_real_data", False))
            if not cached.get("is_real_data", False):
                cached["source"] = "Indian Ocean Thermodynamic Model (Physics-Based Climatology)"
                cached["cache_notice"] = (
                    f"PHYSICS MODEL: LAS online but no observational data for "
                    f"{timestamp or 'this slot'}."
                )
            else:
                if not cached.get("source"):
                    cached["source"] = "INCOIS LAS — Observational Data (Cached)"
                cached["cache_notice"] = (
                    f"Cached INCOIS data for {timestamp or 'current run'} (refreshes hourly)"
                )
        return cached

    # ── 2. Live INCOIS LAS via THREDDS OPeNDAP ────────────────────────────────
    # Only query live OPeNDAP for current / real-time requests (no custom timestamp)
    if las_online and not timestamp:
        real_data = fetch_grid_slice(variable, depth)
        if real_data:
            real_data["using_cache"] = False
            real_data["cache_notice"] = "Live INCOIS LAS data (THREDDS OPeNDAP)"
            real_data["las_online"] = True
            real_data["is_live"] = True
            real_data["is_real_data"] = True
            store_grid(
                variable, depth, real_data,
                timestamp=timestamp,
                source=real_data.get("source", "INCOIS LAS"),
            )
            return real_data

    # ── 3. Physics model fallback ─────────────────────────────────────────────
    grid_out = generate_ocean_grid(variable, depth, timestamp=timestamp)
    grid_out["las_online"] = las_online
    grid_out["is_real_data"] = False
    grid_out["using_cache"] = False
    grid_out["is_live"] = False

    if las_online:
        grid_out["source"] = "Indian Ocean Thermodynamic Model (Physics-Based Climatology)"
        grid_out["cache_notice"] = (
            f"PHYSICS MODEL: LAS online but returned no data for "
            f"{timestamp or 'this slot'}. Showing physics model."
        )
    else:
        grid_out["source"] = "Indian Ocean Thermodynamic Model (Physics-Based Climatology)"
        grid_out["cache_notice"] = (
            "SIMULATION: INCOIS LAS offline — showing local seasonal thermodynamic model."
        )

    store_grid(
        variable, depth, grid_out,
        timestamp=timestamp,
        source="physics_model_fallback",
    )
    return grid_out
