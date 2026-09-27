# VaruNet Tactical Ocean Command Deck — Frontend

> **React 19** · **TypeScript** · **Vite 6** · **Three.js / WebGL** · **Tailwind CSS v4**  
> **Team Lead:** **Jitin Kumar** ([@jkumar2-hub](https://github.com/jkumar2-hub))  
> **3D WebGL Lead (Member 2):** **Sophie Alveera Muskan** ([@Sophie-Ms](https://github.com/Sophie-Ms))  
> **Tactical UI/UX & Interoperability Lead (Member 3 & 6):** **Moulika** ([@moulika13612](https://github.com/moulika13612))

---

## 👥 Frontend Engineering Team & Deliverables

### 🎖️ Jitin Kumar — Team Lead & Full-Stack System Architect
* **Microservice Orchestration & Client Architecture (`api/client.ts`)**: Designed the resilient client API layer equipped with automated heartbeat polling and exponential backoff, ensuring seamless zero-reload recovery during cloud container cold starts.
* **Ground-Truthing Mathematics & Integration**: Defined the mathematical specifications for the SVG CTD profile co-location engine and statistical validation algorithms (RMSE, $\Delta T$, $R^2$).
* **Full-Stack End-to-End Alignment**: Maintained strict architectural compliance between frontend state models and backend FastAPI hydrodynamic schemas.

### 🌊 Sophie Alveera Muskan — 3D WebGL & Geospatial Visualization Lead (Member 2)
* **3D Volumetric Ocean Digital Twin (`OceanGlobe3D.tsx`, `proceduralEarth.ts`)**: Implemented browser-native **Three.js / WebGL** rendering of the Indian Ocean basin with dual-mode texturing (Photorealistic NASA Blue Marble bathymetry & High-contrast tactical dark mode).
* **Volumetric Mesh Shaders**: Developed custom **GLSL volumetric ocean shaders** with smooth Hermite edge-feathering to visualize Sea Surface Temperature (SST), Practical Salinity (PSU), and Potential Density ($\sigma_\theta$) with zero land bleed.
* **Physical Depth Contraction (0–2,000m)**: Built physical depth contraction mechanics, intuitively sinking the active data plane into the Earth's interior as depth increases to give operators true 3D bathypelagic depth perception.
* **Geodetic Raycaster HUD**: Integrated a 60 FPS raycasting HUD, displaying dynamic latitude, longitude, and physical ocean properties on cursor hover.
* **Dynamic Isotherm Contouring**: Created real-time isothermal boundary rings (e.g., 28°C threshold) rendered dynamically over active ocean fields.

### 🎛️ Moulika — Tactical UI/UX Workstations & Data Interoperability Lead (Member 3 & 6)
* **Tactical Command Deck Architecture (`App.tsx`, `TopBar.tsx`, `RightSidebar.tsx`)**: Engineered the military-grade dark command deck layout with frosted-glass aesthetic (`backdrop-blur-md`), collapsible side decks, and responsive multi-panel telemetry cards.
* **Top Status Bar & Operational Provenance**: Built the operational status bar with institutional data provenance badges (`LIVE`, `MODEL`, `FALLBACK SIMULATION`) and live LAS probe heartbeat indicators.
* **4D Spatiotemporal Mission HUD (`SpatiotemporalController.tsx`)**: Designed the expandable bottom ribbon with a 12-month monsoonal calendar scrubber and continuous **900ms time-step animation engine** to animate seasonal current reversals and thermal inversions.
* **Ground-Truthing CTD & Sensor Workstations (`ExpandedCTDModal.tsx`, `ExpandedGliderModal.tsx`)**: Implemented high-precision **SVG vertical CTD sounding visualizers** co-locating observed in-situ Argo float profiles (emerald curve) against numerical ocean models (purple curve), and built the 4-tab deep-sea glider workstation (OMZ/DCM detection and flight attitude).
* **3D Mission Life-Cycle Simulators (`ArgoSimulationModal.tsx`, `GliderSimulationModal.tsx`)**: Created interactive 3D simulations for the 10-day Argo profiling lifecycle and autonomous glider sawtooth yo-yo flight dynamics.
* **Data Ingestion & OGC GIS Suite (`DataIngestionPanel.tsx`, `OGCInspectorModal.tsx`)**: Built the drag-and-drop NetCDF and delimited CSV profile ingestion interface, along with the OGC WMS 1.3.0 and WCS 1.1.2 GIS inspector for defense networks.

---

## 📂 Frontend Directory Structure

```text
frontend/src/
├── api/
│   └── client.ts                   # Resilient API client with exponential backoff & failover
├── components/
│   ├── ArgoSimulationModal.tsx     # 3D 10-day Argo profiling lifecycle simulator
│   ├── BGCPanel.tsx                # Biogeochemical float monitoring panel
│   ├── ColorbarPanel.tsx           # Scientific color palette & isotherm contour controls
│   ├── DataIngestionPanel.tsx      # Drag-and-drop NetCDF / CSV file ingestion
│   ├── DataSourcesModal.tsx        # Institutional provenance & data catalog modal
│   ├── ExpandedCTDModal.tsx        # High-resolution dual-curve CTD sounder modal
│   ├── ExpandedGliderModal.tsx     # 4-tab autonomous glider sensor & flight workstation
│   ├── FloatProfilePanel.tsx       # Mini in-situ CTD profiler & telemetry card
│   ├── GliderSimulationModal.tsx   # 3D sawtooth yo-yo flight simulator
│   ├── OceanGlobe3D.tsx            # Three.js / WebGL 3D Indian Ocean digital twin
│   ├── OGCInspectorModal.tsx       # Live OGC WMS 1.3.0 & WCS 1.1.2 GIS inspector
│   ├── RightSidebar.tsx            # Telemetry, SAR search planner & profile deck
│   ├── SpatiotemporalController.tsx# 4D 12-month monsoonal calendar & playback HUD
│   └── TopBar.tsx                  # Command header with operational failover badges
├── utils/
│   └── proceduralEarth.ts          # Procedural texture generator for offline fallback
├── App.tsx                         # Core application state & tactical layout
├── index.css                       # Tailwind CSS v4 styling & dark theme variables
└── main.tsx                        # Application bootstrap
```

---

## 🛠️ Local Development

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Start Vite dev server
npm run dev -- --port 5174

# Production TypeScript build & bundle verification
npm run build
```
