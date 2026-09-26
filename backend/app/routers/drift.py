"""
Drift Router — VaruNet
POST /api/drift  — Simulates a Lagrangian drift trajectory from a given point.

Uses RK4 numerical integration with Indian Ocean current vectors.
Stores every run in DriftRuns table for traceability (linked to grid snapshot used).

SIH 2026 | PS 26067
"""
import logging
from typing import Any, Optional

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.services.lagrangian_drift import run_rk4_drift
from app.services.grid_cache import store_drift_run

logger = logging.getLogger("varunet.drift_router")
router = APIRouter(prefix="/api")


class DriftRequest(BaseModel):
    start_lat: float = Field(..., ge=-90.0, le=90.0, description="Starting latitude °N")
    start_lon: float = Field(..., ge=-180.0, le=180.0, description="Starting longitude °E")
    start_time: str = Field(default="", description="ISO-8601 simulation start time")
    duration_hours: Optional[int] = Field(default=24, ge=1, le=72, description="Forecast horizon in hours")
    object_type: Optional[str] = Field(
        default="life_raft",
        description="SAR leeway target: life_raft | fishing_vessel | cargo_container | person_in_water",
    )


@router.post("/drift")
def calculate_drift(req: DriftRequest) -> dict[str, Any]:
    """
    Computes an RK4 Lagrangian drift trajectory from a clicked ocean point.
    Returns path waypoints, total drift distance, and the expanding SAR search cone radius.
    Every run is stored for traceability.

    Object types and leeway fractions:
    - life_raft: 3.5%  (IAMSAR Vol. III leeway model)
    - fishing_vessel: 2.5%
    - cargo_container: 1.5%
    - person_in_water: 1.0%
    """
    result = run_rk4_drift(
        start_lat=req.start_lat,
        start_lon=req.start_lon,
        start_time_iso=req.start_time or "",
        duration_hours=req.duration_hours or 24,
        object_type=req.object_type or "life_raft",
    )

    # Persist for audit / traceability
    run_id = store_drift_run(
        start_lat=req.start_lat,
        start_lon=req.start_lon,
        start_time=req.start_time or "",
        path_points=result.get("path", []),
    )
    result["run_id"] = run_id
    result["physics"] = "RK4 Lagrangian + IAMSAR leeway model"
    result["disclaimer"] = (
        "Simulated drift path — uses parametric current field. "
        "Not a certified SAR forecast. Consult INCOIS for operational use."
    )
    return result


@router.get("/health")
def health() -> dict[str, Any]:
    """System health and data source catalog."""
    return {
        "status": "online",
        "system": "VaruNet — INCOIS Ocean Data Visualizer",
        "version": "3.0.0",
        "ps": "SIH 2026 | PS 26067 | Ministry of Earth Sciences / INCOIS",
        "basin": "Indian Ocean (40°E – 110°E, 30°S – 26°N)",
        "physics": "RK4 Lagrangian + UNESCO seawater thermodynamics + IAMSAR leeway",
        "data_sources": {
            "incois_las": {
                "name": "INCOIS Live Access Server (LAS)",
                "url": "https://las.incois.gov.in/",
                "type": "Numerical ocean model output (NetCDF/OPeNDAP)",
            },
            "copernicus_cmems": {
                "name": "Copernicus Marine Service — GLOBAL_MULTIYEAR_PHY_001_030",
                "url": "https://data.marine.copernicus.eu/product/GLOBAL_MULTIYEAR_PHY_001_030/description",
                "type": "Global multiyear reanalysis (temperature, salinity, currents)",
            },
            "argo_gdac": {
                "name": "Argo Global Data Assembly Centre (IFREMER)",
                "url": "ftp://ftp.ifremer.fr/ifremer/argo",
                "erddap": "https://erddap.ifremer.fr/erddap/tabledap/ArgoFloats.html",
                "type": "Real in-situ CTD float observations",
            },
            "glider_gdac": {
                "name": "IFREMER Glider Data Repository v2",
                "url": "ftp://ftp.ifremer.fr/ifremer/glider/v2/",
                "type": "Autonomous underwater glider missions",
            },
        },
    }


@router.get("/sources")
def get_sources() -> dict[str, Any]:
    """
    Authoritative dataset catalog and provenance links required by SIH PS 26067:
    - Numerical Model Outputs: INCOIS LAS & Copernicus Marine Service
    - Argo Global Data: IFREMER GDAC FTP
    - Glider Data: IFREMER Glider Repository v2
    """
    return {
        "status": "verified",
        "numerical_models": [
            {
                "id": "incois_las",
                "name": "INCOIS Live Access Server (LAS)",
                "url": "https://las.incois.gov.in/",
                "institution": "Indian National Centre for Ocean Information Services (INCOIS), MoES",
                "product": "Ocean Model Analysis & Forecasting NetCDF Fields",
                "protocol": "HTTP / LAS / OPeNDAP",
                "description": "Operational numerical model outputs for the Indian Ocean basin with CF-compliant NetCDF slices.",
                "variables": ["Sea Surface Temperature", "Practical Salinity", "Surface Current Vectors (U, V)"],
            },
            {
                "id": "copernicus_cmems",
                "name": "Copernicus Marine Service (CMEMS)",
                "url": "https://data.marine.copernicus.eu/product/GLOBAL_MULTIYEAR_PHY_001_030/description",
                "institution": "Mercator Ocean International / European Commission",
                "product": "GLOBAL_MULTIYEAR_PHY_001_030",
                "protocol": "Copernicus Marine Toolbox / WMS / NetCDF Subsetter",
                "description": "Global Ocean Physics Reanalysis Multi-Year physical ocean state product.",
                "variables": ["3D Ocean Potential Temperature (thetao)", "Salinity (so)", "Horizontal Velocity (uo, vo)"],
            },
        ],
        "argo_global_data": {
            "id": "ifremer_argo_gdac",
            "name": "Argo Global Data Assembly Centre (GDAC)",
            "url": "ftp://ftp.ifremer.fr/ifremer/argo",
            "institution": "IFREMER / Coriolis Data Centre",
            "product": "Argo in situ profiling float CTD soundings and trajectory data",
            "protocol": "FTP / GDAC NetCDF-4",
            "description": "Global in situ observation array measuring real ocean profiles to 2000m depth.",
            "variables": ["Hydrostatic Pressure", "In Situ Temperature", "Practical Salinity", "Real-Time QC Flags"],
        },
        "glider_data": {
            "id": "ifremer_glider_gdac",
            "name": "OceanGliders Global Data Repository (v2)",
            "url": "ftp://ftp.ifremer.fr/ifremer/glider/v2/",
            "institution": "OceanGliders / IFREMER",
            "product": "Autonomous Underwater Glider mission trajectories and high-resolution transects",
            "protocol": "FTP / NetCDF v2",
            "description": "Subsurface autonomous glider deployments sampling coastal and boundary current structures.",
            "variables": ["High-frequency CTD transects", "Dive profile trajectories", "Pycnocline structure"],
        },
    }

