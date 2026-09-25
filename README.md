# VaruNet v3.0 — INCOIS Ocean Data Visualizer
### Smart India Hackathon 2026 · Problem Statement 26067 · Ministry of Earth Sciences / INCOIS

A browser-based 3D ocean intelligence and Search-and-Rescue (SAR) decision support platform engineered for India's ocean monitoring agency.
Renders volumetric temperature, salinity, and density fields (0–2000m) with luminous GLSL shaders, overlays in-situ Argo floats and autonomous underwater gliders, provides high-resolution CTD and biogeochemical profilers, and computes 4th-order Runge-Kutta Lagrangian drift trajectories.

---

## Quick Start

```cmd
Double-click: start.bat
```

Or manually:

**Terminal 1 — Backend:**
```bash
cd backend
python -m uvicorn main_v3:app --port 8001 --reload
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev -- --port 5174
```

Open **http://localhost:5174**

---

## Services & Ports

| Service | URL | Purpose |
| :--- | :--- | :--- |
| **Frontend** | `http://localhost:5174` | 3D Globe & Tactical Command Deck (React 19 + Three.js) |
| **Backend** | `http://localhost:8001` | High-performance Python FastAPI REST API |
| **API Docs** | `http://localhost:8001/docs` | Interactive Swagger UI (OpenAPI 3.0) |
| **Health** | `http://localhost:8001/api/health` | Service diagnostics & data source catalog |

---

## Key Features

1. **Photorealistic 3D Globe & Luminous Ocean Layer**
   - High-resolution NASA Blue Marble photographic bathymetry and normal maps.
   - Custom Three.js `ShaderMaterial` with 3x subdivision mesh (~16,000 fine vertices).
   - Organic perimeter feathering (Hermite falloff) and shoreline alpha dissolve preventing land bleed.
   - Dynamic 3D depth contraction formula sinking the layer into the ocean as depth increases.
2. **Autonomous Glider Mission & Sensor Workstation (`ExpandedGliderModal.tsx`)**
   - Live telemetry chips: Surface Dissolved $O_2$, Chlorophyll-a peak, Depth-Averaged Current (DAC), and Hull Vacuum.
   - Dedicated 4-tab analytical workstation:
     - **Physical CTD Soundings:** In-situ temperature and practical salinity depth curves with interactive ledger.
     - **Biogeochemical Profiler (BGC):** Dissolved Oxygen ($O_2$) identifying the Northern Indian Ocean **Oxygen Minimum Zone (OMZ)** and Chlorophyll-a ($Chl\text{-}a$) identifying the **Deep Chlorophyll Maximum (DCM)**.
     - **Flight Mechanics & Diagnostics:** DAC current vector compass, Hull Seal Integrity gauge (nominal 7.6 inHg), Flight Attitude artificial horizon, and Ballast pump oil stroke.
     - **Sawtooth Transect:** 2D cross-section showing 6 successive yo-yo dive-and-climb cycles across ~50 km.
3. **High-Resolution Expanded CTD Soundings (`ExpandedCTDModal.tsx`)**
   - 0–2000m vertical profiles comparing observed in-situ CTD (emerald) against numerical models (purple).
   - Settled header bar placed **directly above the SVG plot**, ensuring 0% visual overlap on shallow sounding points.
   - Statistical fidelity metrics: RMSE, Surface Delta, and Pearson $R^2$ fit.
4. **4th-Order Runge-Kutta (RK4) SAR Drift Engine**
   - IAMSAR-compliant leeway dynamics for 4 object classes (Life Raft, Fishing Vessel, Cargo Container, Person in Water).
   - Expanding search containment datum cone with radius calculations across 12h to 72h horizons.
5. **Absolute Data Provenance & Real Data Transparency**
   - Live INCOIS LAS probe (`https://las.incois.gov.in/`) with automatic fallback to verified physics engine.
   - Dynamic status badges: `● INCOIS LAS // LIVE`, `● INCOIS LAS // ONLINE (MODEL)`, and `⚠ SIMULATION // LAS OFFLINE`.
   - Prominent top alert banner and LeftDeck warning card whenever fallback/simulated mode is active.
   - Non-masking SQLite cache hits: cached records re-verify live connectivity and never mislabel outages.
6. **Zero-Wrap TopBar Layout & Stabilized Coordinates Readout**
   - Single-line alignment with `whitespace-nowrap`, `flex-nowrap`, and `shrink-0` across all screens.
   - Dedicated fixed-width slot (`w-[148px]`) for live cursor geodetic coordinates (`CURSOR STANDBY` $\to$ `● lat°N · lon°E`), eliminating layout shifts.
7. **Complete Documentation & Architecture Manuals**
   - [`PROJECT_DESCRIPTION.md`](file:///C:/Users/jitin/.gemini/antigravity/scratch/driftscope/PROJECT_DESCRIPTION.md) — Comprehensive master engineering manual & feature log.
   - [`SYSTEM_ARCHITECTURE_AND_OPERATION_MANUAL.md`](file:///C:/Users/jitin/.gemini/antigravity/scratch/driftscope/SYSTEM_ARCHITECTURE_AND_OPERATION_MANUAL.md) — Technical specifications, mathematical formulas, and operational guides.

---

## API Endpoints

```http
GET  /api/grid?variable=temperature&depth=0   2D ocean layer slice (0–2000m)
GET  /api/floats                              Active Argo float network positions
GET  /api/floats/{float_id}/profile           Full 0–2000m CTD vertical sounding arrays
GET  /api/gliders                             Active autonomous glider missions and transects
GET  /api/gliders/{glider_id}/telemetry       High-resolution CTD, BGC sensors, and flight mechanics
POST /api/drift                               4th-order Runge-Kutta SAR drift simulation
GET  /api/health                              System diagnostic & authoritative data sources
```

---

## Project Structure

```text
driftscope/
├── frontend/                         React 19 + TypeScript + Three.js
│   ├── src/
│   │   ├── App.tsx                   Root orchestrator & command decks
│   │   ├── api/client.ts             Typed API client (native fetch)
│   │   └── components/
│   │       ├── OceanGlobe3D.tsx      Luminous 3D ocean mesh & marker system
│   │       ├── ExpandedCTDModal.tsx   High-res CTD profiler with settled legend
│   │       ├── ExpandedGliderModal.tsx Multi-tab glider BGC & flight workstation
│   │       └── DataSourcesModal.tsx  Open science provenance catalog
│
├── backend/
│   ├── main_v3.py                    FastAPI app entry point
│   ├── app/
│   │   ├── routers/
│   │   │   ├── grid.py               GET /api/grid (INCOIS LAS → cache → physics)
│   │   │   ├── floats.py             GET /api/floats, /api/floats/{id}/profile
│   │   │   ├── gliders.py            GET /api/gliders, /api/gliders/{id}/telemetry
│   │   │   └── drift.py              POST /api/drift, GET /api/health
│   │   └── services/
│   │       ├── ocean_physics.py      Indian Ocean thermodynamics & current vectors
│   │       ├── glider_client.py      Glider telemetry, BGC modeling, and flight logs
│   │       ├── lagrangian_drift.py   RK4 Lagrangian + IAMSAR leeway engine
│   │       ├── argo_client.py        ERDDAP Argo data fetcher with caching
│   │       ├── incois_client.py      INCOIS LAS probe with .gov.in SSL bypass
│   │       └── grid_cache.py         SQLite cache (ModelGridCache, DriftRuns)
│
├── SYSTEM_ARCHITECTURE_AND_OPERATION_MANUAL.md  Full technical manual & engineering specification
└── start.bat                         Single-click operational launcher
```
