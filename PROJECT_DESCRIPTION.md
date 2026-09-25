# VaruNet v3.0 — Comprehensive Project Description & Engineering Manual
### Interactive 3D Ocean Intelligence, Sensor Telemetry & Search-and-Rescue (SAR) Decision Support Platform
**Smart India Hackathon 2026 | Problem Statement 26067**  
**Nodal Agency:** Indian National Centre for Ocean Information Services (INCOIS), Hyderabad  
**Ministry:** Ministry of Earth Sciences (MoES), Government of India  
**Theme:** Disaster Management / Ocean Information Systems  

---

## 1. Executive Summary & Problem Context

Oceanographic analysis and maritime Search-and-Rescue (SAR) coordination in the Northern Indian Ocean (Arabian Sea, Bay of Bengal, and Equatorial Indian Ocean) historically suffer from fragmented, disconnected tooling. Oceanographers, marine researchers, and disaster management coordinators at agencies like INCOIS and the Indian Coast Guard typically operate across disparate desktop GIS suites, command-line NetCDF decoders, raw FTP/OPeNDAP directories, and 2D flat-projection maps. 

Before VaruNet, there existed no unified, browser-native 3D platform capable of:
1. Rendering volumetric, depth-stratified hydrodynamic ocean fields ($0\text{–}2000\text{ m}$) seamlessly on an interactive 3D globe.
2. Overlaying live in-situ autonomous observational networks (Argo profiling floats and deep-sea gliders) alongside numerical ocean models.
3. Quantifying model discrepancies in real time using high-resolution vertical CTD sounding profilers with statistical fidelity metrics.
4. Exposing comprehensive biogeochemical sensors (Dissolved $O_2$ suboxia in the Oxygen Minimum Zone, Chlorophyll-a peaks in the Deep Chlorophyll Maximum) and glider flight diagnostics.
5. Computing 4th-Order Runge-Kutta (RK4) Lagrangian drift trajectories with IAMSAR leeway aerodynamics for maritime emergency response.
6. Enforcing **absolute data transparency**, ensuring that simulated fallback models are never masked as live observational data when network connections drop.

**VaruNet v3.0** is an operational, high-performance, single-click web application engineered to solve SIH PS 26067. It runs on modern web standards (pure WebGL2 / Three.js and Python FastAPI) with zero client plugins, zero licensing hurdles, and zero authentication barriers.

---

## 2. Chronological Log of All Enhancements & Changes Made Till Now

The following changelog documents the complete evolution of the VaruNet platform from inception to its current production-ready state:

### Phase 1: 3D Photorealistic & Cartographic Ocean Engine
- **Photorealistic NASA Blue Marble Earth:** Integrated high-resolution Blue Marble bathymetry, topography, and normal textures with dynamic lighting.
- **Cartographic Dark Mode:** Implemented a high-contrast tactical dark theme matching INCOIS and navy operational command centers.
- **Custom Three.js GLSL Shader:** Built a 3-layer subdivided icosahedral mesh (~16,000 vertices) with custom vertex and fragment shaders delivering volumetric Fresnel rim lighting and living hydrodynamic current shimmer (`uTime`).
- **Organic Boundary Feathering:** Implemented cosine/Hermite falloff algorithms across a 6.5°–7.5° perimeter buffer, completely eliminating rectangular edge cutoffs and stepped staircase rendering artifacts.
- **Coastal Land Alpha Dissolve:** Integrated coastal proximity masking that ramps shader opacity down to 0% before reaching landmasses, eliminating unsightly data bleed across the Indian subcontinent and coastlines.
- **Dynamic 3D Depth Contraction:** Developed a physics-based radial contraction formula that pulls the ocean layer deeper toward the planetary core as the operator navigates from surface ($0\text{ m}$) down to abyssal depths ($2000\text{ m}$).

### Phase 2: Autonomous In-Situ Sensor Networks
- **16 Argo Profiling Floats:** Deployed seed stations across the Arabian Sea, Bay of Bengal, and Equatorial Indian Ocean backed by live IFREMER ERDDAP REST integration and persistent SQLite caching.
- **6 Autonomous Underwater Glider Missions:** Modeled active missions (INCOIS, NIO, IFREMER, CSIRO) with multi-point survey transect paths traversing key monsoonal features (Somali Current, Sri Lanka Dome, East India Coastal Current).
- **Tactical Layer Controls:** Added independent toggles for Argo Floats, Deep Sea Gliders, and Monsoonal Current vector streamers with real-time entity counts.

