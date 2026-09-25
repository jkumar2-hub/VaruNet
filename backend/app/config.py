"""
VaruNet Backend Configuration
SIH 2026 | PS 26067 | INCOIS Ocean Data Visualizer
"""
import os

# Data Source URLs (all public, no auth needed for MVP)
INCOIS_LAS_URL: str = os.getenv("INCOIS_LAS_URL", "https://las.incois.gov.in/")
ARGO_ERDDAP_URL: str = os.getenv(
    "ARGO_ERDDAP_URL",
    "https://erddap.ifremer.fr/erddap"
)
COPERNICUS_API_KEY: str = os.getenv("COPERNICUS_API_KEY", "")

# Database
DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./varunet.db")

# Server
PORT: int = int(os.getenv("PORT", "8000"))
ALLOWED_ORIGINS: list[str] = os.getenv(
    "ALLOWED_ORIGINS", "*"
).split(",")

# Cache TTLs (seconds)
GRID_CACHE_TTL: int = int(os.getenv("GRID_CACHE_TTL", "3600"))   # 1 hour
FLOAT_CACHE_TTL: int = int(os.getenv("FLOAT_CACHE_TTL", "43200")) # 12 hours

# Indian Ocean region bounds
REGION_LAT_MIN: float = -30.0
REGION_LAT_MAX: float = 26.0
REGION_LON_MIN: float = 40.0
REGION_LON_MAX: float = 110.0

# Argo fetch region for ERDDAP queries (slightly wider than display region)
ARGO_REGION: list[float] = [
    REGION_LON_MIN, REGION_LON_MAX,
    REGION_LAT_MIN, REGION_LAT_MAX,
    0, 2000  # depth range
]

# Grid resolution for generated slices
LAT_STEP: float = 1.5
LON_STEP: float = 1.5
