from fastapi import APIRouter
from app.services.bgc_client import get_bgc_floats

router = APIRouter(prefix="/api/bgc", tags=["bgc"])

@router.get("/floats")
async def bgc_floats():
    floats, source, is_live = get_bgc_floats()
    return {"count": len(floats), "floats": floats, "data_source": source, "is_live": is_live}
