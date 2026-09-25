"""
VaruNet FastAPI Application — v3.0
SIH 2026 | PS 26067 | Ministry of Earth Sciences / INCOIS

Clean architecture:
- app/routers/grid.py     → /api/grid
- app/routers/floats.py   → /api/floats, /api/floats/{id}/profile
- app/routers/drift.py    → /api/drift, /api/health
"""
import sys
import os

# Make sure 'app' package is importable from this entry point
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers.grid import router as grid_router
from app.routers.floats import router as floats_router
from app.routers.drift import router as drift_router
from app.routers.gliders import router as gliders_router
from app.routers import ingest, bgc, ogc

app = FastAPI(
    title="VaruNet API",
    description="INCOIS Ocean Data Visualizer — SIH 2026 PS 26067",
    version="3.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(grid_router)
app.include_router(floats_router)
app.include_router(drift_router)
app.include_router(gliders_router)
app.include_router(ingest.router)
app.include_router(bgc.router)
app.include_router(ogc.router)


@app.get("/")
def root():
    return {
        "name": "VaruNet API",
        "version": "3.0.0",
        "docs": "/docs",
        "health": "/api/health",
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8001))
    uvicorn.run("main_v3:app", host="0.0.0.0", port=port, reload=False)