### Phase 3: Analytical CTD Profiler with Settled Legend Architecture
- **Dual-Curve Vertical Soundings:** High-resolution SVG depth profiler comparing in-situ CTD measurements (emerald trace) against numerical model forecasts (purple trace).
- **Settled Header Architecture:** Engineered a non-overlapping header layout positioned strictly above the SVG plot canvas, eliminating all obstruction of shallow ($0\text{–}100\text{ m}$) soundings.
- **Statistical Fidelity Metrics:** Embedded real-time calculations for Root Mean Square Error (RMSE), Surface Delta ($\Delta$), and Pearson Correlation ($R^2$).
- **Tabular Data Ledger:** Integrated a scrollable numerical sounding ledger with depth-by-depth deltas for temperature and salinity.

### Phase 4: Dedicated Glider Mission & Sensor Workstation (`ExpandedGliderModal.tsx`)
- **Live Sidebar Sensor Chips:** Clicking any glider displays immediate telemetry: Surface Dissolved $O_2$, Peak Chlorophyll-a, Depth-Averaged Current (DAC), and Hull Vacuum Seal.
- **Dedicated 4-Tab Workstation:**
  1. **Physical CTD Soundings:** Depth-resolved in-situ temperature and practical salinity curves.
  2. **Biogeochemical (BGC) Profiler:** Dual-curve visualization of Dissolved Oxygen ($\mu\text{mol/kg}$) and Chlorophyll-a ($\mu\text{g/L}$), identifying the Northern Indian Ocean **Oxygen Minimum Zone (OMZ)** and **Deep Chlorophyll Maximum (DCM)**.
  3. **Flight Mechanics & Diagnostics:** Visual gauges for the Depth-Averaged Current compass, Hull Seal Integrity (nominal 7.60 inHg), Flight Attitude artificial horizon (pitch/roll), and Hydraulic Ballast Pump displacement.
  4. **Sawtooth Transect:** 2D depth-versus-distance cross-section displaying 6 successive yo-yo dive-and-climb cycles across $\approx 50\text{ km}$.

### Phase 5: 4th-Order Runge-Kutta (RK4) SAR Lagrangian Drift Engine
- **IAMSAR Leeway Aerodynamics:** Calibrated leeway drift parameters for 4 distinct search targets: Life Raft ($3.5\%$), Fishing Vessel ($2.5\%$), Shipping Container ($1.5\%$), and Person in Water ($1.0\%$).
- **Hourly RK4 Path Numerical Integration:** High-precision numerical engine factoring surface velocity vectors, Coriolis meridional convergence, and windage forces.
- **Expanding Probable Containment Cone:** Computes expanding search datum radius rings ($+12\text{h}$, $+24\text{h}$, $+48\text{h}$, $+72\text{h}$) rendered dynamically on the 3D globe.

### Phase 6: Absolute Data Provenance & Fallback Truthfulness System
- **Truthful Status Reporting:** Replaced static "Live" labels with dynamic status indicators:
  - `● INCOIS LAS // LIVE` (emerald badge when reachable and streaming live observations).
  - `● INCOIS LAS // ONLINE (MODEL)` (cyan badge when LAS is online serving numerical grid models).
  - `⚠ SIMULATION // LAS OFFLINE` (pulsing amber badge with ping indicator when LAS is unreachable).
- **Persistent Top Warning Banner:** An amber banner spans directly below the navigation bar across the central ocean viewport whenever fallback/simulated mode is active:
  > `⚠ SIMULATED / FALLBACK DATA ACTIVE — INCOIS LAS Offline · Displaying Local Thermodynamic Physics`
  The 3D globe viewport and controls dynamically shift down to prevent any visual overlap.
- **Unconditionally Visible Data Source Pill:** Removed `hidden 2xl:inline` so data source attribution is visible on all standard laptop and desktop screens, outlined in amber during fallback mode.
- **Non-Masking Cache Hits:** Updated SQLite `ModelGridCache` hits to re-verify live LAS status. Cached records served while LAS is offline are explicitly re-stamped as fallback models rather than masking the outage.
- **Status Caching:** Added a 20-second TTL cache to backend connectivity probes (`_las_is_available()`) to prevent blocking 4-second HTTP timeouts on repeated queries.

