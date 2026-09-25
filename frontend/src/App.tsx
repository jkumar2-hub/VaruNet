/**
 * VaruNet — Tactical Ocean Data & SAR Mission Command Center
 * SIH 2026 | Problem Statement 26067
 * Ministry of Earth Sciences / INCOIS (Govt. of India)
 *
 * Fully wired, end-to-end prototype:
 * - Real in-situ Argo float network (16 WMO seed stations + ERDDAP background sync)
 * - Autonomous glider missions with multi-point transect tracks
 * - 4-step RK4 Lagrangian drift engine with IAMSAR leeway coefficients & datum radius
 * - Empirical CTD profiles (observed vs numerical model with RMSE validation)
 * - Dynamic 3D Indian Ocean canvas (NASA Blue Marble + water-only data mesh)
 */
import { useState, useEffect, useCallback } from 'react';
import {
  getGridData, getFloats, getGliders, getFloatProfile, getGliderTelemetry, simulateDrift,
  type GridResponse, type ArgoFloat, type GliderMission, type GliderTelemetry,
  type DriftWaypoint, type ProfileResponse,
} from './api/client';
import { OceanGlobe3D, type CurrentInfo, type GridData } from './components/OceanGlobe3D';
import { DataSourcesModal } from './components/DataSourcesModal';
import { ExpandedCTDModal } from './components/ExpandedCTDModal';
import { ExpandedGliderModal } from './components/ExpandedGliderModal';
import { ColorbarPanel, type ColorbBarSettings } from './components/ColorbarPanel';
import { DataIngestionPanel } from './components/DataIngestionPanel';
import { BGCPanel } from './components/BGCPanel';
import { ArgoSimulationModal } from './components/ArgoSimulationModal';
import { GliderSimulationModal } from './components/GliderSimulationModal';
import { OGCInspectorModal } from './components/OGCInspectorModal';
import { SpatiotemporalController } from './components/SpatiotemporalController';

// ─── Utilities ────────────────────────────────────────────────────────────────
function todayISO() {
  return new Date().toISOString().split('T')[0];
}

// ─── Dual UTC / IST Synchronized Clock ────────────────────────────────────────
function MissionClock() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const utcStr = now.toISOString().replace('T', ' ').substring(0, 19) + 'Z';
  const istStr = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(now);

  return (
    <div className="flex items-center gap-2.5 font-mono text-[11.5px] font-bold text-gray-300 whitespace-nowrap shrink-0 select-none">
      <div className="flex items-center gap-1 shrink-0 whitespace-nowrap">
        <span className="text-gray-500 font-black">UTC</span>
        <span className="text-cyan-300 font-bold">{utcStr.substring(11, 19)}</span>
      </div>
      <span className="text-gray-600 font-normal">|</span>
      <div className="flex items-center gap-1 shrink-0 whitespace-nowrap">
        <span className="text-gray-500 font-black">IST</span>
        <span className="text-emerald-300 font-bold">{istStr}</span>
      </div>
    </div>
  );
}

// ─── Precision Compact Scale Tube Legend (Right Side of 3D Globe Screen) ─────
// ─── Precision Dynamic Scale Tube Legend (Right Side of 3D Globe Screen) ─────
function ColorbarLegend({
  variable,
  settings,
}: {
  variable: string;
  settings?: ColorbBarSettings;
}) {
  const palettes = {
    Thermal: 'linear-gradient(to top, #020617 0%, #1e3a8a 20%, #0d9488 40%, #10b981 60%, #f59e0b 80%, #e11d48 100%)',
    Viridis: 'linear-gradient(to top, #440154 0%, #31688e 33%, #35b779 66%, #fde725 100%)',
    Jet: 'linear-gradient(to top, #00007f 0%, #0000ff 25%, #00ffff 50%, #ffff00 75%, #ff0000 100%)',
    Plasma: 'linear-gradient(to top, #0d0887 0%, #7e03a8 25%, #cc4778 50%, #f89441 75%, #f0f921 100%)',
    RdBu: 'linear-gradient(to top, #053061 0%, #2166ac 25%, #f7f7f7 50%, #d6604d 75%, #67001f 100%)',
  };

  const defaultRanges: Record<string, [number, number]> = {
    temperature: [2, 34],
    salinity: [28, 38],
    density: [1024, 1030],
  };
  const [defMin, defMax] = defaultRanges[variable] ?? [2, 34];
  const minV = settings?.vmin !== undefined ? settings.vmin : defMin;
  const maxV = (settings?.vmax !== undefined && settings.vmax > minV) ? settings.vmax : defMax;
  const unit = variable === 'temperature' ? '°C' : variable === 'salinity' ? 'PSU' : 'kg/m³';
  const tag = variable === 'temperature' ? '🌡️ SST' : variable === 'salinity' ? '🧂 SAL' : '⚖️ DEN';
  const paletteName = settings?.palette ?? 'Thermal';
  const gradient = palettes[paletteName] || palettes.Thermal;

  const range = maxV - minV || 1;
  const stops = [
    { pct: '100%', label: `${maxV.toFixed(1)}${variable === 'temperature' ? '°' : ''}` },
    { pct: '75%', label: `${(minV + range * 0.75).toFixed(1)}` },
    { pct: '50%', label: `${(minV + range * 0.50).toFixed(1)}` },
    { pct: '25%', label: `${(minV + range * 0.25).toFixed(1)}` },
    { pct: '0%', label: `${minV.toFixed(1)}${variable === 'temperature' ? '°' : ''}` },
  ];

  return (
    <div
      className="absolute top-3 right-3 z-20 flex flex-col items-center pointer-events-none select-none bg-[#070b14]/85 border border-[#00f0ff]/30 backdrop-blur-md px-2 py-1.5 rounded-lg shadow-xl"
      style={{ minWidth: '76px' }}
    >
      {/* Header Tag */}
      <div className="flex flex-col items-center mb-1 border-b border-white/10 pb-0.5 w-full">
        <span className="text-[10px] font-mono font-black text-cyan-300 tracking-wide flex items-center gap-1">
          {tag}
        </span>
        <span className="text-[8px] font-mono font-bold text-gray-400">
          [{unit}] · {paletteName.toUpperCase()}
        </span>
      </div>

      {/* Scale Fluid Tube with Notches and Numeric Labels */}
      <div className="flex items-center gap-1.5 relative h-32 my-0.5">
        {/* Numeric Ticks */}
        <div className="flex flex-col justify-between h-full text-[8.5px] font-mono text-gray-200 font-bold text-right pr-0.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
          {stops.map((s, idx) => (
            <div key={idx} className="flex items-center justify-end gap-1">
              <span>{s.label}</span>
              <span className="w-1.5 h-[1px] bg-white/50" />
            </div>
          ))}
        </div>

        {/* The Cylindrical Fluid Scale Tube */}
        <div className="relative w-2.5 h-full rounded-full border border-white/40 shadow-[0_0_12px_rgba(0,240,255,0.25)] overflow-hidden bg-black/60">
          <div
            className="w-full h-full"
            style={{ background: gradient }}
          />
          <div className="absolute inset-y-0 left-0.5 w-0.5 bg-white/40 blur-[0.5px] rounded-full pointer-events-none" />
          <div className="absolute inset-0 rounded-full shadow-[inset_0_1px_2px_rgba(0,0,0,0.6),inset_0_-1px_2px_rgba(0,0,0,0.6)] pointer-events-none" />
        </div>
      </div>

      {/* Footer Variable Name */}
      <div className="text-[7px] font-mono font-bold text-cyan-200/90 uppercase tracking-tight mt-1 text-center">
        {variable}
      </div>
    </div>
  );
}

