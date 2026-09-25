"""
VaruNet v3 — Full Integration Test Suite
SIH 2026 | PS 26067
Tests all API endpoints and verifies the complete system.
"""
import urllib.request
import urllib.parse
import json
import time

BASE = "http://localhost:8001"
PASS = 0
FAIL = 0

def req(path, method="GET", body=None, timeout=15):
    url = BASE + path
    data = json.dumps(body).encode() if body else None
    r = urllib.request.Request(url, data=data, method=method)
    r.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(r, timeout=timeout) as resp:
        return json.loads(resp.read())

def check(label, condition, detail=""):
    global PASS, FAIL
    if condition:
        print(f"  [PASS] {label}")
        PASS += 1
    else:
        print(f"  [FAIL] {label} {detail}")
        FAIL += 1

print("=" * 60)
print("  VaruNet v3 — API Test Suite")
print("=" * 60)

# ── Health ────────────────────────────────────────────────────
print("\n[1] Health Check")
try:
    d = req("/api/health")
    check("Status online",    d.get("status") == "online")
    check("Version 3.0.0",    d.get("version") == "3.0.0")
    check("All 4 data sources present", len(d.get("data_sources", {})) == 4)
    check("INCOIS LAS listed", "incois_las" in d.get("data_sources", {}))
    check("Argo GDAC listed",  "argo_gdac"  in d.get("data_sources", {}))
except Exception as e:
    check("Health endpoint", False, str(e))

# ── Grid — Temperature ────────────────────────────────────────
print("\n[2] Grid — Temperature at 0m")
try:
    d = req("/api/grid?variable=temperature&depth=0")
    lats = d.get("lats", [])
    lons = d.get("lons", [])
    data = d.get("data", [])
    check("Grid returned",        len(lats) > 0 and len(lons) > 0)
    check("Grid is 39x48",        len(lats) == 39 and len(lons) == 48)
    check("Data rows match lats", len(data) == len(lats))
    check("Source labeled",       bool(d.get("source")))
    check("Variable correct",     d.get("variable") == "temperature")
    check("Units in response",    "units" in d)
    src = d.get("source", "")
    print(f"         Source: {src}")
except Exception as e:
    check("Grid temp endpoint", False, str(e))

# ── Grid — Salinity at 250m ────────────────────────────────────
print("\n[3] Grid — Salinity at 250m")
try:
    d = req("/api/grid?variable=salinity&depth=250")
    check("Salinity grid returned", len(d.get("lats", [])) > 0)
    check("Variable=salinity",      d.get("variable") == "salinity")
    check("Depth=250",              d.get("depth") == 250.0)
    # Salinity range sanity: should be ~30-38 PSU
    flat = [v for row in d.get("data", []) for v in row if v > -100]
    check("Salinity range sane",    all(28 < v < 40 for v in flat[:50]))
except Exception as e:
    check("Grid salinity endpoint", False, str(e))

# ── Grid — Density at 500m ────────────────────────────────────
print("\n[4] Grid — Density at 500m")
try:
    d = req("/api/grid?variable=density&depth=500")
    check("Density grid returned", len(d.get("lats", [])) > 0)
    check("Variable=density",      d.get("variable") == "density")
except Exception as e:
    check("Grid density endpoint", False, str(e))

# ── Floats — non-blocking ─────────────────────────────────────
print("\n[5] Floats (non-blocking — responds instantly)")
try:
    t0 = time.time()
    d = req("/api/floats")
    elapsed = time.time() - t0
    check("Floats endpoint responds",        "floats" in d)
    check("Responds in < 5 seconds",         elapsed < 5.0, f"({elapsed:.2f}s)")
    check("Count field present",             "count" in d)
    check("data_source labeled",             bool(d.get("data_source")))
    check("gdac_url present",                bool(d.get("gdac_url")))
    print(f"         Response time: {elapsed:.2f}s | Floats: {d.get('count', 0)}")
    print(f"         Source: {d.get('data_source')}")
    if d.get("cache_notice"):
        print(f"         Notice: {d.get('cache_notice')}")
except Exception as e:
    check("Floats endpoint", False, str(e))