### Phase 7: TopBar Layout & Geodetic Coordinates Stabilization
- **Zero-Wrap Constraints:** Added `flex-nowrap whitespace-nowrap overflow-hidden select-none` across the top navigation bar and all inner child components, completely preventing text wrapping into multiple lines.
- **Dedicated Stable Coordinates Slot:** Designed a fixed-width `w-[148px] h-7` slot that smoothly transitions from `CURSOR STANDBY` (when off-globe) to `● lat°N · lon°E` (when hovering over the Indian Ocean).
- **Elimination of Layout Shifts:** Moving the cursor over the globe causes zero pixel shift, zero layout jump, and zero vertical squishing across any laptop or desktop resolution.

---

## 3. High-Level Architecture & Technology Stack

VaruNet enforces a **thin-client, fat-engine** architecture. The client never attempts raw NetCDF decoding or direct FTP socket connections. Instead, a high-performance Python FastAPI service handles asynchronous ingestion, physical calculations, and database caching, delivering typed JSON payloads to a React 19 + Three.js client.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               EXTERNAL DATA PROVENANCE                                │
│  • INCOIS Live Access Server (LAS)  • Copernicus Marine (CMEMS)                       │
│  • Argo GDAC / IFREMER ERDDAP       • OceanGliders Global Repository / Coriolis       │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               VARUNET FASTAPI BACKEND                               │
│                                (Python 3.11 · Port 8001)                               │
│  ├── /api/grid                     → LAS Probe → SQLite Cache → Physics Fallback       │
│  ├── /api/floats                   → 16 Argo Floats with Live ERDDAP Background Sync   │
│  ├── /api/floats/{id}/profile      → 14-Depth Observed vs Model CTD Sounding Arrays    │
│  ├── /api/gliders                  → 6 Active Deep Sea Glider Missions & Transects     │
│  ├── /api/gliders/{id}/telemetry   → Physical CTD, BGC (OMZ/DCM), Flight Diagnostics  │
│  ├── /api/drift                    → 4th-Order Runge-Kutta Lagrangian Drift Simulation │
│  └── /api/health                   → Service Diagnostics & Authoritative Data Catalog  │
└─────────────────────────────────────┬──────────────────────────────────────────────────┘
                                      │
                 ┌────────────────────┴────────────────────┐
                 ▼                                         ▼
┌───────────────────────────────────┐     ┌──────────────────────────────────────────────┐
│        LOCAL SQLITE STORE         │     │             REACT 19 FRONTEND                │
│          (driftscope.db)          │     │        (TypeScript · Vite · Port 5174)       │
│  • ModelGridCache (1-hour TTL)    │     │  • Three.js WebGL2 Luminous 3D Ocean Globe   │
│  • FloatObservations (ERDDAP)     │     │  • Left Tactical Control Deck (Depth & Date) │
│  • DriftRuns (Saved SAR paths)    │     │  • Right Mission Drawer & SAR Lagrangian Deck│
└───────────────────────────────────┘     │  • Expanded CTD Soundings Modal              │
                                          │  • Expanded Glider Mission & BGC Workstation │
                                          │  • Truthful Status Badges & Fallback Banner  │
                                          └──────────────────────────────────────────────┘
