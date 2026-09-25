"""
Data Ingestion Router — VaruNet
Handles NetCDF and delimited text file uploads.
POST /api/ingest/netcdf — parse uploaded NetCDF
POST /api/ingest/text   — parse uploaded CSV/TSV
"""
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from app.services.netcdf_parser import parse_netcdf, parse_text

router = APIRouter(prefix="/api/ingest", tags=["ingest"])


@router.post("/netcdf")
async def ingest_netcdf(file: UploadFile = File(...)):
    """Upload and parse a NetCDF file. Returns detected variables and grid data."""
    if not file.filename.endswith(('.nc', '.nc4', '.cdf', '.netcdf')):
        raise HTTPException(400, "File must be a NetCDF file (.nc, .nc4, .cdf)")
    content = await file.read()
    if len(content) > 100 * 1024 * 1024:  # 100MB limit
        raise HTTPException(413, "File too large (max 100MB)")
    try:
        result = parse_netcdf(content)
        result['filename'] = file.filename
        result['size_bytes'] = len(content)
        return JSONResponse(result)
    except Exception as exc:
        raise HTTPException(422, f"NetCDF parse error: {exc}")


@router.post("/text")
async def ingest_text(file: UploadFile = File(...)):
    """Upload and parse a CSV/TSV/delimited text file. Returns observation list."""
    content = await file.read()
    try:
        observations = parse_text(content, file.filename or "upload.csv")
        return JSONResponse({
            "filename": file.filename,
            "count": len(observations),
            "observations": observations,
            "source": "User-uploaded delimited text",
        })
    except Exception as exc:
        raise HTTPException(422, f"Text parse error: {exc}")


@router.get("/formats")
async def list_formats():
    """List supported ingest formats."""
    return {
        "supported_formats": [
            {"format": "NetCDF", "extensions": [".nc", ".nc4", ".cdf"], "endpoint": "/api/ingest/netcdf"},
            {"format": "CSV", "extensions": [".csv", ".txt", ".tsv"], "endpoint": "/api/ingest/text"},
        ],
        "max_size_mb": 100,
        "cf_conventions": "Auto-detected from CF standard_name attributes",
    }
