"""
VaruNet Complete Build & Audit Script
Runs all checks, starts backend, verifies all endpoints, reports status.
"""
import subprocess, sys, time, os, requests, json

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(BASE_DIR, "backend")
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")
PYTHON = sys.executable
BASE_URL = os.environ.get("BASE_URL", "http://localhost:8001")

results = []

def log(msg): print(msg, flush=True)

def test_endpoint(label, url, method="GET", files=None, expected_key=None, timeout=15):
    try:
        r = requests.request(method, url, files=files, timeout=timeout)
        ok = r.status_code == 200
        try:
            data = r.json()
            summary = str(data.get(expected_key, list(data.keys())[:3]))[:70] if expected_key and isinstance(data, dict) else str(list(data.keys()) if isinstance(data, dict) else type(data))[:60]
        except Exception:
            summary = f"bytes={len(r.content)} ct={r.headers.get('content-type','')[:30]}"
        results.append((ok, label, r.status_code, summary))
        return ok
    except Exception as e:
        results.append((False, label, "ERR", str(e)[:65]))
        return False

# ── Step 1: Import check ──────────────────────────────────────────────────────
log("\n[1/5] Checking Python imports...")
import_check = subprocess.run(
    [PYTHON, "-c",
     "import sys; sys.path.insert(0,'.')\n"
     "from app.routers.grid import router\n"
     "from app.routers.ingest import router as ir\n"
     "from app.routers.bgc import router as br\n"
     "from app.routers.ogc import router as or_\n"
     "from app.services.incois_client import get_las_status, reset_las_cache\n"
     "from app.services.netcdf_parser import parse_netcdf, parse_text\n"
     "from app.services.bgc_client import get_bgc_floats\n"
     "from app.services.ogc_service import wms_capabilities_xml\n"
     "import pydap; print('OK pydap', pydap.__version__)\n"
     "print('ALL IMPORTS OK')"],
    cwd=BACKEND_DIR, capture_output=True, text=True, timeout=20
)
if "ALL IMPORTS OK" in import_check.stdout:
    log("  ✓ All imports OK")
else:
    log(f"  ✗ Import error:\n{import_check.stdout}\n{import_check.stderr}")

# ── Step 2: Start backend ─────────────────────────────────────────────────────
log("\n[2/5] Starting backend...")
# Kill any existing process on 8001
subprocess.run(
    ["powershell", "-Command",
     "Get-NetTCPConnection -LocalPort 8001 -ErrorAction SilentlyContinue | "
     "ForEach-Object { Stop-Process -Id (Get-Process -Id $_.OwningProcess).Id -Force -ErrorAction SilentlyContinue }"],
    capture_output=True
)
time.sleep(2)
backend_proc = subprocess.Popen(
    [PYTHON, "-m", "uvicorn", "main_v3:app", "--host", "0.0.0.0", "--port", "8001"],
    cwd=BACKEND_DIR
)
log(f"  Backend PID: {backend_proc.pid}")
# Wait for it to be ready
for i in range(15):
    time.sleep(1)
    try:
        r = requests.get(f"{BASE_URL}/", timeout=2)
        if r.status_code == 200:
            log(f"  ✓ Backend up after {i+1}s")
            break
    except Exception:
        pass
else:
    log("  ✗ Backend not responding after 15s")

