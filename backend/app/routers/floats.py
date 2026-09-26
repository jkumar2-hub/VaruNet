"""
Floats Router — VaruNet
GET /api/floats                   — Active Argo float surface positions (non-blocking)
GET /api/floats/{float_id}/profile — Full CTD vertical profile with model-vs-observed

Non-blocking: ERDDAP fetch happens in a background thread.
The endpoint always responds instantly with whatever is cached.

SIH 2026 | PS 26067
"""
import logging
from typing import Any

from fastapi import APIRouter, HTTPException

from app.services.argo_client import get_active_floats, get_float_profile, trigger_background_fetch

logger = logging.getLogger("varunet.floats_router")
router = APIRouter(prefix="/api")

# Pre-warm the ERDDAP fetch on module load so data arrives faster
trigger_background_fetch()


@router.get("/floats")
def get_floats(
    region: str = "indian_ocean",
    timestamp: str = "",
) -> dict[str, Any]:
    """
    Returns active Argo float surface positions in the Indian Ocean.
    Always responds instantly (non-blocking).
    ERDDAP data is fetched in background; returns empty list with notice until ready.
    """
    floats, source, cache_hit = get_active_floats()

    notice = None
    if not floats:
        notice = (
            "Argo float data loading from IFREMER ERDDAP in the background. "
            "Refresh in ~15 seconds for live float markers."
        )

    return {
        "floats":       floats,
        "count":        len(floats),
        "cache_hit":    cache_hit,
        "cache_notice": notice,
        "data_source":  source,
        "gdac_url":     "https://erddap.ifremer.fr/erddap/tabledap/ArgoFloats.html",
    }


@router.get("/floats/{float_id}/profile")
def get_profile(float_id: str) -> dict[str, Any]:
    """
    Returns the full 0–2000m CTD vertical profile for an Argo float.
    Includes both real observations and model predictions for comparison.
    float_id: 'ARGO-{WMO}' or just the numeric WMO ID
    """
    wmo = float_id.replace("ARGO-", "").strip()
    if not wmo:
        raise HTTPException(status_code=400, detail="Invalid float_id")
    return get_float_profile(wmo)