// ─── High-Fidelity CTD Depth Profiler Chart ────────────────────────────────────
function CTDGraph({
  profile,
  variable,
  onExpand,
}: {
  profile: ProfileResponse;
  variable: string;
  onExpand?: () => void;
}) {
  const obs = variable === 'temperature' ? profile.observed_temp : profile.observed_salinity;
  const model = variable === 'temperature' ? profile.model_temp : profile.model_salinity;
  const rmse = variable === 'temperature' ? profile.rmse_temp : profile.rmse_salinity;
  const unit = variable === 'temperature' ? '°C' : 'PSU';
  const depths = profile.depth_levels;
  const hasRealObs = !profile.no_observation && obs !== null && obs.length > 0;

  if (!depths || !depths.length) {
    return (
      <div className="p-3 text-center text-gray-400 font-mono text-[11px] font-bold">
        No CTD soundings available for this float.
      </div>
    );
  }

  const W = 250;
  const H = 220;
  const pL = 38;
  const pR = 14;
  const pT = 16;
  const pB = 26;
  const plotW = W - pL - pR;
  const plotH = H - pT - pB;

  const maxD = Math.max(...depths, 1);
  const allV = hasRealObs
    ? [...(obs as number[]), ...model].filter(Number.isFinite)
    : [...model].filter(Number.isFinite);
  const minV = Math.min(...allV);
  const maxV = Math.max(...allV);
  const rangeV = maxV - minV || 1;

  const xS = (v: number) => pL + ((v - minV) / rangeV) * plotW;
  const yS = (d: number) => pT + (d / maxD) * plotH;

  const buildPath = (vals: number[]) =>
    vals.map((v, i) => `${i === 0 ? 'M' : 'L'}${xS(v).toFixed(1)},${yS(depths[i]).toFixed(1)}`).join(' ');

  const yTicks = [0, Math.round(maxD * 0.25), Math.round(maxD * 0.5), Math.round(maxD * 0.75), maxD];
  const xTicks = [minV, (minV + maxV) / 2, maxV].map((v) => Number(v.toFixed(1)));

  // Surface delta — only meaningful when we have a real observation
  const delta = (hasRealObs && (obs as number[])[0] !== undefined && model[0] !== undefined)
    ? Math.abs((obs as number[])[0] - model[0]).toFixed(2)
    : null;

  return (
    <div className="space-y-2 mt-2">
      {/* No-observation notice — shown when ERDDAP returned no real data */}
      {!hasRealObs && (
        <div className="flex items-start gap-1.5 bg-amber-950/40 border border-amber-500/50 rounded px-2.5 py-2 font-mono text-[10px] text-amber-300">
          <span className="shrink-0 font-black">⚠</span>
          <span>No real CTD observation available for this float. Showing physics model estimate only — comparison requires a live Argo sounding.</span>
        </div>
      )}

      {/* Metrics Row */}
      <div className={`grid gap-2 font-mono text-[11px] ${hasRealObs ? 'grid-cols-2' : 'grid-cols-1'}`}>
        <div className="bg-white/5 border border-white/15 rounded px-2.5 py-1.5">
          <div className="text-gray-400 text-[9.5px] font-black tracking-wider">ROOT MEAN SQ ERROR</div>
          <div className={`font-black text-[13px] ${
            rmse !== null && rmse < 0.5 ? 'text-emerald-400' :
            rmse !== null && rmse < 1.5 ? 'text-amber-400' : 'text-gray-500'
          }`}>
            {rmse !== null ? `±${rmse} ${unit}` : 'N/A — no observation'}
          </div>
        </div>
        {hasRealObs && delta !== null && (
          <div className="bg-white/5 border border-white/15 rounded px-2.5 py-1.5">
            <div className="text-gray-400 text-[9.5px] font-black tracking-wider">SURFACE DELTA Δ</div>
            <div className="text-cyan-300 font-black text-[13px]">{delta} {unit}</div>
          </div>
        )}
      </div>

      {/* SVG Plot (Clickable to enlarge on dashboard) */}
      <div
        onClick={onExpand}
        className="bg-[#050912] border-2 border-white/15 hover:border-[#00f0ff] rounded-lg p-2 cursor-pointer relative group transition-all"
        title="Click graph to enlarge on dashboard for high-resolution analysis"
      >
        {/* Hover Enlarge Badge */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-[#00f0ff]/20 text-[#00f0ff] text-[10px] font-mono font-black px-2 py-0.5 rounded border border-[#00f0ff] flex items-center gap-1 z-10">
          <span>⛶</span>
          <span>CLICK TO ENLARGE</span>
        </div>

        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="w-full">
          {/* Grid lines */}
          {yTicks.map((d) => (
            <line
              key={d}
              x1={pL}
              x2={W - pR}
              y1={yS(d)}
              y2={yS(d)}
              stroke="#ffffff18"
              strokeWidth={0.8}
            />
          ))}

          {/* Model Curve (Purple Dashed) */}
          <path
            d={buildPath(model)}
            fill="none"
            stroke="#C084FC"
            strokeWidth={2}
            strokeDasharray="4,2"
            opacity={0.9}
          />

          {/* Observed Curve (Emerald/Teal Solid) — only when real data is available */}
          {hasRealObs && (
            <path
              d={buildPath(obs as number[])}
              fill="none"
              stroke="#10B981"
              strokeWidth={2.5}
            />
          )}

          {/* Y-axis Ticks (Depth) */}
          {yTicks.map((d) => (
            <text
              key={d}
              x={pL - 4}
              y={yS(d) + 3.5}
              textAnchor="end"
              fontSize={9}
              fontWeight="bold"
              fill="#9ca3af"
              fontFamily="monospace"
            >
              {d}
            </text>
          ))}

          {/* X-axis Ticks (Value) */}
          {xTicks.map((v, i) => (
            <text
              key={i}
              x={xS(v)}
              y={H - pB + 14}
              textAnchor="middle"
              fontSize={9}
              fontWeight="bold"
              fill="#9ca3af"
              fontFamily="monospace"
            >
              {v}
            </text>
          ))}

          {/* Depth Axis Title */}
          <text
            x={10}
            y={pT + plotH / 2}
            textAnchor="middle"
            fontSize={8.5}
            fontWeight="bold"
            fill="#9ca3af"
            fontFamily="monospace"
            transform={`rotate(-90, 10, ${pT + plotH / 2})`}
          >
            depth (m)
          </text>

          {/* Value Axis Title */}
          <text
            x={W / 2}
            y={H - 2}
            textAnchor="middle"
            fontSize={8.5}
            fontWeight="bold"
            fill="#9ca3af"
            fontFamily="monospace"
          >
            {unit}
          </text>

          {/* Legend */}
          {hasRealObs && (
            <>
              <line x1={pL + 4} x2={pL + 20} y1={pT + 4} y2={pT + 4} stroke="#10B981" strokeWidth={2.5} />
              <text x={pL + 23} y={pT + 7.5} fontSize={9.5} fill="#10B981" fontFamily="monospace" fontWeight="bold">
                Observed
              </text>
              <line
                x1={pL + 84}
                x2={pL + 100}
                y1={pT + 4}
                y2={pT + 4}
                stroke="#C084FC"
                strokeWidth={2}
                strokeDasharray="3,2"
              />
              <text x={pL + 103} y={pT + 7.5} fontSize={9.5} fill="#C084FC" fontFamily="monospace" fontWeight="bold">
                Model
              </text>
            </>
          )}
          {!hasRealObs && (
            <>
              <line x1={pL + 4} x2={pL + 20} y1={pT + 4} y2={pT + 4} stroke="#C084FC" strokeWidth={2} strokeDasharray="3,2" />
              <text x={pL + 23} y={pT + 7.5} fontSize={9.5} fill="#C084FC" fontFamily="monospace" fontWeight="bold">
                Model estimate (no observation)
              </text>
            </>
          )}
        </svg>
      </div>

      <div
        onClick={onExpand}
        className="text-[10px] font-mono text-gray-300 hover:text-cyan-300 flex items-center justify-between px-1 cursor-pointer transition-colors font-bold"
        title="Click to enlarge"
      >
        <span>Levels: {depths.length} soundings</span>
        <span className="text-cyan-400 font-black flex items-center gap-1">
          <span>⛶</span>
          <span>CLICK TO ENLARGE</span>
        </span>
      </div>
    </div>
  );
}

// ─── Layer Toggle Row ─────────────────────────────────────────────────────────
function LayerToggle({
  active,
  onToggle,
  color,
  symbol,
  label,
  count,
}: {
  active: boolean;
  onToggle: () => void;
  color: 'emerald' | 'amber' | 'teal';
  symbol: string;
  label: string;
  count?: number;
}) {
  const styles = {
    emerald: {
      border: 'border-emerald-500/40',
      bg: 'bg-emerald-950/40',
      text: 'text-emerald-300',
      dot: 'bg-emerald-400',
      glow: 'shadow-[0_0_8px_rgba(52,211,153,0.6)]',
    },
    amber: {
      border: 'border-amber-500/40',
      bg: 'bg-amber-950/40',
      text: 'text-amber-300',
      dot: 'bg-amber-400',
      glow: 'shadow-[0_0_8px_rgba(251,191,36,0.6)]',
    },
    teal: {
      border: 'border-cyan-500/40',
      bg: 'bg-cyan-950/40',
      text: 'text-cyan-300',
      dot: 'bg-cyan-400',
      glow: 'shadow-[0_0_8px_rgba(34,211,238,0.6)]',
    },
  }[color];

  return (
    <button
      onClick={onToggle}
      className={`w-full flex items-center justify-between px-3 py-2.5 rounded text-[13px] font-mono border transition-all duration-200 ${
        active
          ? `${styles.border} ${styles.bg} ${styles.text} font-bold`
          : 'border-white/5 bg-white/[0.02] text-gray-400 hover:text-gray-200 hover:bg-white/[0.04] font-semibold'
      }`}
    >
      <div className="flex items-center gap-2">
        <span className={`w-2.5 h-2.5 rounded-full transition-all ${active ? `${styles.dot} ${styles.glow}` : 'bg-gray-700'}`} />
        <span className="font-bold">{symbol} {label}</span>
      </div>
      {count !== undefined && (
        <span className={`text-[12px] px-2 py-0.5 rounded font-black ${active ? 'bg-white/10 text-white' : 'text-gray-500'}`}>
          {count}
        </span>
      )}
    </button>
  );
}

// ─── Left Tactical Mission Controls ───────────────────────────────────────────
interface LeftDeckProps {
  variable: string;
  setVariable: (v: string) => void;
  depth: number;
  setDepth: (d: number) => void;
  timestamp: string;
  setTimestamp: (t: string) => void;
  showFloats: boolean;
  setShowFloats: (v: boolean) => void;
  showGliders: boolean;
  setShowGliders: (v: boolean) => void;
  showCurrentVectors: boolean;
  setShowCurrentVectors: (v: boolean) => void;
  floatCount: number;
  gliderCount: number;
  onOpenSources: () => void;
  cacheNotice: string | null;
  isFallbackMode?: boolean;
  // New PS features
  colorbarSettings: ColorbBarSettings;
  setColorbarSettings: (s: ColorbBarSettings) => void;
  animating: boolean;
  setAnimating: (v: boolean) => void;
  showIsoline: boolean;
  setShowIsoline: (v: boolean) => void;
  isolineTemp: number;
  setIsolineTemp: (v: number) => void;
  onGridLoaded: (data: any) => void;
  onProfilesLoaded: (data: any[]) => void;
}

function LeftDeck(p: LeftDeckProps) {
  const [temporalOpen, setTemporalOpen] = useState<boolean>(false);
  const [visControlsOpen, setVisControlsOpen] = useState<boolean>(false);
  const [bgcOpen, setBgcOpen] = useState<boolean>(false);
  const [ingestionOpen, setIngestionOpen] = useState<boolean>(false);

  return (
    <aside className="fixed left-0 top-11 h-[calc(100vh-2.75rem)] w-[320px] z-30 bg-[#070b14]/92 border-r border-[#00f0ff]/20 backdrop-blur-md overflow-y-auto shadow-2xl">
      <div className="p-4 space-y-4 text-white">
        {/* SECTION 1: VARIABLE SELECTOR */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-cyan-300 font-black uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              Ocean Parameter
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { id: 'temperature', label: 'Temp', unit: '°C' },
              { id: 'salinity', label: 'Salinity', unit: 'PSU' },
              { id: 'density', label: 'Density', unit: 'kg/m³' },
            ].map((v) => (
              <button
                key={v.id}
                onClick={() => p.setVariable(v.id)}
                className={`py-2 px-1.5 rounded text-center font-mono text-[12px] font-bold transition-all border ${
                  p.variable === v.id
                    ? 'bg-[#00f0ff]/20 border-[#00f0ff] text-[#00f0ff] font-black shadow-[0_0_12px_rgba(0,240,255,0.25)]'
                    : 'bg-white/5 border-white/10 text-gray-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <div>{v.label}</div>
                <div className="text-[10px] font-bold text-gray-400">{v.unit}</div>
              </button>
            ))}
          </div>
        </section>

        {/* SECTION 2: DEPTH SLIDER & PRESETS */}
        <section className="space-y-2 bg-white/[0.02] border border-white/10 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-emerald-300 font-black uppercase tracking-wider">
              Depth Slice
            </span>
            <span className="text-[14px] font-mono font-black text-emerald-300 bg-emerald-950/90 px-2.5 py-1 rounded border border-emerald-500/40">
              {p.depth} m
            </span>
          </div>

          <input
            type="range"
            min={0}
            max={2000}
            step={10}
            value={p.depth}
            onChange={(e) => p.setDepth(Number(e.target.value))}
            className="w-full accent-[#10B981] h-2 bg-gray-800 rounded-lg cursor-pointer"
          />

          {/* Fast depth level buttons */}
          <div className="grid grid-cols-5 gap-1.5 pt-0.5">
            {[
              { depth: 0, label: '0m' },
              { depth: 100, label: '100m' },
              { depth: 500, label: '500m' },
              { depth: 1000, label: '1km' },
              { depth: 2000, label: '2km' },
            ].map((d) => (
              <button
                key={d.depth}
                onClick={() => p.setDepth(d.depth)}
                className={`py-1.5 rounded text-[11px] font-mono font-black border transition-all ${
                  p.depth === d.depth
                    ? 'bg-emerald-500/25 border-emerald-400 text-emerald-300 font-black shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                    : 'bg-white/5 border-white/5 text-gray-400 hover:text-gray-200'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </section>

        {/* SECTION 3: TEMPORAL NAVIGATION & MONSOONAL REGIME (Collapsible Option) */}
        <section className="bg-white/[0.03] border border-white/10 rounded-lg overflow-hidden transition-all">
          <button
            onClick={() => setTemporalOpen(!temporalOpen)}
            className="w-full flex items-center justify-between p-3 bg-white/[0.02] hover:bg-white/[0.05] transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${p.animating ? 'bg-cyan-400 animate-ping' : 'bg-cyan-400'}`} />
              <span className="text-[11px] font-mono text-cyan-300 font-black uppercase tracking-wider">
                Temporal Slicing
              </span>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {!temporalOpen && (
                <span className="text-[9.5px] font-mono text-cyan-200/90 bg-cyan-950/70 border border-cyan-500/40 px-1.5 py-0.5 rounded font-bold">
                  {p.timestamp || todayISO()}
                </span>
              )}
              <span className="text-[10px] font-mono text-cyan-400 font-bold bg-cyan-950/80 border border-cyan-400/40 w-5 h-5 rounded flex items-center justify-center">
                {temporalOpen ? '▼' : '▶'}
              </span>
            </div>
          </button>

          {temporalOpen && (
            <div className="p-3 pt-1 space-y-2 border-t border-white/5">
              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] font-mono font-bold text-gray-400">HINDCAST / NRT</span>
                <button
                  onClick={() => p.setAnimating(!p.animating)}
                  title={p.animating ? 'Pause animation' : 'Play monthly animation'}
                  className={`text-[10px] font-mono font-black px-2 py-0.5 rounded border transition-all cursor-pointer ${p.animating ? 'bg-cyan-500/30 border-cyan-400 text-cyan-200 animate-pulse' : 'bg-white/5 border-white/20 text-gray-300 hover:text-cyan-300'}`}
                >
                  {p.animating ? '⏸ PAUSE' : '▶ PLAY'}
                </button>
              </div>

              <input
                type="date"
                value={p.timestamp}
                onChange={(e) => p.setTimestamp(e.target.value)}
                className="w-full bg-[#050810] border border-white/20 rounded px-3 py-2 text-[13px] font-mono font-bold text-cyan-300 focus:outline-none focus:border-[#00f0ff] [color-scheme:dark]"
              />

              {/* Quick seasonal preset buttons */}
              <div className="grid grid-cols-4 gap-1.5 pt-0.5">
                {[
                  { label: 'Today', date: todayISO() },
                  { label: 'Jul (SW)', date: '2026-07-15' },
                  { label: 'Jan (NE)', date: '2026-01-15' },
                  { label: 'Apr (Jet)', date: '2026-04-15' },
                ].map((btn) => (
                  <button
                    key={btn.label}
                    onClick={() => p.setTimestamp(btn.date)}
                    className={`py-1.5 px-0.5 rounded text-[11px] font-mono font-black border transition-all truncate cursor-pointer ${
                      p.timestamp === btn.date
                        ? 'bg-cyan-500/25 border-cyan-400 text-cyan-300 font-black shadow-[0_0_8px_rgba(0,240,255,0.3)]'
                        : 'bg-white/5 border-white/5 text-gray-300 hover:text-white'
                    }`}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>

              {/* Seasonal Regime Indicator */}
              {(() => {
                let m = 7;
                if (p.timestamp) {
                  const parts = p.timestamp.split('-');
                  if (parts.length >= 2) m = parseInt(parts[1], 10) || 7;
                }
                if (6 <= m && m <= 9) {
                  return (
                    <div className="p-2 rounded bg-amber-950/40 border border-amber-500/40 text-[10px] font-mono space-y-1">
                      <div className="text-amber-300 font-black text-[11px] flex items-center gap-1">
                        <span>☀️</span>
                        <span>SW MONSOON (SUMMER)</span>
                      </div>
                      <div className="text-gray-300 text-[10px] font-semibold leading-snug">
                        Somali current: Northward (+0.85 m/s) · Upwelling active · Strong NE drift
                      </div>
                    </div>
                  );
                }
                if (m <= 2 || m >= 11) {
                  return (
                    <div className="p-2 rounded bg-cyan-950/40 border border-cyan-500/40 text-[10px] font-mono space-y-1">
                      <div className="text-cyan-300 font-black text-[11px] flex items-center gap-1">
                        <span>❄️</span>
                        <span>NE MONSOON (WINTER)</span>
                      </div>
                      <div className="text-gray-300 text-[10px] font-semibold leading-snug">
                        Somali current: REVERSED Southward (-0.40 m/s) · Cooler SST · SW drift
                      </div>
                    </div>
                  );
                }
                return (
                  <div className="p-2 rounded bg-emerald-950/40 border border-emerald-500/40 text-[10px] font-mono space-y-1">
                    <div className="text-emerald-300 font-black text-[11px] flex items-center gap-1">
                      <span>🌊</span>
                      <span>INTER-MONSOON TRANSITION</span>
                    </div>
                    <div className="text-gray-300 text-[10px] font-semibold leading-snug">
                      Equatorial Wyrtki Jet active (+0.85 m/s eastward) · Warm pool peak
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </section>

        {/* SECTION 4: OBSERVATION LAYERS */}
        <section className="space-y-2">
          <span className="text-[11px] font-mono text-cyan-300 font-black uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            Observation Network
          </span>
          <div className="space-y-1.5">
            <LayerToggle
              active={p.showFloats}
              onToggle={() => p.setShowFloats(!p.showFloats)}
              color="emerald"
              symbol="◉"
              label="Argo CTD Floats"
              count={p.floatCount}
            />
            <LayerToggle
              active={p.showGliders}
              onToggle={() => p.setShowGliders(!p.showGliders)}
              color="amber"
              symbol="◆"
              label="Deep Sea Gliders"
              count={p.gliderCount}
            />
            <LayerToggle
              active={p.showCurrentVectors}
              onToggle={() => p.setShowCurrentVectors(!p.showCurrentVectors)}
              color="teal"
              symbol="〰"
              label="Monsoonal Currents"
            />
          </div>
        </section>

        {/* Cache / System Notice */}
        {p.cacheNotice && (
          <div className={`p-3 rounded border text-[11px] font-mono leading-relaxed shadow-lg ${
            p.isFallbackMode
              ? 'bg-[#1e0e02]/95 border-amber-500 text-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
              : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
          }`}>
            <div className="flex items-center gap-1.5 font-black text-[11px] mb-1">
              <span className={`w-2 h-2 rounded-full ${p.isFallbackMode ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`} />
              <span className={p.isFallbackMode ? 'text-amber-300' : 'text-emerald-300'}>
                {p.isFallbackMode ? '⚠ FALLBACK SIMULATION ACTIVE' : '✓ LIVE DATA SOURCE'}
              </span>
            </div>
            {p.cacheNotice}
          </div>
        )}

        {/* SECTION 5: VISUALIZATION CONTROLS (Collapsible Option) */}
        <section className="bg-white/[0.03] border border-white/10 rounded-lg overflow-hidden transition-all">
          <button
            onClick={() => setVisControlsOpen(!visControlsOpen)}
            className="w-full flex items-center justify-between p-3 bg-white/[0.02] hover:bg-white/[0.05] transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-400" />
              <span className="text-[11px] font-mono text-purple-300 font-black uppercase tracking-wider">
                Visualization Controls
              </span>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {!visControlsOpen && (
                <span className="text-[9.5px] font-mono text-purple-200/90 bg-purple-950/70 border border-purple-500/40 px-1.5 py-0.5 rounded font-bold">
                  {p.colorbarSettings.palette}
                </span>
              )}
              <span className="text-[10px] font-mono text-purple-400 font-bold bg-purple-950/80 border border-purple-400/40 w-5 h-5 rounded flex items-center justify-center">
                {visControlsOpen ? '▼' : '▶'}
              </span>
            </div>
          </button>

          {visControlsOpen && (
            <div className="p-3 pt-1 space-y-2 border-t border-white/5">
              <ColorbarPanel settings={p.colorbarSettings} variable={p.variable} onChange={p.setColorbarSettings} />
              {/* Isoline toggle */}
              <div className="flex items-center justify-between pt-2 border-t border-white/10">
                <label className="flex items-center gap-2 cursor-pointer text-[11px] font-mono text-gray-300">
                  <input
                    type="checkbox"
                    checked={p.showIsoline}
                    onChange={(e) => p.setShowIsoline(e.target.checked)}
                    className="accent-[#00f0ff] w-3 h-3"
                  />
                  Show Isotherm
                </label>
                {p.showIsoline && (
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={p.isolineTemp}
                      min={0} max={35} step={1}
                      onChange={(e) => p.setIsolineTemp(Number(e.target.value))}
                      className="w-14 bg-black/50 border border-white/20 rounded px-1.5 py-0.5 text-[11px] font-mono text-cyan-300 outline-none"
                    />
                    <span className="text-[10px] text-gray-400 font-mono">°C</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* SECTION 6: BGC DATA (Collapsible Option) */}
        <section className="bg-white/[0.03] border border-white/10 rounded-lg overflow-hidden transition-all">
          <button
            onClick={() => setBgcOpen(!bgcOpen)}
            className="w-full flex items-center justify-between p-3 bg-white/[0.02] hover:bg-white/[0.05] transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-400" />
              <span className="text-[11px] font-mono text-orange-300 font-black uppercase tracking-wider">
                BGC Floats
              </span>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {!bgcOpen && (
                <span className="text-[9.5px] font-mono text-orange-200/90 bg-orange-950/70 border border-orange-500/40 px-1.5 py-0.5 rounded font-bold">
                  CHLA · DOXY
                </span>
              )}
              <span className="text-[10px] font-mono text-orange-400 font-bold bg-orange-950/80 border border-orange-400/40 w-5 h-5 rounded flex items-center justify-center">
                {bgcOpen ? '▼' : '▶'}
              </span>
            </div>
          </button>

          {bgcOpen && (
            <div className="p-3 pt-1 border-t border-white/5">
              <BGCPanel />
            </div>
          )}
        </section>

        {/* SECTION 7: DATA INGESTION (Collapsible Option) */}
        <section className="bg-white/[0.03] border border-white/10 rounded-lg overflow-hidden transition-all">
          <button
            onClick={() => setIngestionOpen(!ingestionOpen)}
            className="w-full flex items-center justify-between p-3 bg-white/[0.02] hover:bg-white/[0.05] transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-teal-400" />
              <span className="text-[11px] font-mono text-teal-300 font-black uppercase tracking-wider">
                Data Ingestion
              </span>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {!ingestionOpen && (
                <span className="text-[9.5px] font-mono text-teal-200/90 bg-teal-950/70 border border-teal-500/40 px-1.5 py-0.5 rounded font-bold">
                  NetCDF / CSV
                </span>
              )}
              <span className="text-[10px] font-mono text-teal-400 font-bold bg-teal-950/80 border border-teal-400/40 w-5 h-5 rounded flex items-center justify-center">
                {ingestionOpen ? '▼' : '▶'}
              </span>
            </div>
          </button>

          {ingestionOpen && (
            <div className="p-3 pt-1 border-t border-white/5">
              <DataIngestionPanel onGridLoaded={p.onGridLoaded} onProfilesLoaded={p.onProfilesLoaded} />
            </div>
          )}
        </section>
      </div>

      {/* Footer */}
      <div className="p-3.5 border-t border-white/10 bg-[#050810] flex items-center justify-between text-[11px] font-mono font-bold text-gray-400">
        <span>INCOIS • MoES Govt of India</span>
        <button
          onClick={p.onOpenSources}
          className="text-cyan-400 hover:text-cyan-300 transition-colors underline font-bold"
        >
          Sources ↗
        </button>
      </div>
    </aside>
  );
}

// ─── Right Telemetry & SAR Mission Deck ───────────────────────────────────────
interface RightDeckProps {
  selectedFloat: ArgoFloat | null;
  selectedGlider: GliderMission | null;
  selectedCurrent: CurrentInfo | null;
  profile: ProfileResponse | null;
  profileLoading: boolean;
  variable: string;
  onDeselect: () => void;
  onExpandGraph?: () => void;
  gliderTelemetry?: GliderTelemetry | null;
  gliderLoading?: boolean;
  onExpandGlider?: () => void;
  driftMode: boolean;
  setDriftMode: (v: boolean) => void;
  objectType: string;
  setObjectType: (v: string) => void;
  forecastHours: number;
  setForecastHours: (v: number) => void;
  driftPath: DriftWaypoint[];
  onClearDrift: () => void;
  driftOrigin: { lat: number; lon: number } | null;
  isSimulating: boolean;
  onRunDemoDrift: () => void;
  onOpenArgoSim?: (float: ArgoFloat) => void;
  onOpenGliderSim?: (glider: GliderMission) => void;
}

function RightDeck({
  selectedFloat,
  selectedGlider,
  selectedCurrent,
  profile,
  profileLoading,
  variable,
  onDeselect,
  onExpandGraph,
  gliderTelemetry,
  gliderLoading,
  onExpandGlider,
  driftMode,
  setDriftMode,
  objectType,
  setObjectType,
  forecastHours,
  setForecastHours,
  driftPath,
  onClearDrift,
  driftOrigin: _driftOrigin,
  isSimulating,
  onRunDemoDrift,
  onOpenArgoSim,
  onOpenGliderSim,
}: RightDeckProps) {
  const hasSelection = Boolean(selectedFloat || selectedGlider || selectedCurrent);
  const [overviewOpen, setOverviewOpen] = useState<boolean>(false);

  return (
    <aside className="fixed right-0 top-11 h-[calc(100vh-2.75rem)] w-[360px] z-30 bg-[#070b14]/92 border-l border-[#00f0ff]/20 backdrop-blur-md overflow-y-auto shadow-2xl">
      <div className="p-4 space-y-4 text-white">
      {/* Target Telemetry Card: Argo Float */}
      {selectedFloat && (
        <section className="bg-white/[0.02] border border-emerald-500/40 rounded-lg p-3.5 space-y-2.5">
          <div className="flex items-center justify-between pb-1.5 border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#10B981]" />
              <span className="text-[14px] font-black font-mono text-emerald-300">
                WMO {selectedFloat.wmo_id}
              </span>
            </div>
            <button
              onClick={onDeselect}
              className="text-[11px] font-mono font-black text-gray-400 hover:text-white px-2 py-0.5 rounded hover:bg-white/10"
            >
              ✕ CLOSE
            </button>
          </div>

          {/* Launch Argo Profiling Cycle Simulation */}
          <button
            onClick={() => onOpenArgoSim?.(selectedFloat)}
            className="w-full py-1.5 px-3 rounded-lg bg-gradient-to-r from-cyan-600/30 to-emerald-600/30 border border-cyan-400/80 hover:brightness-125 text-cyan-200 font-mono text-[11px] font-black transition-all flex items-center justify-center gap-2 shadow-[0_0_12px_rgba(0,240,255,0.25)]"
          >
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>▶ 10-DAY PROFILING SIMULATOR</span>
          </button>

          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
            <div className="bg-white/5 p-2 rounded">
              <span className="text-gray-400 block text-[9.5px] font-bold">COORDINATES</span>
              <span className="text-gray-100 font-bold text-[12px]">
                {selectedFloat.lat.toFixed(2)}°N, {selectedFloat.lon.toFixed(2)}°E
              </span>
            </div>
            <div className="bg-white/5 p-2 rounded">
              <span className="text-gray-400 block text-[9.5px] font-bold">PLATFORM</span>
              <span className="text-emerald-400 font-black text-[12px]">{selectedFloat.platform_type}</span>
            </div>
            <div className="bg-white/5 p-2 rounded">
              <span className="text-gray-400 block text-[9.5px] font-bold">IN-SITU TEMP</span>
              <span className="text-cyan-300 font-black text-[13px]">{selectedFloat.temp} °C</span>
            </div>
            <div className="bg-white/5 p-2 rounded">
              <span className="text-gray-400 block text-[9.5px] font-bold">PRACTICAL SALINITY</span>
              <span className="text-purple-300 font-black text-[13px]">{selectedFloat.salinity} PSU</span>
            </div>
          </div>

          {/* Profile Section */}
          <div className="pt-1">
            <div className="flex items-center justify-between text-[11px] font-mono text-cyan-300 font-black">
              <span>CTD VERTICAL PROFILE (0–2000m)</span>
              {profileLoading ? (
                <span className="animate-pulse text-amber-400 font-bold">SYNCING...</span>
              ) : (
                profile && (
                  <button
                    onClick={onExpandGraph}
                    className="text-[10px] font-mono text-cyan-300 hover:text-cyan-100 flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/40 hover:border-cyan-400 transition-colors font-bold"
                    title="Enlarge graph on dashboard"
                  >
                    <span>⛶</span>
                    <span>ENLARGE</span>
                  </button>
                )
              )}
            </div>
            {!profileLoading && profile && (
              <CTDGraph profile={profile} variable={variable} onExpand={onExpandGraph} />
            )}
          </div>
        </section>
      )}

      {/* Target Telemetry Card: Deep Sea Glider */}
      {selectedGlider && (
        <section className="bg-white/[0.02] border border-amber-500/40 rounded-lg p-3.5 space-y-2.5">
          <div className="flex items-center justify-between pb-1.5 border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_#F59E0B]" />
              <span className="text-[14px] font-black font-mono text-amber-300">
                {selectedGlider.glider_id}
              </span>
            </div>
            <button
              onClick={onDeselect}
              className="text-[11px] font-mono font-black text-gray-400 hover:text-white px-2 py-0.5 rounded hover:bg-white/10"
            >
              ✕ CLOSE
            </button>
          </div>

          {/* Launch Glider Sawtooth Flight Simulation */}
          <button
            onClick={() => onOpenGliderSim?.(selectedGlider)}
            className="w-full py-1.5 px-3 rounded-lg bg-gradient-to-r from-amber-600/30 to-yellow-600/30 border border-amber-400/80 hover:brightness-125 text-amber-200 font-mono text-[11px] font-black transition-all flex items-center justify-center gap-2 shadow-[0_0_12px_rgba(245,158,11,0.25)]"
          >
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span>▶ SAWTOOTH FLIGHT SIMULATOR</span>
          </button>

          <div className="text-[11px] font-mono text-gray-300 space-y-1">
            <div className="text-amber-400 font-bold text-[12px]">{selectedGlider.mission}</div>
            <div className="text-gray-300 text-[10.5px] font-semibold">Operator: {selectedGlider.operator}</div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
            <div className="bg-white/5 p-2 rounded">
              <span className="text-gray-400 block text-[9.5px] font-bold">POSITION</span>
              <span className="text-gray-100 font-bold text-[12px]">
                {selectedGlider.lat.toFixed(2)}°N, {selectedGlider.lon.toFixed(2)}°E
              </span>
            </div>
            <div className="bg-white/5 p-2 rounded">
              <span className="text-gray-400 block text-[9.5px] font-bold">MAX DIVE DEPTH</span>
              <span className="text-amber-300 font-black text-[13px]">{selectedGlider.depth_max} m</span>
            </div>
            <div className="bg-white/5 p-2 rounded">
              <span className="text-gray-400 block text-[9.5px] font-bold">BATTERY STATUS</span>
              <span className="text-emerald-400 font-black text-[13px]">{selectedGlider.battery_pct}%</span>
            </div>
            <div className="bg-white/5 p-2 rounded">
              <span className="text-gray-400 block text-[9.5px] font-bold">TRANSECT WAYPOINTS</span>
              <span className="text-cyan-300 font-black text-[13px]">{selectedGlider.transect.length} PTS</span>
            </div>
          </div>

          {/* Live Sensor & Telemetry Metrics */}
          {gliderLoading ? (
            <div className="p-3 rounded bg-amber-950/20 border border-amber-500/20 text-center text-xs font-mono text-amber-300/80 animate-pulse">
              SYNCING SENSOR TELEMETRY...
            </div>
          ) : gliderTelemetry ? (
            <div className="space-y-2 pt-1 border-t border-white/5">
              <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono">
                <div className="bg-[#0b1322] border border-cyan-500/30 p-1.5 rounded">
                  <span className="text-gray-400 block text-[9px]">DISSOLVED O₂</span>
                  <span className="text-cyan-300 font-bold text-[11px]">
                    {gliderTelemetry.dissolved_oxygen_umol_kg[0]} µmol/kg
                  </span>
                </div>
                <div className="bg-[#0b1322] border border-emerald-500/30 p-1.5 rounded">
                  <span className="text-gray-400 block text-[9px]">CHLOROPHYLL-A</span>
                  <span className="text-emerald-300 font-bold text-[11px]">
                    {Math.max(...gliderTelemetry.chlorophyll_a_ug_l)} µg/L (DCM)
                  </span>
                </div>
                <div className="bg-[#0b1322] border border-cyan-500/30 p-1.5 rounded">
                  <span className="text-gray-400 block text-[9px]">DAC CURRENT</span>
                  <span className="text-cyan-300 font-bold text-[11px]">
                    {gliderTelemetry.dac_speed_kts} kts @ {gliderTelemetry.dac_heading_deg}°
                  </span>
                </div>
                <div className="bg-[#0b1322] border border-emerald-500/30 p-1.5 rounded">
                  <span className="text-gray-400 block text-[9px]">HULL VACUUM</span>
                  <span className="text-emerald-300 font-bold text-[11px]">
                    {gliderTelemetry.internal_vacuum_inhg} inHg [NOMINAL]
                  </span>
                </div>
              </div>

              <button
                onClick={onExpandGlider}
                className="w-full py-2 px-3 rounded-lg bg-gradient-to-r from-amber-500/20 via-amber-500/30 to-amber-500/20 hover:from-amber-500/30 hover:to-amber-500/40 border border-amber-500/50 text-amber-300 hover:text-white font-mono text-[11px] font-black tracking-wider transition-all shadow-[0_0_15px_rgba(245,158,11,0.2)] flex items-center justify-center gap-1.5"
              >
                <span>🔍 OPEN GLIDER MISSION & SENSORS</span>
              </button>
            </div>
          ) : null}

          <div className="bg-amber-950/40 border border-amber-500/30 rounded p-2.5 text-[10.5px] font-mono text-amber-200/90 leading-relaxed font-semibold">
            {selectedGlider.data_source}
          </div>
        </section>
      )}

      {/* Target Telemetry Card: Monsoonal Current */}
      {selectedCurrent && (
        <section className="bg-white/[0.02] border border-teal-500/40 rounded-lg p-3.5 space-y-2.5">
          <div className="flex items-center justify-between pb-1.5 border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-400 shadow-[0_0_8px_#2DD4BF] animate-pulse" />
              <span className="text-[13.5px] font-black font-mono text-teal-300 truncate max-w-[210px]">
                {selectedCurrent.name}
              </span>
            </div>
            <button
              onClick={onDeselect}
              className="text-[11px] font-mono font-black text-gray-400 hover:text-white px-2 py-0.5 rounded hover:bg-white/10"
            >
              ✕ CLOSE
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
            <div className="bg-white/5 p-2 rounded">
              <span className="text-gray-400 block text-[9.5px] font-bold">VELOCITY</span>
              <span className="text-teal-300 font-black text-[13px]">{selectedCurrent.velocity}</span>
            </div>
            <div className="bg-white/5 p-2 rounded">
              <span className="text-gray-400 block text-[9.5px] font-bold">DEPTH INFLUENCE</span>
              <span className="text-white font-bold text-[12px]">{selectedCurrent.depthRange}</span>
            </div>
            <div className="bg-white/5 p-2 rounded col-span-2">
              <span className="text-gray-400 block text-[9.5px] font-bold">FLOW VECTOR</span>
              <span className="text-gray-100 font-bold text-[11.5px]">{selectedCurrent.direction}</span>
            </div>
          </div>

          <div className="bg-teal-950/40 border border-teal-500/30 rounded p-2.5 text-[10.5px] font-mono text-teal-200/90 leading-relaxed font-semibold">
            {selectedCurrent.dynamics}
          </div>
        </section>
      )}

      {/* Standby notice when nothing is selected */}
      {!hasSelection && (
        <section className="bg-white/[0.02] border border-white/10 rounded-lg p-3 text-[11px] font-mono text-gray-400 space-y-1">
          <div className="text-gray-300 font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span>SENSOR TELEMETRY STANDBY</span>
          </div>
          <p className="text-[10.5px] text-gray-400 leading-snug">
            Click any <span className="text-emerald-400 font-bold">◉ Argo Float</span>, <span className="text-amber-400 font-bold">◆ Glider</span>, or <span className="text-teal-400 font-bold">〰 Current</span> on the globe to open detailed telemetry overlays.
          </p>
        </section>
      )}

      {/* Indian Ocean Basin Overview (Collapsible Option above SAR Engine) */}
      <section className="bg-white/[0.03] border border-white/10 rounded-lg overflow-hidden transition-all">
        <button
          onClick={() => setOverviewOpen(!overviewOpen)}
          className="w-full flex items-center justify-between p-2.5 bg-white/[0.02] hover:bg-white/[0.05] transition-colors text-left cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span className="text-[11px] font-mono text-cyan-300 font-black uppercase tracking-wider">
              Indian Ocean Overview
            </span>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {!overviewOpen && (
              <span className="text-[9.5px] font-mono text-cyan-200/90 bg-cyan-950/70 border border-cyan-500/40 px-1.5 py-0.5 rounded font-bold">
                40°E–110°E · SMC
              </span>
            )}
            <span className="text-[10px] font-mono text-cyan-400 font-bold bg-cyan-950/80 border border-cyan-400/40 w-5 h-5 rounded flex items-center justify-center">
              {overviewOpen ? '▼' : '▶'}
            </span>
          </div>
        </button>

        {overviewOpen && (
          <div className="p-3 pt-2 space-y-2 border-t border-white/10 text-[11px] font-mono animate-fadeIn">
            {/* 3 Full Spec Rows */}
            <div className="space-y-2">
              <div className="bg-white/5 p-2.5 rounded border border-white/10 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-[9.5px] font-bold uppercase tracking-wider">GEOGRAPHIC DOMAIN</span>
                  <span className="text-[9px] font-mono text-cyan-300 font-bold bg-cyan-950/70 px-1.5 py-0.5 rounded border border-cyan-500/30">
                    Arabian Sea · BoB · Eq IO
                  </span>
                </div>
                <div className="text-gray-100 font-black text-[11.5px]">
                  40.0°E – 110.0°E · 30.0°S – 26.0°N
                </div>
              </div>

              <div className="bg-white/5 p-2.5 rounded border border-white/10 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-[9.5px] font-bold uppercase tracking-wider">HYDRODYNAMIC FORCING</span>
                  <span className="text-[9px] font-mono text-amber-300 font-bold bg-amber-950/70 px-1.5 py-0.5 rounded border border-amber-500/30">
                    Somali Upwelling · Wyrtki Jet
                  </span>
                </div>
                <div className="text-gray-100 font-black text-[11.5px]">
                  Southwest Monsoon Current (SMC)
                </div>
              </div>

              <div className="bg-white/5 p-2.5 rounded border border-white/10 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-[9.5px] font-bold uppercase tracking-wider">LAGRANGIAN DRIFT KERNEL</span>
                  <span className="text-[9px] font-mono text-emerald-300 font-bold bg-emerald-950/70 px-1.5 py-0.5 rounded border border-emerald-500/30">
                    IAMSAR + EOS-80
                  </span>
                </div>
                <div className="text-gray-100 font-black text-[11.5px]">
                  4th-Order Runge-Kutta (RK4)
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* SAR LAGRANGIAN ENGINE (Mounted in Right Bar) */}
      <section className="bg-gradient-to-b from-orange-950/25 to-transparent border border-orange-500/40 rounded-xl p-3.5 space-y-3.5 shadow-[0_0_20px_rgba(255,107,53,0.15)]">
        {/* Header */}
        <div className="flex items-center justify-between pb-1.5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isSimulating
                  ? 'bg-amber-400 animate-ping'
                  : driftMode
                  ? 'bg-orange-400 animate-ping'
                  : driftPath.length > 0
                  ? 'bg-orange-400'
                  : 'bg-gray-600'
              }`}
            />
            <span className="text-[13px] font-black font-mono text-orange-300 tracking-wider">
              SAR LAGRANGIAN ENGINE
            </span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-orange-950/80 border border-orange-500/50 text-orange-400 font-black">
            {isSimulating ? 'COMPUTING...' : 'IAMSAR · RK4'}
          </span>
        </div>

        {/* Action Row */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onRunDemoDrift}
            disabled={isSimulating}
            className="py-2 px-2.5 rounded font-mono text-[11px] font-black bg-orange-500/25 border border-orange-400/70 text-orange-300 hover:bg-orange-500/35 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
            title="Seed Arabian Sea distress datum (11.2°N, 68.5°E) for instant verification"
          >
            <span>⚡</span>
            <span>QUICK TEST</span>
          </button>
          <button
            onClick={() => setDriftMode(!driftMode)}
            disabled={isSimulating}
            className={`py-2 px-2.5 rounded font-mono text-[11px] font-black border transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 ${
              driftMode
                ? 'bg-orange-500 text-black border-orange-300 shadow-[0_0_15px_rgba(255,107,53,0.6)] animate-pulse'
                : 'bg-white/5 border-white/15 text-gray-200 hover:text-white hover:bg-white/10'
            }`}
          >
            <span>🎯</span>
            <span>{isSimulating ? 'COMPUTING...' : driftMode ? 'CLICK GLOBE...' : 'ARM TARGET'}</span>
          </button>
        </div>

        {/* Leeway Object Category */}
        <div className="space-y-1.5">
          <label className="text-[10.5px] font-mono text-gray-300 uppercase tracking-wider font-black flex items-center justify-between">
            <span>IAMSAR Object Drift Class</span>
            <span className="text-orange-400 text-[9px] font-bold">Leeway Physics</span>
          </label>
          <select
            value={objectType}
            onChange={(e) => setObjectType(e.target.value)}
            className="w-full bg-[#050810] border border-orange-500/40 rounded px-2.5 py-1.5 text-[11.5px] font-mono font-bold text-orange-200 focus:outline-none focus:border-orange-400 [color-scheme:dark]"
          >
            <option value="life_raft">Life Raft (15-person, deep ballast) · 3.5% windage</option>
            <option value="fishing_vessel">Fishing Dhow / Coastal Vessel · 2.1% windage</option>
            <option value="container">40ft Shipping Container · 1.2% windage</option>
            <option value="person_in_water">Person in Water (PIW) · 1.1% windage</option>
          </select>
        </div>

        {/* Horizon Selector with Real-Time IAMSAR Radius Readout */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-mono text-gray-300 uppercase tracking-wider font-black">
              Drift Horizon (Radius Expands)
            </span>
            <span className="text-[11px] font-mono font-black text-orange-400">
              +{forecastHours}h Forecast
            </span>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { h: 12, r: '±11.2 km' },
              { h: 24, r: '±18.2 km' },
              { h: 48, r: '±31.9 km' },
              { h: 72, r: '±45.3 km' },
            ].map(({ h, r }) => (
              <button
                key={h}
                onClick={() => setForecastHours(h)}
                className={`py-2 px-1 rounded text-center font-mono border transition-all ${
                  forecastHours === h
                    ? 'bg-orange-500/30 border-orange-400 text-orange-200 font-black shadow-[0_0_10px_rgba(255,107,53,0.35)]'
                    : 'bg-white/5 border-white/10 text-gray-300 hover:text-white'
                }`}
              >
                <div className="text-[12px] font-black">+{h}h</div>
                <div className="text-[9.5px] font-bold opacity-85">{r}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Live SAR Trajectory Telemetry & Expanding Matrix */}
        {driftPath.length > 0 ? (() => {
          const lastWp = driftPath[driftPath.length - 1];
          const searchRadiusKm = lastWp?.search_radius_km ?? 0;
          const searchRadiusNm = (searchRadiusKm * 0.539957).toFixed(1);

          let cumulativeDistKm = 0;
          for (let i = 1; i < driftPath.length; i++) {
            const dLat = (driftPath[i].lat - driftPath[i - 1].lat) * 111.32;
            const dLon =
              (driftPath[i].lon - driftPath[i - 1].lon) *
              111.32 *
              Math.cos((driftPath[i].lat * Math.PI) / 180);
            cumulativeDistKm += Math.sqrt(dLat * dLat + dLon * dLon);
          }
          const cumulativeDistNm = (cumulativeDistKm * 0.539957).toFixed(1);

          return (
            <div className="space-y-2.5 pt-1.5 border-t border-white/10">
              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                <div className="bg-white/5 border border-white/10 p-2 rounded">
                  <span className="text-gray-400 block text-[9.5px] font-bold">CUMULATIVE DRIFT</span>
                  <span className="text-orange-300 font-black text-[14px]">
                    {cumulativeDistKm.toFixed(1)} km
                  </span>
                  <span className="text-gray-400 text-[10px] font-bold block">
                    {cumulativeDistNm} NM
                  </span>
                </div>
                <div className="bg-white/5 border border-orange-500/30 p-2 rounded">
                  <span className="text-gray-400 block text-[9.5px] font-bold">IAMSAR SEARCH RADIUS</span>
                  <span className="text-cyan-300 font-black text-[14px]">
                    ±{searchRadiusKm.toFixed(1)} km
                  </span>
                  <span className="text-cyan-400 text-[10px] font-bold block">
                    ±{searchRadiusNm} NM
                  </span>
                </div>
              </div>

              {/* Dynamic IAMSAR Horizon Expansion Matrix */}
              <div className="bg-black/50 border border-white/15 rounded p-2 space-y-1.5">
                <div className="text-[10px] font-mono text-gray-300 font-black flex items-center justify-between">
                  <span>IAMSAR EXPANSION MATRIX</span>
                  <span className="text-cyan-400 text-[8.5px] font-bold">R(t) = √(X² + Y(t)²)</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5 text-[10px] font-mono text-center pt-0.5">
                  {[
                    { h: 12, r: '11.2 km', area: '394 km²' },
                    { h: 24, r: '18.2 km', area: '1,040 km²' },
                    { h: 48, r: '31.9 km', area: '3,193 km²' },
                    { h: 72, r: '45.3 km', area: '6,437 km²' },
                  ].map((row) => {
                    const isActive = forecastHours === row.h;
                    return (
                      <div
                        key={row.h}
                        onClick={() => setForecastHours(row.h)}
                        className={`p-1.5 rounded cursor-pointer transition-all border ${
                          isActive
                            ? 'bg-orange-500/25 border-orange-400 text-orange-200 font-black'
                            : 'bg-white/[0.02] border-white/5 text-gray-300 hover:text-white'
                        }`}
                      >
                        <div className="font-black text-[11px]">+{row.h}h</div>
                        <div className="text-[9.5px] font-bold text-cyan-300">{row.r}</div>
                        <div className="text-[8.5px] font-semibold text-gray-400">{row.area}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between pt-0.5">
                <span className="text-[10.5px] font-mono font-bold text-gray-400">
                  Waypoints: {driftPath.length} nodes computed
                </span>
                <button
                  onClick={onClearDrift}
                  className="text-[10.5px] font-mono font-bold text-red-400 hover:text-red-300 underline"
                >
                  Clear Trajectory
                </button>
              </div>
            </div>
          );
        })() : (
          <div className="text-[10.5px] font-mono text-gray-400 p-2.5 rounded bg-white/[0.02] border border-white/10 leading-relaxed font-semibold">
            Click <span className="text-orange-300 font-bold">⚡ QUICK TEST</span> or <span className="text-cyan-300 font-bold">ARM TARGET</span> to project 4th-Order Runge-Kutta drift vector and expanding search containment area on the 3D globe.
          </div>
        )}
      </section>
      </div>
    </aside>
  );
}

// ─── Top Mission Navigation Bar ───────────────────────────────────────────────
interface TopBarProps {
  cursorCoord: { lat: number; lon: number } | null;
  dataSource: string | null;
  isSimulating: boolean;
  onOpenSources: () => void;
  floatCount: number;
  gliderCount: number;
  lasOnline?: boolean;
  isLive?: boolean;
  isFallbackMode?: boolean;
  onOpenOGC?: () => void;
}

function TopBar({
  cursorCoord,
  dataSource,
  isSimulating,
  onOpenSources,
  onOpenOGC,
  floatCount,
  gliderCount,
  lasOnline = true,
  isLive = false,
  isFallbackMode = false,
}: TopBarProps) {
  return (
    <header className="fixed top-0 left-0 right-0 h-11 z-40 bg-[#070b14]/95 border-b border-[#00f0ff]/20 backdrop-blur-lg flex items-center justify-between px-3 md:px-4 flex-nowrap whitespace-nowrap select-none overflow-hidden">
      {/* Brand & Mission Status */}
      <div className="flex items-center gap-2.5 shrink-0 flex-nowrap whitespace-nowrap">
        <div className="flex items-center gap-2 shrink-0 whitespace-nowrap">
          <div className="w-2.5 h-2.5 rounded-full bg-[#00f0ff] shadow-[0_0_12px_#00f0ff] shrink-0" />
          <span className="text-[15px] font-black text-white tracking-wider font-mono shrink-0 whitespace-nowrap">
            VARUNET <span className="text-[#00f0ff] text-[11.5px] font-bold">v3.0</span>
          </span>
        </div>

        <div className="hidden sm:flex items-center gap-2 border-l border-white/10 pl-2.5 shrink-0 whitespace-nowrap">
          {isFallbackMode || !lasOnline ? (
            <span className="text-[10.5px] font-mono px-2 py-0.5 rounded bg-amber-950/90 border border-amber-500 text-amber-300 font-black flex items-center gap-1.5 animate-pulse shadow-[0_0_12px_rgba(245,158,11,0.5)] shrink-0 whitespace-nowrap">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0" />
              ⚠ SIMULATION // LAS OFFLINE
            </span>
          ) : isLive ? (
            <span className="text-[10.5px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-black flex items-center gap-1.5 shadow-[0_0_8px_rgba(16,185,129,0.3)] shrink-0 whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              ● INCOIS LAS // LIVE
            </span>
          ) : (
            <span className="text-[10.5px] font-mono px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 font-black flex items-center gap-1.5 shrink-0 whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shrink-0" />
              ● INCOIS LAS // ONLINE (MODEL)
            </span>
          )}
          <span className="text-[10.5px] font-mono font-bold text-gray-400 hidden 2xl:inline shrink-0 whitespace-nowrap">
            Observation Deck
          </span>
        </div>
      </div>

      {/* Center Mission Clocks */}
      <div className="hidden md:block shrink-0 whitespace-nowrap">
        <MissionClock />
      </div>

      {/* Right Telemetry Readout & Controls */}
      <div className="flex items-center gap-2 lg:gap-2.5 font-mono text-[11px] shrink-0 flex-nowrap whitespace-nowrap">
        {/* Network status badges */}
        <div className="hidden xl:flex items-center gap-1.5 shrink-0 whitespace-nowrap">
          <span
            className="px-2 py-0.5 rounded bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-[10.5px] font-black shrink-0 whitespace-nowrap"
            title={`${floatCount} Argo CTD Floats deployed`}
          >
            {floatCount} Floats
          </span>
          <span
            className="px-2 py-0.5 rounded bg-amber-950/70 border border-amber-500/40 text-amber-300 text-[10.5px] font-black shrink-0 whitespace-nowrap"
            title={`${gliderCount} Autonomous Deep Sea Gliders`}
          >
            {gliderCount} Gliders
          </span>
          {dataSource && (
            <span
              className={`text-[10.5px] font-bold px-2 py-0.5 rounded max-w-[140px] 2xl:max-w-[220px] truncate shrink-0 whitespace-nowrap transition-colors ${
                isFallbackMode
                  ? 'bg-amber-950/80 border border-amber-500/70 text-amber-200 shadow-[0_0_8px_rgba(245,158,11,0.25)]'
                  : 'bg-white/5 border border-white/10 text-gray-300'
              }`}
              title={dataSource}
            >
              {dataSource}
            </span>
          )}
        </div>

        {/* Stable Fixed-Slot Coordinates Readout */}
        <div
          className="hidden lg:flex items-center justify-center w-[148px] h-7 shrink-0 text-cyan-300 bg-cyan-950/50 border border-cyan-500/40 px-2 py-0.5 rounded font-black text-[11px] font-mono whitespace-nowrap transition-all"
          title={cursorCoord ? `Geodetic Pointer: ${cursorCoord.lat.toFixed(4)}°, ${cursorCoord.lon.toFixed(4)}°` : 'Hover cursor over Indian Ocean for live Lat/Lon'}
        >
          {cursorCoord ? (
            <div className="flex items-center gap-1 shrink-0 whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shrink-0" />
              <span>{cursorCoord.lat >= 0 ? `${cursorCoord.lat.toFixed(2)}°N` : `${Math.abs(cursorCoord.lat).toFixed(2)}°S`}</span>
              <span className="text-gray-500">·</span>
              <span>{cursorCoord.lon >= 0 ? `${cursorCoord.lon.toFixed(2)}°E` : `${Math.abs(cursorCoord.lon).toFixed(2)}°W`}</span>
            </div>
          ) : (
            <span className="text-gray-500 font-semibold text-[10px] tracking-wider shrink-0 whitespace-nowrap">
              CURSOR STANDBY
            </span>
          )}
        </div>

        {isSimulating && (
          <span className="text-orange-400 animate-pulse font-black text-[10.5px] flex items-center gap-1.5 shrink-0 whitespace-nowrap">
            <span className="w-2 h-2 rounded-full bg-orange-400 animate-ping shrink-0" />
            RK4...
          </span>
        )}

        {/* OGC Interoperability Button */}
        {onOpenOGC && (
          <button
            onClick={onOpenOGC}
            className="text-[10.5px] font-mono font-bold text-emerald-300 hover:text-white border border-emerald-500/40 hover:border-emerald-300 px-2.5 py-1 rounded bg-emerald-950/40 transition-colors flex items-center gap-1 shrink-0 whitespace-nowrap shadow-[0_0_8px_rgba(16,185,129,0.25)]"
            title="Inspect standardized OGC WMS/WCS endpoints"
          >
            <span>🌐 OGC Endpoints</span>
          </button>
        )}

        <button
          onClick={onOpenSources}
          className="text-[10.5px] font-mono font-bold text-cyan-300 hover:text-white border border-cyan-500/40 hover:border-cyan-300 px-2.5 py-1 rounded bg-cyan-950/30 transition-colors flex items-center gap-1 shrink-0 whitespace-nowrap"
        >
          <span>Sources</span>
          <span className="text-cyan-400">↗</span>
        </button>
      </div>
    </header>
  );
}

// ─── Main Application Root ────────────────────────────────────────────────────
export function App() {
  const [variable, setVariable] = useState<string>('temperature');
  const [depth, setDepth] = useState<number>(0);
  const [timestamp, setTimestamp] = useState<string>(todayISO());

  const [gridData, setGridData] = useState<GridData | null>(null);
  const [cacheNotice, setCacheNotice] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<string | null>(null);
  const [lasOnline, setLasOnline] = useState<boolean>(true);
  const [isLiveMode, setIsLiveMode] = useState<boolean>(false);
  const [isRealData, setIsRealData] = useState<boolean>(false);

  const [floats, setFloats] = useState<ArgoFloat[]>([]);
  const [gliders, setGliders] = useState<GliderMission[]>([]);

  const [selectedFloat, setSelectedFloat] = useState<ArgoFloat | null>(null);
  const [selectedGlider, setSelectedGlider] = useState<GliderMission | null>(null);
  const [gliderTelemetry, setGliderTelemetry] = useState<GliderTelemetry | null>(null);
  const [gliderLoading, setGliderLoading] = useState<boolean>(false);
  const [selectedCurrent, setSelectedCurrent] = useState<CurrentInfo | null>(null);
  const [profileData, setProfileData] = useState<ProfileResponse | null>(null);
  const [profileLoading, setProfileLoading] = useState<boolean>(false);

  const [showFloats, setShowFloats] = useState<boolean>(true);
  const [showGliders, setShowGliders] = useState<boolean>(true);
  const [showCurrentVectors, setShowCurrentVectors] = useState<boolean>(true);

  const [driftMode, setDriftMode] = useState<boolean>(false);
  const [driftOrigin, setDriftOrigin] = useState<{ lat: number; lon: number } | null>(null);
  const [objectType, setObjectType] = useState<string>('life_raft');
  const [forecastHours, setForecastHours] = useState<number>(24);
  const [driftPath, setDriftPath] = useState<DriftWaypoint[]>([]);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  const [isGraphExpanded, setIsGraphExpanded] = useState<boolean>(false);
  const [isGliderExpanded, setIsGliderExpanded] = useState<boolean>(false);
  const [sourcesOpen, setSourcesOpen] = useState<boolean>(false);
  const [cursorCoord, setCursorCoord] = useState<{ lat: number; lon: number } | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [globeStyle, setGlobeStyle] = useState<'photorealistic' | 'cartographic'>('photorealistic');
  const [showAllLabels, setShowAllLabels] = useState<boolean>(false);
  const [argoSimFloat, setArgoSimFloat] = useState<ArgoFloat | null>(null);
  const [gliderSimMission, setGliderSimMission] = useState<GliderMission | null>(null);
  const [ogcInspectorOpen, setOgcInspectorOpen] = useState<boolean>(false);

  // ── New PS-required feature state ────────────────────────────────────────────
  const [colorbarSettings, setColorbarSettings] = useState<ColorbBarSettings>({
    palette: 'Thermal', vmin: 0, vmax: 32, scale: 'linear', opacity: 85, vExag: 1,
  });
  const [animating, setAnimating] = useState<boolean>(false);
  const [isTemporalExpanded, setIsTemporalExpanded] = useState<boolean>(false);
  const [showIsoline, setShowIsoline] = useState<boolean>(false);
  const [isolineTemp, setIsolineTemp] = useState<number>(28);

  // Sync colorbar default ranges when active variable changes
  useEffect(() => {
    const defaultRanges: Record<string, [number, number]> = {
      temperature: [2, 34],
      salinity: [28, 38],
      density: [1024, 1030],
    };
    const [dMin, dMax] = defaultRanges[variable] || [2, 34];
    setColorbarSettings((prev) => ({
      ...prev,
      vmin: dMin,
      vmax: dMax,
    }));
  }, [variable]);

  useEffect(() => {
    (window as any).__openArgoSimulator = (f?: ArgoFloat) => {
      setArgoSimFloat(f || floats[0]);
    };
    return () => {
      delete (window as any).__openArgoSimulator;
    };
  }, [floats]);

  // Animation loop: advance timestamp month by month (1 -> 12 cyclic) when animating
  useEffect(() => {
    if (!animating) return;
    const id = setInterval(() => {
      setTimestamp((prev) => {
        let y = 2026;
        let m = 7;
        let d = 15;
        if (prev) {
          const parts = prev.split('-');
          if (parts.length >= 3) {
            y = parseInt(parts[0], 10) || 2026;
            m = parseInt(parts[1], 10) || 7;
            d = parseInt(parts[2], 10) || 15;
          }
        }
        let nextM = m + 1;
        if (nextM > 12) nextM = 1;
        const mStr = String(nextM).padStart(2, '0');
        const dStr = String(d).padStart(2, '0');
        return `${y}-${mStr}-${dStr}`;
      });
    }, 900);
    return () => clearInterval(id);
  }, [animating]);


  // Compute unambiguous fallback / simulated mode.
  // Primary signal: is_real_data flag from backend (authoritative boolean).
  // Secondary fallbacks: las_online=false, or source string keyword (legacy safety net).
  const isFallbackMode =
    !isRealData ||
    !lasOnline ||
    Boolean(
      dataSource &&
        (dataSource.toLowerCase().includes('offline') ||
          dataSource.toLowerCase().includes('fallback') ||
          dataSource.toLowerCase().includes('simulated') ||
          dataSource.toLowerCase().includes('physics'))
    );

  // 1. Fetch grid slice on variable, depth, or timestamp change
  useEffect(() => {
    let alive = true;
    setApiError(null);
    getGridData(variable, depth, timestamp)
      .then((r: GridResponse) => {
        if (!alive) return;
        setGridData(r as GridData);
        setCacheNotice(r.cache_notice ?? null);
        setDataSource(r.source ?? null);
        const online = r.las_online !== undefined ? r.las_online : !r.source?.toLowerCase().includes('offline');
        setLasOnline(online);
        setIsLiveMode(Boolean(r.is_live));
        setIsRealData(Boolean(r.is_real_data));
      })
      .catch(() => {
        if (!alive) return;
        setLasOnline(false);
        setIsLiveMode(false);
        setIsRealData(false);
        setApiError('FastAPI backend offline — start with: python -m uvicorn main_v3:app --port 8001');
      });
    return () => {
      alive = false;
    };
  }, [variable, depth, timestamp]);

  // 2. Fetch Argo floats once on mount
  useEffect(() => {
    getFloats()
      .then((r) => setFloats(r.floats ?? []))
      .catch((e) => console.error('Float fetch error:', e));
  }, []);

  // 3. Fetch Gliders once on mount
  useEffect(() => {
    getGliders()
      .then((r) => setGliders(r.gliders ?? []))
      .catch((e) => console.error('Glider fetch error:', e));
  }, []);

  // 4. Select Argo Float → select target in right panel & load empirical profile
  const handleSelectFloat = useCallback(async (f: ArgoFloat) => {
    setSelectedGlider(null);
    setSelectedCurrent(null);
    setSelectedFloat(f);
    setProfileLoading(true);
    setProfileData(null);
    try {
      const p = await getFloatProfile(f.float_id);
      setProfileData(p);
    } catch {
      setProfileData(null);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  // 5. Select Glider → select target in right panel & load telemetry
  const handleSelectGlider = useCallback(async (g: GliderMission) => {
    setSelectedFloat(null);
    setSelectedCurrent(null);
    setProfileData(null);
    setSelectedGlider(g);
    setGliderLoading(true);
    setGliderTelemetry(null);
    try {
      const tel = await getGliderTelemetry(g.glider_id);
      setGliderTelemetry(tel);
    } catch (err) {
      console.error('Glider telemetry error:', err);
      setGliderTelemetry(null);
    } finally {
      setGliderLoading(false);
    }
  }, []);

  // 6. Select Monsoonal Current
  const handleSelectCurrent = useCallback((c: CurrentInfo) => {
    setSelectedFloat(null);
    setSelectedGlider(null);
    setProfileData(null);
    setGliderTelemetry(null);
    setSelectedCurrent(c);
  }, []);

  // 7. Deselect all targets
  const handleDeselect = useCallback(() => {
    setSelectedFloat(null);
    setSelectedGlider(null);
    setSelectedCurrent(null);
    setProfileData(null);
    setGliderTelemetry(null);
    setIsGliderExpanded(false);
  }, []);

  useEffect(() => {
    (window as any).__selectFloat = (idx = 0) => {
      if (floats.length > idx) handleSelectFloat(floats[idx]);
    };
    (window as any).__selectGlider = (idx = 0) => {
      if (gliders.length > idx) handleSelectGlider(gliders[idx]);
    };
    (window as any).__openEnlargedModal = async () => {
      if (floats.length > 0) {
        await handleSelectFloat(floats[0]);
        setIsGraphExpanded(true);
      }
    };
    (window as any).__openGliderModal = async () => {
      if (gliders.length > 0) {
        await handleSelectGlider(gliders[0]);
        setIsGliderExpanded(true);
      }
    };
  }, [floats, gliders, handleSelectFloat, handleSelectGlider]);

  // 7. Map Click in Drift Mode → record origin
  const handleMapClick = useCallback((lat: number, lon: number) => {
    if (!driftMode) return;
    setDriftOrigin({ lat, lon });
    setDriftMode(false);
  }, [driftMode]);

  // 8. Re-simulate drift whenever driftOrigin, forecastHours, objectType, or timestamp changes
  useEffect(() => {
    if (!driftOrigin) return;
    let alive = true;
    setIsSimulating(true);
    const startTimeISO = timestamp ? `${timestamp}T12:00:00Z` : new Date().toISOString();
    simulateDrift(driftOrigin.lat, driftOrigin.lon, startTimeISO, forecastHours, objectType)
      .then((r) => {
        if (alive) setDriftPath(r.path ?? []);
      })
      .catch((err) => console.error('Drift simulation failed:', err))
      .finally(() => {
        if (alive) setIsSimulating(false);
      });
    return () => {
      alive = false;
    };
  }, [driftOrigin, forecastHours, objectType, timestamp]);

  const handleClearDrift = useCallback(() => {
    setDriftPath([]);
    setDriftOrigin(null);
    setDriftMode(false);
  }, []);

  const handleRunDemoDrift = useCallback(() => {
    // Realistic Arabian Sea location off Lakshadweep (11.2°N, 68.5°E)
    setDriftOrigin({ lat: 11.2, lon: 68.5 });
    setDriftMode(false);
  }, []);

  return (
    <div
      className="relative w-screen h-screen overflow-hidden bg-[#030710] text-white select-none"
      style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
    >
      {/* Top Mission Navigation Bar */}
      <TopBar
        cursorCoord={cursorCoord}
        dataSource={dataSource}
        isSimulating={isSimulating}
        onOpenSources={() => setSourcesOpen(true)}
        onOpenOGC={() => setOgcInspectorOpen(true)}
        floatCount={floats.length}
        gliderCount={gliders.length}
        lasOnline={lasOnline}
        isLive={isLiveMode}
        isFallbackMode={isFallbackMode}
      />

      {/* Left Tactical Mission Controls */}
      <LeftDeck
        variable={variable}
        setVariable={setVariable}
        depth={depth}
        setDepth={setDepth}
        timestamp={timestamp}
        setTimestamp={setTimestamp}
        showFloats={showFloats}
        setShowFloats={setShowFloats}
        showGliders={showGliders}
        setShowGliders={setShowGliders}
        showCurrentVectors={showCurrentVectors}
        setShowCurrentVectors={setShowCurrentVectors}
        floatCount={floats.length}
        gliderCount={gliders.length}
        onOpenSources={() => setSourcesOpen(true)}
        cacheNotice={cacheNotice}
        isFallbackMode={isFallbackMode}
        colorbarSettings={colorbarSettings}
        setColorbarSettings={setColorbarSettings}
        animating={animating}
        setAnimating={setAnimating}
        showIsoline={showIsoline}
        setShowIsoline={setShowIsoline}
        isolineTemp={isolineTemp}
        setIsolineTemp={setIsolineTemp}
        onGridLoaded={(data) => { if (data) setGridData(data as GridData); }}
        onProfilesLoaded={(_data) => { /* loaded profiles shown as overlay markers */ }}
      />

      {/* Right Telemetry & SAR Mission Deck */}
      <RightDeck
        selectedFloat={selectedFloat}
        selectedGlider={selectedGlider}
        selectedCurrent={selectedCurrent}
        profile={profileData}
        profileLoading={profileLoading}
        variable={variable}
        onDeselect={handleDeselect}
        onExpandGraph={() => setIsGraphExpanded(true)}
        gliderTelemetry={gliderTelemetry}
        gliderLoading={gliderLoading}
        onExpandGlider={() => setIsGliderExpanded(true)}
        driftMode={driftMode}
        setDriftMode={setDriftMode}
        objectType={objectType}
        setObjectType={setObjectType}
        forecastHours={forecastHours}
        setForecastHours={setForecastHours}
        driftPath={driftPath}
        onClearDrift={handleClearDrift}
        driftOrigin={driftOrigin}
        isSimulating={isSimulating}
        onRunDemoDrift={handleRunDemoDrift}
        onOpenArgoSim={(f) => setArgoSimFloat(f)}
        onOpenGliderSim={(g) => setGliderSimMission(g)}
      />

      {/* Center 3D Indian Ocean Globe */}
      <main className={`absolute inset-0 left-[320px] right-[360px] bottom-0 transition-all ${isFallbackMode && !apiError ? 'top-[4.6rem]' : 'top-11'}`}>
        <OceanGlobe3D
          gridData={gridData}
          floats={floats}
          gliders={gliders}
          driftPath={driftPath}
          driftMode={driftMode}
          selectedFloatId={selectedFloat?.float_id ?? null}
          selectedGliderId={selectedGlider?.glider_id ?? null}
          selectedCurrentId={selectedCurrent?.id ?? null}
          variable={variable}
          depth={depth}
          timestamp={timestamp}
          showFloats={showFloats}
          showGliders={showGliders}
          showCurrentVectors={showCurrentVectors}
          globeStyle={globeStyle}
          showAllLabels={showAllLabels}
          colorbarSettings={colorbarSettings}
          showIsoline={showIsoline}
          isolineTemp={isolineTemp}
          onSelectFloat={handleSelectFloat}
          onSelectGlider={handleSelectGlider}
          onSelectCurrent={handleSelectCurrent}
          onDeselectFloat={handleDeselect}
          onDeselectGlider={handleDeselect}
          onDeselectCurrent={handleDeselect}
          onExpandGraph={() => setIsGraphExpanded(true)}
          onMapClick={handleMapClick}
          onCursorMove={setCursorCoord}
        />

        {/* Globe Base Style & Smart Label Density Selector */}
        <div className="absolute top-3 left-4 z-30 flex items-center gap-1.5 bg-[#070b14]/90 border border-white/15 rounded-lg p-1 shadow-xl backdrop-blur-md font-mono text-[11px] font-bold">
          <button
            onClick={() => setGlobeStyle('photorealistic')}
            className={`px-2.5 py-1 rounded transition-all flex items-center gap-1.5 ${
              globeStyle === 'photorealistic'
                ? 'bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/50 font-black shadow-[0_0_10px_rgba(0,240,255,0.3)]'
                : 'text-gray-400 hover:text-white'
            }`}
            title="Photorealistic NASA Blue Marble 3D Earth"
          >
            <span>🌍 Photorealistic Earth</span>
          </button>
          <button
            onClick={() => setGlobeStyle('cartographic')}
            className={`px-2.5 py-1 rounded transition-all flex items-center gap-1.5 ${
              globeStyle === 'cartographic'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 font-black shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                : 'text-gray-400 hover:text-white'
            }`}
            title="Original Cartographic INCOIS / Argo Dark Theme"
          >
            <span>🗺 Cartographic Dark</span>
          </button>

          <div className="h-4 w-px bg-white/20 mx-0.5" />

          {/* Decluttered Smart View vs Show All Labels */}
          <button
            onClick={() => setShowAllLabels(!showAllLabels)}
            className={`px-2.5 py-1 rounded transition-all flex items-center gap-1.5 ${
              showAllLabels
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 font-black shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                : 'bg-white/5 text-gray-300 hover:text-white border border-white/10'
            }`}
            title="Toggle between Clean Smart Hover mode and All Labels Visible"
          >
            <span>{showAllLabels ? '🏷️ All Labels On' : '✨ Clean View (Hover for ID)'}</span>
          </button>
        </div>

        {/* Fluid Scale Tube Colorbar (Right Side of 3D Globe Screen) */}
        <ColorbarLegend variable={variable} settings={colorbarSettings} />

        {/* Bottom 4D Spatiotemporal Mission Controller Bar */}
        <SpatiotemporalController
          timestamp={timestamp}
          setTimestamp={setTimestamp}
          animating={animating}
          setAnimating={setAnimating}
          depth={depth}
          setDepth={setDepth}
          variable={variable}
          isExpanded={isTemporalExpanded}
          setIsExpanded={setIsTemporalExpanded}
        />
      </main>

      {/* Provenance & Open Science Modal */}
      <DataSourcesModal isOpen={sourcesOpen} onClose={() => setSourcesOpen(false)} />

      {/* High-Resolution Expanded CTD Soundings Modal */}
      {isGraphExpanded && profileData && selectedFloat && (
        <ExpandedCTDModal
          profile={profileData}
          float={selectedFloat}
          initialVariable={variable}
          onClose={() => setIsGraphExpanded(false)}
        />
      )}

      {/* Autonomous Glider Mission & Sensor Workstation Modal */}
      {isGliderExpanded && gliderTelemetry && selectedGlider && (
        <ExpandedGliderModal
          telemetry={gliderTelemetry}
          glider={selectedGlider}
          onClose={() => setIsGliderExpanded(false)}
        />
      )}

      {/* Argo Float 10-Day Profiling Cycle Mission Simulator */}
      {argoSimFloat && (
        <ArgoSimulationModal
          float={argoSimFloat}
          onClose={() => setArgoSimFloat(null)}
        />
      )}

      {/* Autonomous Glider Sawtooth Mission Flight Simulator */}
      {gliderSimMission && (
        <GliderSimulationModal
          glider={gliderSimMission}
          onClose={() => setGliderSimMission(null)}
        />
      )}

      {/* OGC Interoperability Endpoints Inspector */}
      {ogcInspectorOpen && (
        <OGCInspectorModal
          onClose={() => setOgcInspectorOpen(false)}
        />
      )}

      {/* SAR Armed Banner */}
      {driftMode && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-6 py-3.5 rounded-xl bg-[#0e0706]/95 border-2 border-[#ff6b35] text-[#ff6b35] text-[13px] font-mono font-black tracking-wide shadow-[0_0_35px_rgba(255,107,53,0.6)] flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-[#ff6b35] animate-ping" />
          <span>SAR TARGETING ACTIVE — Click any point on the Indian Ocean to simulate trajectory</span>
          <button
            onClick={() => setDriftMode(false)}
            className="ml-3 px-3 py-1 rounded bg-white/10 hover:bg-white/20 text-white text-[12px] font-bold transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Fallback / Simulation Active Warning Banner */}
      {isFallbackMode && !apiError && (
        <div className="fixed top-11 left-[320px] right-[360px] h-[1.85rem] z-30 px-4 bg-gradient-to-r from-amber-950/95 via-amber-900/90 to-amber-950/95 border-b border-amber-500/60 text-amber-200 text-[11px] font-mono font-black shadow-[0_0_15px_rgba(245,158,11,0.3)] flex items-center justify-center gap-2.5 backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          <span>⚠ SIMULATED / FALLBACK DATA ACTIVE — INCOIS LAS Offline · Displaying Local Thermodynamic Physics</span>
        </div>
      )}

      {/* Error Alert Banner */}
      {apiError && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-lg bg-red-950/95 border border-red-600 text-red-200 text-[12px] font-mono font-bold shadow-2xl">
          ⚠ {apiError}
        </div>
      )}

      {/* Viewport Operational Hints — only displayed when temporal dynamics bar is collapsed */}
      {!isTemporalExpanded && (
        <footer className="fixed bottom-1.5 left-[50%] -translate-x-1/2 z-10 pointer-events-none px-2.5 py-0.5 rounded-full bg-[#070b14]/85 border border-white/10 backdrop-blur-md text-[9.5px] font-mono font-medium text-gray-400 shadow-sm whitespace-nowrap">
          NAV: Left-click rotate · Right-click pan · Scroll zoom · Click ◉ Float / ◆ Glider for telemetry
        </footer>
      )}
    </div>
  );
}

export default App;
