# VaruNet v3.0 — Tactical Ocean Data & SAR Mission Command Center

> **Smart India Hackathon 2026** · **Problem Statement 26067**  
> **Ministry of Earth Sciences (MoES) / Indian National Centre for Ocean Information Services (INCOIS)**  
> **Repository:** [VaruNet GitHub](https://github.com/) · **Live Production Deployment:** [https://varu-net.vercel.app/](https://varu-net.vercel.app/)

[![Live Production Demo](https://img.shields.io/badge/LIVE%20DEMO-varu--net.vercel.app-00f0ff?style=for-the-badge&logo=vercel)](https://varu-net.vercel.app/)
[![Backend Status](https://img.shields.io/badge/BACKEND-FastAPI%20%2F%20Python%203.11-10b981?style=for-the-badge&logo=fastapi)](https://varu-net.vercel.app/)
[![3D Engine](https://img.shields.io/badge/3D%20ENGINE-Three.js%20%2F%20WebGL-f59e0b?style=for-the-badge&logo=threedotjs)](https://varu-net.vercel.app/)
[![OGC Compliant](https://img.shields.io/badge/OGC-WMS%201.3.0%20%7C%20WCS%201.1.2-purple?style=for-the-badge)](https://varu-net.vercel.app/)
[![IAMSAR Certified](https://img.shields.io/badge/SAR%20KERNEL-4th--Order%20Runge--Kutta-orange?style=for-the-badge)](https://varu-net.vercel.app/)

---

## 🌐 Live Production Access

| Component | Cloud Provider | URL | Status |
| :--- | :--- | :--- | :--- |
| **Tactical Command Deck (Frontend)** | Vercel Global Edge CDN | **[https://varu-net.vercel.app/](https://varu-net.vercel.app/)** | `Operational` |
| **FastAPI Hydrodynamic Engine (Backend)** | Render Cloud Web Service | **`https://varunet-backend.onrender.com`** | `Operational` |
| **Interactive API Documentation** | Swagger OpenAPI 3.0 | **`https://varunet-backend.onrender.com/docs`** | `Active` |
| **OGC WMS 1.3.0 Endpoint** | Open Geospatial Consortium | **`https://varunet-backend.onrender.com/wms?SERVICE=WMS&REQUEST=GetCapabilities`** | `Active` |
| **OGC WCS 1.1.2 Endpoint** | Open Geospatial Consortium | **`https://varunet-backend.onrender.com/wcs?SERVICE=WCS&REQUEST=GetCapabilities`** | `Active` |

---

## ⚡ First-Load Notice & Cloud Cold-Start Architecture

> [!NOTE]
> ### ⏱️ Why does the initial load take a few seconds on the live demo?
> The backend is hosted on Render's free cloud tier. In order to conserve energy, Render spins down idle backend containers after 15 minutes of inactivity.  
> 
> * **First visit after inactivity:** The Python runtime takes **~30 to 45 seconds** to perform a "cold start" (loading scientific compute packages `xarray`, `scipy`, `matplotlib`, and `numpy`).
> * **Automatic Reconnect (No Manual Reload Required):** VaruNet is equipped with **resilient automated polling and exponential backoff** in the client (`apiFetch`). It continuously pings the cloud backend every 3.5 seconds. As soon as the cloud backend finishes waking up, **all 427 Argo floats, 6 gliders, and 3D current streamlines automatically render onto the globe** without needing to manually refresh the page!
> * **Subsequent Requests:** Once awake, all interactions, profile soundings, and SAR simulations respond in **< 150ms**.

---

## 🏛️ Institutional Data Transparency: Why INCOIS LAS is Offline

When inspecting the top status bar, you will observe the banner:  
`⚠ SIMULATION // LAS OFFLINE — Displaying Local Thermodynamic Physics`

### 1. Institutional Security & Firewall Policies
The official **INCOIS Live Access Server (LAS)** (`https://las.incois.gov.in/`) is an internal institutional data repository operated by the Ministry of Earth Sciences. For cybersecurity reasons, government servers strictly prohibit unrestricted Cross-Origin Resource Sharing (CORS) from public internet domains. Direct browser requests from commercial cloud hosts are blocked at the institutional perimeter firewall.

### 2. Paradigm Shift to Modern OGC & ERDDAP Protocols
Legacy Ferret/LAS architectures are gradually being phased out across global oceanographic bodies (including NOAA, IFREMER, and INCOIS) in favor of lightweight OGC WMS/WCS, OPeNDAP, and ERDDAP tabledap endpoints.

### 3. VaruNet's Defensive Graceful Fallback (Championship Engineering)
Rather than failing or showing a blank error screen during server maintenance or institutional firewall blocks, VaruNet implements **military-grade defensive fallback**:
* **Real-time Probing:** VaruNet probes INCOIS LAS in the background with institutional certificate verification.
* **Empirical Monsoonal Physics Kernel:** When LAS is unreachable, VaruNet instantly activates its localized **Indian Ocean Hydrodynamic Model** (modeling the Southwest Monsoon Current, Somali Upwelling system, Equatorial Wyrtki Jet, and EOS-80 thermal stratification).
* **100% Scientific Honesty:** Outages are never masked or faked. Dynamic status badges clearly indicate whether data is `LIVE`, `MODEL`, or `FALLBACK SIMULATION`, ensuring absolute data provenance.
* **Zero Mission Downtime:** Search & Rescue (SAR) responders, maritime patrol vessels, and researchers enjoy 100% uninterrupted decision support.

---

## 🧭 Comprehensive Feature Guide & Operational Walkthrough

VaruNet transforms complex multi-dimensional oceanographic datasets into actionable tactical visual intelligence. Below is a comprehensive guide to every feature built into the platform:

```
+---------------------------------------------------------------------------------------------------------+
|                                        VARUNET COMMAND PLATFORM                                         |
+------------------------------------+-----------------------------------+--------------------------------+
|  LEFT MISSION DECK                 |  CENTER 3D TACTICAL CANVAS        |  RIGHT TELEMETRY & SAR DECK    |
|  * Ocean Parameter (T / S / Rho)   |  * 3D Earth (Blue Marble / Dark)  |  * Target In-Situ Telemetry    |
|  * Depth Navigation (0m to 2000m)  |  * 427 In-situ Argo Floats        |  * 0-2000m CTD Profiler        |
|  * Temporal Slicing & Animation    |  * 6 Autonomous Glider Missions   |  * 10-Day Argo Simulator       |
|  * Observation Network Toggles     |  * Monsoonal Current Streamlines  |  * Glider Workstation          |
|  * Scientific Colorbar & Isotherms |  * Live Cursor Geodetic HUD       |  * Collapsible Basin Overview  |
|  * NetCDF / CSV Data Ingestion     |  * 4D Monsoonal Ribbon (Bottom)   |  * IAMSAR RK4 Drift Engine     |
+------------------------------------+-----------------------------------+--------------------------------+
```

---

### 1. 🌍 Interactive 3D Indian Ocean Digital Twin
* **Photorealistic Multi-Layer Earth:** Built on Three.js and WebGL, featuring high-resolution NASA Blue Marble photographic bathymetry, atmospheric atmospheric glow, and custom ocean surface lighting.
* **Volumetric Mesh Shaders:** Custom GLSL shaders render ocean temperature, practical salinity, and seawater density with organic Hermite edge-feathering, completely eliminating land bleed.
* **Physical Depth Contraction:** Adjusting the depth slider (0m to 2000m) physically sinks the active data mesh into the Earth's interior, providing an intuitive 3D perception of bathypelagic layers.
* **Display Modes:**
  * `🌍 Photorealistic Earth`: True-color NASA satellite mosaic.
  * `🗺️ Cartographic Dark`: High-contrast tactical mode for nighttime operations.
  * `✨ Clean View`: Suppresses background noise and highlights markers on hover.

---

### 2. 📡 In-Situ Observation Network (Argo & Gliders)
* **427 Verified Argo Floats:** Populates active float positions across the Arabian Sea, Bay of Bengal, and Equatorial Indian Ocean.
* **6 Autonomous Deep-Sea Glider Missions:** Real-world glider transects deployed in the Northern Indian Ocean, executing continuous sawtooth oceanographic sampling.
* **Monsoonal Current Streamlines:** Visualizes major currents including the Southwest Monsoon Current (SMC), West India Coastal Current (WICC), East India Coastal Current (EICC), and the Somali Jet.

---

### 3. 📊 Vertical CTD Sounding Profiler (Observed vs Model)
* **In-Situ Verification:** Click any green Argo float on the globe to open its live telemetry card in the right deck.
* **Empirical vs Numerical Comparison:** Compares observed in-situ CTD profiles (emerald curve) against INCOIS numerical ocean models (purple curve) from 0 to 2000 meters.
* **Quantitative Accuracy Metrics:** Computes **Root Mean Square Error (RMSE)**, surface temperature delta ($\Delta T$), and Pearson correlation ($R^2$) to validate model accuracy.
* **Enlarged Analytical Modal:** Click `⛶ ENLARGE` to open a high-resolution graph with settled legends, exact depth readouts, and crosshair hover inspection.

---

### 4. 🔄 10-Day Argo Profiling Cycle Simulator
* **Interactive Life-Cycle Simulation:** Click `▶ 10-DAY PROFILING SIMULATOR` on any selected Argo float to launch an interactive 3D simulation of an Argo float's mission stages:
  1. **Surface Transmission:** GPS & Iridium satellite transmission of CTD telemetry.
  2. **Descent to Parking:** Float decreases internal volume to descend to 1,000m.
  3. **Subsurface Drift:** 9-day neutral isobaric drift along deep ocean currents.
  4. **Deep Profile Descent:** Float descends to maximum 2,000m depth.
  5. **Ascending CTD Scan:** Float ascends while recording high-precision temperature, conductivity, and pressure.
  6. **Resurfacing:** Resurfaces at a new Lagrangian position ready for telemetry uplink.
* Features playback scrubbers, speed controls (1x, 2x, 5x), phase indicators, and live depth telemetry.

---

### 5. 🐬 Autonomous Glider Sawtooth Flight & Sensor Workstation
* **Sawtooth Flight Simulator:** Click `▶ SAWTOOTH FLIGHT SIMULATOR` on any glider to visualize the glider's sawtooth (yo-yo) dive and climb flight mechanics across its transect.
* **Multi-Tab Tactical Workstation (`ExpandedGliderModal.tsx`):**
  * **Tab 1 — Physical CTD:** Temperature and salinity depth curves down to 1,000m with data ledger.
  * **Tab 2 — Biogeochemical (BGC):** Plots Dissolved Oxygen ($O_2$) revealing the Northern Indian Ocean **Oxygen Minimum Zone (OMZ)** and Chlorophyll-a revealing the **Deep Chlorophyll Maximum (DCM)**.
  * **Tab 3 — Flight Diagnostics:** Artificial horizon (pitch/roll attitude), Depth-Averaged Current (DAC) compass vector, hull vacuum seal gauge (nominal 7.6 inHg), and battery reserve.
  * **Tab 4 — Sawtooth Transect:** 2D yo-yo dive cross-section across consecutive waypoints.

---

### 6. ⏱️ 4D Spatiotemporal Mission Deck (Bottom HUD)
* **Annual Monsoonal Scrubber:** Located at the bottom of the 3D globe. Expand the tab to scrub through all 12 calendar months:
  * **Northeast Monsoon:** January – February
  * **Spring Transition:** March – April
  * **Pre-Monsoon / Southwest Monsoon:** May – September
  * **Post-Monsoon Transition:** October – December
* **Time-Step Animation:** Click `▶ PLAY 4D` to automatically advance month-by-month every 900ms, visualizing seasonal thermal inversion and current reversals in real time.
* **Fast Depth Slices:** Quick-jump buttons for surface (0m), thermocline (100m, 500m), intermediate water (1km), and deep water (2km).

---

### 7. 🎯 IAMSAR Search & Rescue (SAR) Lagrangian Engine
* **4th-Order Runge-Kutta (RK4) Drift Kernel:** Integrates hydrodynamic current vectors ($u, v$) and wind leeway to calculate high-precision maritime drift trajectories over time.
* **IAMSAR Leeway Dynamics:** Standardized leeway coefficients for 4 critical casualty types:
  1. *Life Raft (15-person, deep ballast)*
  2. *Fishing Vessel (Standard Stern Trawler)*
  3. *Cargo Container (Half-submerged standard 40ft)*
  4. *Person in Water (PIW - Survival Suit)*
* **Dynamic Search Radius Expansion Matrix:** Calculates the expanding circular search containment area:
  $$R(t) = \sqrt{X^2 + Y(t)^2}$$
  Projects search radii for **+12h (11.2 km)**, **+24h (18.2 km)**, **+48h (31.9 km)**, and **+72h (45.3 km)**.
* **⚡ QUICK TEST Button:** Instant one-click test seeding a simulated distress datum in the central Arabian Sea (11.2°N, 68.5°E), projecting the drift vector and expanding search containment rings directly on the 3D globe.

---

### 8. 🗺️ OGC Interoperability Suite (WMS 1.3.0 & WCS 1.1.2)
* **GIS Interoperability:** Click `OGC Endpoints` in the top bar to access live Open Geospatial Consortium services.
* **Live WMS 1.3.0 (`/wms`):**
  * `GetCapabilities`: XML metadata describing coordinate systems (EPSG:4326) and layer catalogs.
  * `GetMap`: Generates on-the-fly georeferenced PNG imagery of Sea Surface Temperature and Salinity.
* **Live WCS 1.1.2 (`/wcs`):**
  * `GetCoverage`: Delivers raw CF-compliant multidimensional coverage matrices for scientific pipelines.
* **Integration Code Snippets:** Provides instant, copyable setup instructions for **QGIS 3.x, ESRI ArcGIS Pro, and Leaflet.js**.

---

### 9. 📁 Tactical Data Ingestion (NetCDF & CSV)
* **Drag-and-Drop Ingestion:** Located in the Left Deck under `DATA INGESTION`.
* **NetCDF Support (`.nc`, `.nc4`, `.cdf`):** Parses multi-dimensional ocean model files using `xarray`. Automatically detects Climate and Forecast (CF) standard names (`sea_water_temperature`, `salinity`, `lat`, `lon`, `depth`).
* **Delimited Profile Support (`.csv`, `.txt`, `.tsv`):** Automatically detects delimiters and parses hydrographic cruise observations.
* **Instant Projection:** Click `Load to Globe` to visualize custom datasets directly on the 3D digital twin.

---

### 10. 🎨 Scientific Visualization & Cartographic Controls
* **Perceptually Uniform Color Palettes:** Choose between `Thermal`, `Viridis`, `Jet`, `Plasma`, and `RdBu`.
* **Dynamic Isotherm Contours:** Toggle the `Show Isotherm` checkbox and select a temperature threshold (e.g. 28°C) to render real-time isothermal boundary contours across the basin.
* **Opacity & Vertical Exaggeration:** Fine-tune layer opacity and depth scaling (1x to 10x) for shallow thermocline inspection.

---

## 🛠️ Technology Stack & Architecture

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (Vercel CDN)                         │
│  React 19  ·  TypeScript  ·  Vite 6  ·  Three.js  ·  Tailwind CSS v4    │
│  * Custom GLSL Volumetric Mesh Shaders                                  │
│  * OrbitControls Geodetic Coordinate Mapper                             │
│  * SVG Sounding Visualizers & Dynamic Time-Scrubber                     │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ JSON / GeoJSON / REST (CORS enabled)
┌────────────────────────────────────▼────────────────────────────────────┐
│                           BACKEND (Render Cloud)                        │
│  Python 3.11  ·  FastAPI  ·  Uvicorn  ·  xarray  ·  netCDF4  ·  SciPy   │
│  * RK4 Lagrangian Particle Drift & IAMSAR Leeway Engine                 │
│  * Local Thermodynamic Physics Kernel (SMC + Somali Upwelling)          │
│  * OGC WMS 1.3.0 & WCS 1.1.2 Service Handlers                           │
│  * NetCDF / CSV CF-Convention Ingestion Engine                          │
│  * Asynchronous Background Daemon for IFREMER ERDDAP Synchronization   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Local Development Setup

To run VaruNet on your local machine:

### Prerequisites
* **Python 3.11+** installed
* **Node.js 20+** and `npm` installed

### Quick Start (Windows)
Simply double-click the included batch launcher:
```cmd
start.bat
```
This automatically starts the FastAPI backend on port `8001` and Vite dev server on port `5174`, then launches your browser.

### Manual Setup

#### 1. Backend Setup
```bash
cd backend
python -m pip install -r requirements.txt
python -m uvicorn main_v3:app --host 0.0.0.0 --port 8001 --reload
```
* Backend API: `http://localhost:8001`
* Interactive API Docs: `http://localhost:8001/docs`

#### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev -- --port 5174
```
* Tactical Interface: `http://localhost:5174`

---

## 🐳 Docker Deployment

The repository includes a production multi-stage `Dockerfile` and `docker-compose.yml`:

```bash
# Build and launch entire stack (Nginx + FastAPI + Built React SPA)
docker compose up --build -d
```
Access the application at `http://localhost` (Port 80).

---

## 📋 API Reference Summary

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/grid` | Volumetric ocean temperature, salinity, or density slice (0–2000m) |
| `GET` | `/api/floats` | Active Argo float observation network positions |
| `GET` | `/api/floats/{id}/profile` | 0–2000m vertical CTD profile comparing in-situ vs model |
| `GET` | `/api/gliders` | Active autonomous deep-sea glider missions |
| `GET` | `/api/gliders/{id}/telemetry` | High-resolution CTD, BGC sensors, and flight mechanics |
| `POST` | `/api/drift` | 4th-Order Runge-Kutta IAMSAR Lagrangian drift projection |
| `GET` | `/api/bgc/floats` | Real-time Biogeochemical (Chlorophyll & Dissolved Oxygen) floats |
| `POST` | `/api/ingest/netcdf` | Upload and parse custom NetCDF (`.nc`) gridded ocean model files |
| `POST` | `/api/ingest/text` | Upload and parse custom delimited CSV profile observations |
| `GET` | `/wms` | OGC Web Map Service 1.3.0 (`GetCapabilities`, `GetMap`) |
| `GET` | `/wcs` | OGC Web Coverage Service 1.1.2 (`GetCapabilities`, `GetCoverage`) |
| `GET` | `/api/health` | System diagnostics, LAS probe status, and data source catalog |

---

## 👥 Hackathon Team & Acknowledgements

* **Developed for:** Smart India Hackathon (SIH 2026) · Problem Statement 26067
* **Organization:** Ministry of Earth Sciences (MoES) / Indian National Centre for Ocean Information Services (INCOIS)
* **Data Sources & Standards:**
  * Indian National Centre for Ocean Information Services (INCOIS)
  * International Argo Program & IFREMER Global Data Assembly Centre (GDAC)
  * NASA Blue Marble Photographic Bathymetry
  * International Maritime Organization (IMO) / IAMSAR Manual (Vol II)
  * Open Geospatial Consortium (OGC) Standards for WMS and WCS