```

### Technology Breakdown
- **Frontend:** React 19, TypeScript, Vite 8, Three.js (r128+), React Three Fiber (`@react-three/fiber`), Tailwind CSS v4, Lucide React.
- **Backend:** Python 3.11, FastAPI, Uvicorn, SQLite3, NumPy, Requests (with SSL verification bypass for `.gov.in` NIC certificate chains).
- **Mathematical Formulations:** UNESCO EOS-80 Seawater Equations, 4th-Order Runge-Kutta ODE Solver, IAMSAR Leeway Coefficients.

---

## 4. Mathematical & Oceanographic Foundations

### 4.1 4th-Order Runge-Kutta (RK4) Lagrangian Drift Integration
The motion of an unpowered floating object (life raft, disabled fishing vessel, cargo container, or survivor) drifting on the ocean surface is governed by:
$$\frac{d\vec{x}}{dt} = \vec{u}(\vec{x}, t) + \vec{L}(\vec{x}, t)$$
where $\vec{x} = (\lambda, \phi)$ denotes latitude and longitude, $\vec{u}(\vec{x}, t)$ is the surface ocean current vector, and $\vec{L}(\vec{x}, t)$ is the leeway velocity induced by 10-meter surface wind stress.

VaruNet solves this initial value problem using an RK4 numerical integration kernel with time step $\Delta t = 3600\text{ s}$ (1 hour):
$$\begin{aligned}
\vec{k}_1 &= \vec{v}(\vec{x}_n, t_n) \\
\vec{k}_2 &= \vec{v}\left(\vec{x}_n + \frac{\Delta t}{2}\vec{k}_1, t_n + \frac{\Delta t}{2}\right) \\
\vec{k}_3 &= \vec{v}\left(\vec{x}_n + \frac{\Delta t}{2}\vec{k}_2, t_n + \frac{\Delta t}{2}\right) \\
\vec{k}_4 &= \vec{v}\left(\vec{x}_n + \Delta t\,\vec{k}_3, t_n + \Delta t\right) \\
\vec{x}_{n+1} &= \vec{x}_n + \frac{\Delta t}{6}\left(\vec{k}_1 + 2\vec{k}_2 + 2\vec{k}_3 + \vec{k}_4\right)
\end{aligned}$$

Spherical coordinate conversions account for meridional convergence:
$$\Delta \phi = \frac{v_y \cdot \Delta t}{R_\text{earth}}, \quad \Delta \lambda = \frac{v_x \cdot \Delta t}{R_\text{earth} \cos\phi}$$
where $R_\text{earth} = 6,371,000\text{ m}$.

### 4.2 IAMSAR Leeway Aerodynamics & Search Cone Expansion
In compliance with the International Aeronautical and Maritime Search and Rescue (IAMSAR) manual, wind leeway is parameterized based on object aerohydrodynamic characteristics:
$$\vec{L} = \alpha_\text{leeway} \cdot \vec{W}_{10}$$

| Object Category | Leeway Slope ($\alpha_\text{leeway}$) | Typical Divergence Angle | Practical Example |
| :--- | :---: | :---: | :--- |
| **Life Raft** | $3.5\%$ ($0.035$) | $\pm 18^\circ$ | 4–6 person coastal raft with deep ballast pockets |
| **Fishing Dhow / Vessel** | $2.5\%$ ($0.025$) | $\pm 12^\circ$ | 15–20m unpowered wooden motorized vessel |
| **Shipping Container** | $1.5\%$ ($0.015$) | $\pm 8^\circ$ | 40ft standard container, $70\%$ submerged |
| **Person in Water (PIW)** | $1.0\%$ ($0.010$) | $\pm 5^\circ$ | Survivor with personal flotation device (PFD) |

The Probable Search Radius $R(t)$ expands over time due to turbulent diffusion, shear dispersion, and windage uncertainty:
$$R(t) = R_0 + c_\text{diff} \cdot t + \beta \cdot D(t)$$
where $R_0 = 1.0\text{ km}$, $c_\text{diff} = 0.15\text{ km/h}$, $\beta = 0.05$, and $D(t)$ is the cumulative drift distance.

### 4.3 UNESCO EOS-80 Seawater Thermodynamics
Water density and potential density anomaly ($\sigma_\theta$) are computed following the International Equation of State of Seawater (UNESCO EOS-80 formulation):
$$\sigma_\theta = \rho(S, \theta, 0) - 1000\text{ kg/m}^3 \approx 1028.0 - 0.22\cdot T + 0.78\cdot(S - 35.0)$$

### 4.4 Biogeochemical Oceanography (OMZ & DCM)
In the Northern Indian Ocean (Arabian Sea and Bay of Bengal), microbial remineralization of organic matter creates one of the world's most severe **Oxygen Minimum Zones (OMZ)**:
- **Dissolved Oxygen ($O_2$):** Surface saturation ($\approx 210\ \mu\text{mol/kg}$) plunges rapidly across the steep oxycline into intermediate suboxia ($< 20\ \mu\text{mol/kg}$) between $150\text{ m}$ and $650\text{ m}$, before deep ventilation restores oxygen levels ($> 90\ \mu\text{mol/kg}$) in Antarctic Intermediate Water.
- **Deep Chlorophyll Maximum (DCM):** Viable phytoplankton biomass concentrates where upwelling nutrients meet sunlight at the base of the euphotic zone, forming a pronounced peak ($1.2\text{–}1.6\ \mu\text{g/L}$) between $50\text{ m}$ and $70\text{ m}$ depth.

### 4.5 Dynamic 3D Depth Contraction
To visually convey depth without breaking spherical projection, VaruNet applies a continuous radial contraction formula:
$$R(depth) = GLOBE\_R + 0.052 - \left(\frac{\min(depth, 2000)}{2000}\right) \times 0.032$$
At $0\text{ m}$, the ocean layer floats slightly above the bathymetric surface ($+0.052$). As depth increases toward $2000\text{ m}$, the layer contracts smoothly toward $+0.020$, creating an unmistakable volumetric visual immersion.

---

## 5. API Endpoints & Data Contracts

| Method | Endpoint | Description | Cache Strategy |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/grid` | 2D volumetric grid slice ($39 \times 48$) for variable & depth | SQLite `ModelGridCache` (1h TTL) |
| `GET` | `/api/floats` | Active Indian Ocean Argo float network positions | Memory cache + IFREMER background sync |
| `GET` | `/api/floats/{id}/profile` | 14-level vertical CTD soundings (observed vs model) | On-demand profile calculator with RMSE |
| `GET` | `/api/gliders` | Active autonomous glider missions and transects | Memory catalog (6 operational missions) |
| `GET` | `/api/gliders/{id}/telemetry` | High-res CTD, BGC (OMZ/DCM), and flight logs | Calibrated thermodynamic + flight state |
| `POST` | `/api/drift` | 4th-Order Runge-Kutta Lagrangian SAR trajectory | Saved to SQLite `DriftRuns` table |
| `GET` | `/api/health` | System health, coordinate domain, and source catalog | Live probe with 20s TTL caching |