# ── Step 3: Run all endpoint tests ────────────────────────────────────────────
log("\n[3/5] Running endpoint audit...")
test_endpoint("GET /",                          f"{BASE_URL}/")
test_endpoint("GET /api/health",                f"{BASE_URL}/api/health")
test_endpoint("GET /api/grid (temp, 0m)",       f"{BASE_URL}/api/grid?variable=temperature&depth=0", expected_key="is_real_data")
test_endpoint("GET /api/grid (salinity, 100m)", f"{BASE_URL}/api/grid?variable=salinity&depth=100",   expected_key="source")
test_endpoint("GET /api/grid (density, 500m)",  f"{BASE_URL}/api/grid?variable=density&depth=500",    expected_key="las_online")
test_endpoint("GET /api/floats",                f"{BASE_URL}/api/floats",                             expected_key="count")
test_endpoint("GET /api/gliders",              f"{BASE_URL}/api/gliders",                            expected_key="count")
test_endpoint("GET /api/bgc/floats",           f"{BASE_URL}/api/bgc/floats",                         expected_key="count")
test_endpoint("GET /api/las/status",           f"{BASE_URL}/api/las/status",                         expected_key="las_online", timeout=12)
test_endpoint("GET /api/las/refresh",          f"{BASE_URL}/api/las/refresh",                        expected_key="las_online", timeout=12)
test_endpoint("GET /api/ingest/formats",       f"{BASE_URL}/api/ingest/formats",                     expected_key="max_size_mb")
test_endpoint("GET /wms GetCapabilities",      f"{BASE_URL}/wms?SERVICE=WMS&REQUEST=GetCapabilities")
test_endpoint("GET /wms GetMap PNG",           f"{BASE_URL}/wms?SERVICE=WMS&REQUEST=GetMap&LAYERS=SST&BBOX=-5,55,26,100&WIDTH=128&HEIGHT=128&FORMAT=image/png")
test_endpoint("GET /wcs GetCapabilities",      f"{BASE_URL}/wcs?SERVICE=WCS&REQUEST=GetCapabilities")
test_endpoint("GET /wcs GetCoverage SST",      f"{BASE_URL}/wcs?SERVICE=WCS&REQUEST=GetCoverage&IDENTIFIER=SST",  expected_key="standard_name")
test_endpoint("GET /api/floats/1902289/profile", f"{BASE_URL}/api/floats/1902289/profile",             expected_key="data_source", timeout=20)

csv_data = b"lat,lon,depth,temp,salinity\n12.5,68.3,0,29.8,35.4\n15.1,72.4,50,27.3,36.1\n8.3,61.2,200,18.5,35.9\n"
test_endpoint("POST /api/ingest/text",         f"{BASE_URL}/api/ingest/text", method="POST",
              files={"file": ("ocean.csv", csv_data, "text/csv")}, expected_key="count")

# ── Step 4: Print results ─────────────────────────────────────────────────────
print()
print("=" * 78)
print(f"{'ST':<4}  {'ENDPOINT':<42} {'HTTP':<5} DETAIL")
print("-" * 78)
for ok, label, code, summary in results:
    print(f"{'OK  ' if ok else 'FAIL'}  {label:<42} {str(code):<5} {summary}")
print("=" * 78)
passed = sum(1 for ok, *_ in results if ok)
print(f"BACKEND AUDIT: {passed}/{len(results)} passed")

# ── Step 5: LAS detailed status ───────────────────────────────────────────────
log("\n[4/5] LAS detailed status...")
try:
    r = requests.get(f"{BASE_URL}/api/las/status", timeout=12)
    d = r.json()
    log(f"  LAS Online:      {d.get('las_online')}")
    log(f"  LAS URL:         {d.get('las_url')}")
    log(f"  THREDDS Catalog: {d.get('thredds_catalog')}")
    log(f"  Cache age (s):   {d.get('cache_age_seconds')}")
except Exception as e:
    log(f"  LAS status error: {e}")

# ── Step 6: Frontend build ────────────────────────────────────────────────────
log("\n[5/5] Frontend build check...")
npm = subprocess.run(
    ["npm", "run", "build"],
    cwd=FRONTEND_DIR, capture_output=True, text=True, timeout=60
)
if "built in" in npm.stdout or "built in" in npm.stderr:
    log("  ✓ Frontend build: PASS")
elif npm.returncode != 0:
    errors = [l for l in (npm.stdout + npm.stderr).splitlines() if "error TS" in l or "Error" in l]
    log(f"  ✗ Frontend build errors ({len(errors)}):")
    for e in errors[:10]:
        log(f"    {e}")
else:
    log("  Frontend build: " + ("PASS" if npm.returncode == 0 else "FAIL"))

print()
print("=" * 78)
print("DONE. Backend running on http://localhost:8001")
print("      Docs:    http://localhost:8001/docs")
print("      WMS:     http://localhost:8001/wms?SERVICE=WMS&REQUEST=GetCapabilities")
print("      WCS:     http://localhost:8001/wcs?SERVICE=WCS&REQUEST=GetCapabilities")
print("      LAS:     http://localhost:8001/api/las/status")
print("      BGC:     http://localhost:8001/api/bgc/floats")
print("=" * 78)
