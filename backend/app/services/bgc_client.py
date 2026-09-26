import time
import math
import requests
from typing import Any

# Use simple physics models as a fallback
def _physics_approx_bgc(lat: float, lon: float) -> tuple[float, float]:
    # chla = max(0.05, 0.3 * exp(-lat/15))
    chla = max(0.05, 0.3 * math.exp(-lat / 15.0))
    # doxy = 180 + (lat * 2)
    doxy = 180.0 + (lat * 2.0)
    return round(chla, 3), round(doxy, 3)

# Seed floats from IO region
SEED_BGC = [
    {"wmo": "1902478", "lat": 15.23, "lon": 62.41},
    {"wmo": "4903268", "lat": 12.05, "lon": 67.33},
    {"wmo": "2903367", "lat": 13.90, "lon": 88.20},
    {"wmo": "6901763", "lat":  2.15, "lon": 80.44},
    {"wmo": "5905996", "lat":-18.40, "lon": 60.12},
    {"wmo": "5906271", "lat":-12.30, "lon": 95.40},
]

_cache = {
    "data": [],
    "source": "",
    "is_live": False,
    "timestamp": 0.0
}
CACHE_TTL = 12 * 3600  # 12 hours

def get_bgc_floats() -> tuple[list[dict[str, Any]], str, bool]:
    now = time.time()
    if _cache["data"] and (now - _cache["timestamp"] < CACHE_TTL):
        return _cache["data"], _cache["source"], _cache["is_live"]

    url = (
        "https://erddap.ifremer.fr/erddap/tabledap/ArgoFloats-bgc.json"
        "?platform_number,latitude,longitude,time,CHLA,DOXY"
        "&latitude>=-5&latitude<=26&longitude>=55&longitude<=100"
        "&time>=2022-01-01T00:00:00Z"
        "&orderByMax(\"platform_number,time\")&distinct()"
    )
    
    floats = []
    try:
        resp = requests.get(url, timeout=20)
        resp.raise_for_status()
        data = resp.json()
        cols = data["table"]["columnNames"]
        rows = data["table"]["rows"]
        
        seen = set()
        for row in rows:
            rec = dict(zip(cols, row))
            wmo = str(rec.get("platform_number", "")).strip()
            if not wmo or wmo in seen:
                continue
            
            lat = float(rec.get("latitude") or 0)
            lon = float(rec.get("longitude") or 0)
            chla = float(rec.get("CHLA") or -999)
            doxy = float(rec.get("DOXY") or -999)
            
            if -1 < chla < 100 and 0 < doxy < 500:
                seen.add(wmo)
                floats.append({
                    "float_id": f"BGC-{wmo}",
                    "wmo_id": wmo,
                    "lat": round(lat, 4),
                    "lon": round(lon, 4),
                    "chla": round(chla, 3),
                    "doxy": round(doxy, 3),
                    "data_source": "IFREMER ERDDAP BGC"
                })
        source = "IFREMER ERDDAP BGC (live)"
        is_live = True
        
    except Exception as exc:
        print(f"BGC ERDDAP failed: {exc}, falling back to physics approx")
        floats = []
        for f in SEED_BGC:
            lat = f["lat"]
            lon = f["lon"]
            wmo = f["wmo"]
            chla, doxy = _physics_approx_bgc(lat, lon)
            floats.append({
                "float_id": f"BGC-{wmo}",
                "wmo_id": wmo,
                "lat": lat,
                "lon": lon,
                "chla": chla,
                "doxy": doxy,
                "data_source": "Physics approximation (BGC ERDDAP offline)"
            })
        source = "Physics approximation (BGC ERDDAP offline)"
        is_live = False
        
    if floats:
        _cache["data"] = floats
        _cache["source"] = source
        _cache["is_live"] = is_live
        _cache["timestamp"] = now
        
    return _cache["data"], _cache["source"], _cache["is_live"]