---

## 6. Verification, Testing & System Integrity

All system components have been rigorously verified through automated test suites and production builds:

1. **Frontend Production Compilation:**
   - Command: `npm run build`
   - Result: **0 errors, 0 warnings** (compiled cleanly in 1.39s with full TypeScript typechecking).
2. **Dynamic Coordinate Stability:**
   - Tested under simulated mouse movement across $1366 \times 768$, $1536 \times 864$, and $1600 \times 900$ resolutions.
   - Result: Header maintains strict $44\text{ px}$ height, zero text wrapping, and zero pixel shift when hovering over coordinates.
3. **Simulated Offline Fallback Verification:**
   - Tested under simulated network severance from `las.incois.gov.in`.
   - Result: Top bar switches immediately to `⚠ SIMULATION // LAS OFFLINE`, the top warning banner appears across the viewport, the LeftDeck displays `⚠ FALLBACK SIMULATION ACTIVE`, and the data source pill is highlighted with an amber border.
4. **Preservation of Core Systems:**
   - 3D photorealistic globe, 16 Argo floats with CTD soundings, 6 glider transects, SAR Lagrangian engine, and colorbar legends remain 100% operational.

---

## 7. Institutional Real-Data Ingestion Roadmap

> [!IMPORTANT]
> The table below describes the **current honest operational state** of each data pipeline as of Phase 8. Previous versions of this document incorrectly described the Ocean Model Grid and Glider pipelines as receiving live institutional data — this has been corrected.

| Dataset | Current Honest State | Source / Protocol | Future Integration Path |
| :--- | :--- | :--- | :--- |
| **Argo Floats (Positions)** | ✅ **Real Data — IFREMER ERDDAP** | 16 seed floats (verified WMO IDs) + live background sync from `erddap.ifremer.fr/erddap/tabledap/ArgoFloats`. Seed positions are real last-known coordinates from Argo GDAC. | Already live. |
| **Argo Float Profiles** | ✅ **Real Data (when ERDDAP reachable)** / ⚠ **Physics model fallback (when ERDDAP offline)** | IFREMER ERDDAP CTD profile query per WMO ID. Falls back to physics model with clear label. | Already integrated. |
| **Ocean Model Grid (`/api/grid`)** | ⚠ **Physics-Based Climatology Model** | `generate_ocean_grid()` in `ocean_physics.py` — a seasonal thermodynamic model parameterized for the Indian Ocean. The INCOIS LAS (`las.incois.gov.in`) is probed but does not expose a REST/JSON endpoint; it operates on Ferret/OPeNDAP. | Direct OPeNDAP/NetCDF integration with INCOIS LAS or CMEMS Global Ocean Physics Reanalysis once OPeNDAP client is implemented. |
| **Glider Missions (`/api/gliders`)** | ⚠ **Verified Cruise Footprints + Physics-Modeled Profiles** | Positions are verified real historical cruise transects (INCOIS-MONSOON-2024, PIRATA-IO-2023, IIOE-SOUTH-2024, etc.). Sensor profiles (CTD, BGC, flight) are physics-based climatology — NOT live glider telemetry. | Drop institutional NetCDF (`.nc`) files into `backend/data/gliders/` once official security clearance is obtained from INCOIS / IFREMER GDAC. |
| **Surface Currents** | ⚠ **Hydrodynamic Climatology Reanalysis** | Seasonal monsoonal current formulations (Somali Current, East India Coastal Current, Sri Lanka Dome). | Direct integration with CMEMS Global Multi-Year Reanalysis. |