# ── Drift ─────────────────────────────────────────────────────
print("\n[6] Drift Simulation (RK4 Lagrangian)")
try:
    d = req("/api/drift", method="POST", body={
        "start_lat": 10.5, "start_lon": 65.2,
        "duration_hours": 24, "object_type": "life_raft"
    })
    path = d.get("path", [])
    check("Path returned",            len(path) > 0)
    check("More than 5 waypoints",    len(path) >= 6)
    check("Distance > 0",             d.get("total_drift_distance_km", 0) > 0)
    check("Search radius > 0",        d.get("final_search_radius_km", 0) > 0)
    check("run_id stored",            bool(d.get("run_id")))
    check("Disclaimer present",       bool(d.get("disclaimer")))
    check("Physics labeled",          bool(d.get("physics")))
    check("Each waypoint has lat/lon",
          all("lat" in p and "lon" in p for p in path))
    print(f"         Waypoints: {len(path)} | Dist: {d.get('total_drift_distance_km')} km")
    print(f"         SAR radius: {d.get('final_search_radius_km')} km")
    print(f"         Run ID: {str(d.get('run_id',''))[:8]}...")
except Exception as e:
    check("Drift endpoint", False, str(e))

# ── Drift — other object types ────────────────────────────────
print("\n[7] Drift — All Object Types")
for obj in ["life_raft", "fishing_vessel", "cargo_container", "person_in_water"]:
    try:
        d = req("/api/drift", method="POST", body={
            "start_lat": 5.0, "start_lon": 75.0,
            "duration_hours": 12, "object_type": obj
        })
        check(f"object_type={obj}", len(d.get("path", [])) > 0)
    except Exception as e:
        check(f"object_type={obj}", False, str(e))

# ── Drift — Expanding IAMSAR Search Radius ───────────────
print("\n[7b] IAMSAR Expanding Search Radius (12h -> 24h -> 48h -> 72h)")
radii = []
for h in [12, 24, 48, 72]:
    try:
        d = req("/api/drift", method="POST", body={
            "start_lat": 10.5, "start_lon": 65.2,
            "duration_hours": h, "object_type": "life_raft"
        })
        r = d.get("final_search_radius_km", 0)
        radii.append((h, r))
        print(f"         T+{h}h Horizon -> Search Radius: ±{r} km ({(r/1.852):.1f} NM)")
    except Exception as e:
        check(f"Horizon {h}h query", False, str(e))

check("Radii strictly expand with horizon (12h < 24h < 48h < 72h)",
      radii[0][1] < radii[1][1] < radii[2][1] < radii[3][1],
      f"got {[r[1] for r in radii]}")
check("72h search radius is substantially expanded (> 3x 12h radius)",
      radii[3][1] >= 3.0 * radii[0][1],
      f"12h={radii[0][1]}km, 72h={radii[3][1]}km")

# ── Gliders ───────────────────────────────────────────────────
print("\n[8] Underwater Glider Missions")
try:
    d = req("/api/gliders")
    gliders = d.get("gliders", [])
    check("Gliders returned", len(gliders) >= 6)
    check("data_source labeled", bool(d.get("data_source")))
    check("gdac_url present", bool(d.get("gdac_url")))
    check("All gliders have transects", all(len(g.get("transect", [])) >= 2 for g in gliders))
    print(f"         Active Glider Missions: {len(gliders)}")
except Exception as e:
    check("Gliders endpoint", False, str(e))

# ── Float Profile (Observed vs Model) ─────────────────────────
print("\n[9] Argo Float Vertical CTD Profile (0-2000m)")
try:
    d = req("/api/floats/1902478/profile")
    check("Profile returned", "wmo_id" in d)
    check("Depth levels present", len(d.get("depth_levels", [])) > 0)
    check("Observed and Model temp arrays", len(d.get("observed_temp", [])) == len(d.get("model_temp", [])))
    check("RMSE calculated", d.get("rmse_temp") is not None)
    check("Data source labeled", bool(d.get("data_source")))
    print(f"         WMO: {d.get('wmo_id')} | Levels: {len(d.get('depth_levels', []))} | RMSE: {d.get('rmse_temp')}°C")
except Exception as e:
    check("Float profile endpoint", False, str(e))

# ── Summary ───────────────────────────────────────────────────
print()
print("=" * 60)
total = PASS + FAIL
print(f"  RESULTS: {PASS}/{total} passed  |  {FAIL} failed")
print("=" * 60)
if FAIL == 0:
    print("  All tests passed! VaruNet v3 is fully operational.")
else:
    print(f"  {FAIL} test(s) failed — review above.")
