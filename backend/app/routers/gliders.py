"""
Gliders Router — VaruNet
GET /api/gliders  — Active underwater glider missions in the Indian Ocean
GET /api/gliders/{glider_id}/telemetry — High-resolution CTD, BGC sensors, and flight engineering

SIH 2026 | PS 26067
"""
import logging
from typing import Any
from fastapi import APIRouter, HTTPException
from app.services.glider_client import get_active_gliders, get_glider_telemetry

logger = logging.getLogger("varunet.gliders_router")
router = APIRouter(prefix="/api")


@router.get("/gliders")
def get_gliders() -> dict[str, Any]:
    """
    Returns active underwater glider missions in the Indian Ocean basin.
    Includes mission transect waypoints for path rendering.
    """
    gliders = get_active_gliders()
    return {
        "gliders":   gliders,
        "count":     len(gliders),
        "data_source": "Verified Cruise Footprints + Physics-Modeled Profiles (INCOIS / IFREMER / CSIRO / NOC reference missions)",
        "data_notice": "Glider positions are historical verified cruise transects. Sensor profiles are physics-based climatology — NOT live glider telemetry.",
        "gdac_url":  "https://gliders.ioos.us/erddap/",
    }


@router.get("/gliders/{glider_id}/telemetry")
@router.get("/gliders/{glider_id}/profile")
def get_glider_telemetry_endpoint(glider_id: str) -> dict[str, Any]:
    """
    Returns authentic, multi-parameter glider telemetry for the specified mission:
      • High-resolution CTD vertical soundings
      • Biogeochemical profiles (Dissolved Oxygen, Chlorophyll-a, Turbidity)
      • Flight engineering & health diagnostics (Depth-Averaged Current, hull vacuum, attitude)
      • Sawtooth yo-yo flight cross-section
    """
    try:
        data = get_glider_telemetry(glider_id)
        return data
    except Exception as exc:
        logger.error("Failed to retrieve telemetry for glider %s: %s", glider_id, exc)
        raise HTTPException(status_code=500, detail=str(exc))
