# VaruNet Tactical Ocean Command Deck — Frontend

> **React 19** · **TypeScript** · **Vite 6** · **Three.js / WebGL** · **Tailwind CSS v4**  
> **Lead Frontend Engineer:** **Sophie Alveera Muskan** ([@Sophie-Ms](https://github.com/Sophie-Ms))

---

## 🌟 Lead Frontend Contributor: Sophie Alveera Muskan

**Sophie Alveera Muskan** led the frontend architecture, UI/UX design system, and 3D WebGL data visualization pipeline for VaruNet. Her core contributions include:

### 1. 🌍 3D Volumetric Ocean Digital Twin (`OceanGlobe3D.tsx`, `proceduralEarth.ts`)
* Implemented browser-native **Three.js / WebGL** rendering of the Indian Ocean basin with dual-mode texturing (Photorealistic NASA Blue Marble bathymetry & High-contrast tactical dark mode).
* Developed custom **GLSL volumetric ocean shaders** with smooth Hermite edge feathering to visualize Sea Surface Temperature (SST), Practical Salinity (PSU), and Potential Density ($\sigma_\theta$).
* Built **physical depth contraction mechanics (0–2,000m)**, intuitively sinking the active data plane into the Earth's interior as depth increases.
* Integrated **geodetic raycaster HUD**, displaying dynamic latitude, longitude, and physical property values on cursor hover.
* Created **dynamic isotherm contouring**, rendering real-time isothermal boundary rings (e.g., 28°C threshold) over active ocean fields.

### 2. 🎛️ Tactical Command Deck Architecture (`App.tsx`, `TopBar.tsx`, `RightSidebar.tsx`)
* Engineered the military-grade dark command deck layout with frosted-glass aesthetic (`backdrop-blur-md`), collapsible side decks, and responsive multi-panel telemetry cards.
* Built the **Top Status Bar** featuring institutional data provenance badges (`LIVE`, `MODEL`, `FALLBACK SIMULATION`) and live LAS probe heartbeat indicators.
* Designed the **Left Mission Deck**:
  * Physical ocean parameter selector (Temperature, Salinity, Density)
  * Dynamic depth navigation slider (0–2,000m) with vertical exaggeration controls (1x–10x)
  * Scientific color palette switcher (`Thermal`, `Viridis`, `Jet`, `Plasma`, `RdBu`) with SVG preview bars (`ColorbarPanel.tsx`)
  * Drag-and-drop NetCDF (`.nc`, `.nc4`) and delimited CSV profile ingestion interface (`DataIngestionPanel.tsx`)
  * Biogeochemical (BGC) floats telemetry monitor (`BGCPanel.tsx`)

### 3. ⏱️ 4D Spatiotemporal Mission HUD (`SpatiotemporalController.tsx`)
* Designed the expandable bottom ribbon featuring a 12-month monsoonal calendar scrubber (Northeast Monsoon, Spring Transition, Southwest Monsoon, Post-Monsoon).
* Built a continuous **900ms time-step animation engine**, allowing operators to watch annual thermal inversions and monsoonal current reversals unfold in real time.
* Added quick-jump depth presets for immediate surface (0m), thermocline (100m, 500m), and deep-sea (1km, 2km) analysis.

### 4. 📊 Ground-Truthing CTD & Sensor Workstations (`ExpandedCTDModal.tsx`, `ExpandedGliderModal.tsx`)
* Implemented high-precision **SVG vertical CTD sounding visualizers**, co-locating observed in-situ Argo float profiles (emerald curve) against numerical ocean models (purple curve).
* Integrated on-the-fly statistical validation metrics: **Root Mean Square Error (RMSE)**, surface temperature delta ($\Delta T$), and Pearson correlation ($R^2$).
* Built the **Multi-Tab Deep-Sea Glider Workstation**:
  * *Physical CTD*: Temperature and salinity sounding curves down to 1,000m depth.
  * *Biogeochemical (BGC)*: Dissolved Oxygen ($O_2$) revealing the Northern Indian Ocean Oxygen Minimum Zone (OMZ) and Chlorophyll-a detecting the Deep Chlorophyll Maximum (DCM).
  * *Flight Telemetry*: Artificial horizon (pitch/roll), Depth-Averaged Current (DAC) compass vector, hull vacuum seal gauge (7.6 inHg), and battery status.
  * *Sawtooth Transect*: 2D yo-yo dive-climb cross-section across mission waypoints.

### 5. 🔄 3D Mission Life-Cycle Simulators (`ArgoSimulationModal.tsx`, `GliderSimulationModal.tsx`)
* **10-Day Argo Profiling Simulator**: Created an interactive 3D multi-stage animation tracking an Argo float through satellite uplink, descent to 1,000m parking depth, 9-day neutral isobaric drift, 2,000m profile descent, ascending CTD scan, and surface recovery.
* **Glider Sawtooth Flight Simulator**: Implemented interactive 3D physics visualization of variable-buoyancy sawtooth propulsion with playback scrubbers and multi-speed controls (1x, 2x, 5x).

### 6. 🛡️ Resilient Client Data Layer (`src/api/client.ts`)
* Implemented robust automated polling with exponential backoff to handle free-tier cloud backend cold starts (30–45s) without requiring user page reloads.
* Seamlessly binds REST endpoints, OGC WMS/WCS services, and local simulation fallbacks.

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
