"""
OGC Router — VaruNet Tactical Ocean Digital Twin
WMS 1.3.0 & WCS 1.1.2 Endpoints (Case-Insensitive Query Param Support)

SIH 2026 | PS 26067
"""
from fastapi import APIRouter, Request, Response
from fastapi.responses import JSONResponse
from app.services.ogc_service import (
    wms_capabilities_xml,
    wms_get_map_png,
    wcs_capabilities_xml,
    wcs_get_coverage,
)

router = APIRouter(tags=["ogc"])


@router.get("/wms")
async def wms(request: Request):
    """
    OGC Web Map Service (WMS) endpoint.
    Supports GetCapabilities (XML) and GetMap (PNG dynamic tile rendering).
    Case-insensitive parameter parsing conforming to OGC WMS 1.3.0.
    """
    # Normalize query params to lowercase for robust GIS client compatibility
    params = {k.lower(): v for k, v in request.query_params.items()}

    service = params.get("service", "WMS").upper()
    req = params.get("request", "GetCapabilities").strip()
    layer = params.get("layers", params.get("layer", "SST"))
    bbox = params.get("bbox", "30,-30,120,30")
    width = int(params.get("width", 512))
    height = int(params.get("height", 512))
    style = params.get("styles", params.get("style", "thermal"))

    if req.lower() == "getcapabilities":
        xml = wms_capabilities_xml()
        return Response(content=xml, media_type="application/xml")
    elif req.lower() == "getmap":
        png = wms_get_map_png(layer=layer, bbox=bbox, width=width, height=height, styles=style)
        return Response(content=png, media_type="image/png")

    return Response(
        content=f'<?xml version="1.0" encoding="UTF-8"?><ServiceExceptionReport version="1.3.0"><ServiceException code="OperationNotSupported">Unknown REQUEST parameter: {req}</ServiceException></ServiceExceptionReport>',
        media_type="application/xml",
        status_code=400,
    )


@router.get("/wcs")
async def wcs(request: Request):
    """
    OGC Web Coverage Service (WCS) endpoint.
    Supports GetCapabilities (XML) and GetCoverage (CF-compliant JSON/NetCDF structure).
    """
    params = {k.lower(): v for k, v in request.query_params.items()}

    service = params.get("service", "WCS").upper()
    req = params.get("request", "GetCapabilities").strip()
    identifier = params.get("identifier", params.get("coverage", "SST"))

    if req.lower() == "getcapabilities":
        xml = wcs_capabilities_xml()
        return Response(content=xml, media_type="application/xml")
    elif req.lower() == "getcoverage":
        data = wcs_get_coverage(identifier)
        return JSONResponse(data)

    return Response(
        content=f'<?xml version="1.0" encoding="UTF-8"?><ows:ExceptionReport version="1.1.0" xmlns:ows="http://www.opengis.net/ows"><ows:Exception exceptionCode="InvalidParameterValue"><ows:ExceptionText>Unknown REQUEST: {req}</ows:ExceptionText></ows:Exception></ows:ExceptionReport>',
        media_type="application/xml",
        status_code=400,
    )