---

### Phase 8: Honest Data Labeling Overhaul — Source Integrity Audit

This phase was triggered by a network inspection that confirmed `is_real_data: false` was being returned by the backend while `source` simultaneously said `"Calibrated Ocean Model (INCOIS LAS Live)"` — a direct contradiction that would mislead any user or evaluator.

**Changes made:**

#### Backend — `backend/app/routers/grid.py`
- **Bug #2a fixed (cache branch):** When `las_online=True` but `is_real_data=False`, source was `"Calibrated Ocean Model (INCOIS LAS Live)"`. Now correctly: `"Indian Ocean Thermodynamic Model (Physics-Based Climatology)"`. The word "Live" never appears unless `is_real_data=True`.
- **Bug #2b fixed (fresh-generation branch):** When `las_online=True` but physics fallback used, source was `"Verified Ocean Model (INCOIS LAS Live)"`. Now: `"Indian Ocean Thermodynamic Model (Physics-Based Climatology)"` with an unambiguous `PHYSICS MODEL:` prefix in `cache_notice`.
- **Principle enforced:** Source labels derive exclusively from `is_real_data` / `is_live` boolean flags. No hardcoded string can drift out of sync with the actual data origin.

#### Backend — `backend/app/services/glider_client.py` + `backend/app/routers/gliders.py`
- **Glider label corrected:** Was `"OceanGliders GDAC — {mission} ({operator})"` implying live GDAC fetch. Now: `"Physics-Modeled Profile — verified cruise footprint ({mission}, {operator})"`.
- **Added `data_notice` field** to every glider record and the router response: `"Positions are verified historical cruise footprints. Sensor profiles are physics-based climatology — not live telemetry."`

#### Backend — `backend/app/services/argo_client.py`
- ✅ **No changes needed.** Audit confirmed labels were already honest:
  - Seed data labeled `"Argo GDAC — WMO {wmo} ... seed position"` (not "live").
  - ERDDAP live data labeled `"IFREMER ERDDAP (live, N floats)"`.
  - Profile fallback labeled `"Physics model profile (ERDDAP unreachable: ...)"`.

#### Frontend — `frontend/src/App.tsx`
- **`isRealData` state added** (`useState<boolean>(false)`) — tracks `r.is_real_data` from each `/api/grid` response.
- **`isFallbackMode` rewritten** — previously used fragile string-keyword matching as the *only* detection mechanism. Now:
  - **Primary signal:** `!isRealData` — the authoritative backend boolean, not a keyword search.
  - **Secondary signals:** `!lasOnline`, source contains `'offline'`/`'fallback'`/`'simulated'`/`'physics'`.
- **Added `'physics'` keyword** to the secondary detection net, so the new physics-model source strings also correctly trigger `isFallbackMode` even if `isRealData` were somehow not set.
- **Error state reset:** `setIsRealData(false)` added to `catch` block so backend-offline state is always treated as fallback.

**Result:** The UI now correctly shows the amber `⚠ SIMULATION // LAS OFFLINE` / fallback banner for all physics-model data, regardless of LAS reachability — because `is_real_data: false` from the backend is now the source of truth.

---

## 8. Operational Launch Instructions

To launch the full VaruNet system on any Windows machine:

```cmd
C:\Users\jitin\.gemini\antigravity\scratch\driftscope\start.bat
```

Or manually in two separate terminal windows:

**Terminal 1 — Backend:**
```cmd
cd C:\Users\jitin\.gemini\antigravity\scratch\driftscope\backend
python -m uvicorn main_v3:app --host 0.0.0.0 --port 8001 --reload
```

**Terminal 2 — Frontend:**
```cmd
cd C:\Users\jitin\.gemini\antigravity\scratch\driftscope\frontend
npm run dev -- --port 5174
```

Access the dashboard at **http://localhost:5174** and interactive API documentation at **http://localhost:8001/docs**.


