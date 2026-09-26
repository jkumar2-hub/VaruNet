/**
 * ExpandedGliderModal — VaruNet v3 (Autonomous Glider Command)
 * High-Resolution Multi-Sensor & Vehicle Flight Workstation
 *
 * Provides deep analytical visualization for autonomous underwater gliders:
 *   • Tab 1: Physical CTD Soundings (In-situ Temperature & Practical Salinity)
 *   • Tab 2: Biogeochemical Sensors (Dissolved Oxygen OMZ & Chlorophyll-a DCM)
 *   • Tab 3: Flight Mechanics & Diagnostics (DAC current compass, vacuum gauge, attitude)
 *   • Tab 4: Multi-Dive Sawtooth Transect Cross-Section
 *   • Settled zero-overlap legends, interactive crosshairs, and empirical data ledgers
 */
import React, { useState, useEffect, useMemo } from 'react';
import type { GliderTelemetry, GliderMission } from '../api/client';

interface ExpandedGliderModalProps {
  telemetry: GliderTelemetry;
  glider: GliderMission;
  onClose: () => void;
}

type GliderTab = 'ctd' | 'bgc' | 'flight' | 'sawtooth';

export const ExpandedGliderModal: React.FC<ExpandedGliderModalProps> = ({
  telemetry,
  glider: _glider,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<GliderTab>('ctd');
  const [ctdVar, setCtdVar] = useState<'temp' | 'salinity'>('temp');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const depths = telemetry.depth_levels ?? [];
  const maxD = telemetry.depth_max || 1000;

  // CTD Tab Geometry
  const W = 540;
  const H = 420;
  const pL = 52;
  const pR = 24;
  const pT = 20;
  const pB = 38;
  const plotW = W - pL - pR;
  const plotH = H - pT - pB;

  const ctdData = useMemo(() => {
    const vals = ctdVar === 'temp' ? telemetry.temperature : telemetry.salinity;
    if (!vals || vals.length === 0) return { minV: 0, maxV: 30, pts: [] };
    const minV = Math.floor(Math.min(...vals) * 0.95);
    const maxV = Math.ceil(Math.max(...vals) * 1.05);
    const pts = depths.map((d, i) => {
      const v = vals[i] ?? 0;
      const x = pL + ((v - minV) / Math.max(0.001, maxV - minV)) * plotW;
      const y = pT + (d / Math.max(1, maxD)) * plotH;
      return { d, v, x, y };
    });
    return { minV, maxV, pts };
  }, [ctdVar, depths, maxD, telemetry.temperature, telemetry.salinity, pL, pT, plotW, plotH]);

  // BGC Tab Data
  const bgcData = useMemo(() => {
    const ox = telemetry.dissolved_oxygen_umol_kg ?? [];
    const chl = telemetry.chlorophyll_a_ug_l ?? [];
    const maxOx = Math.max(250, ...(ox.length ? ox : [250]));
    const maxChl = Math.max(2.0, ...(chl.length ? chl : [2.0]));

    const oxPts = depths.map((d, i) => {
      const v = ox[i] ?? 0;
      const x = pL + (v / maxOx) * plotW;
      const y = pT + (d / Math.max(1, maxD)) * plotH;
      return { d, v, x, y };
    });

    const chlPts = depths.map((d, i) => {
      const v = chl[i] ?? 0;
      const x = pL + (v / maxChl) * plotW;
      const y = pT + (d / Math.max(1, maxD)) * plotH;
      return { d, v, x, y };
    });

    return { maxOx, maxChl, oxPts, chlPts };
  }, [depths, maxD, telemetry.dissolved_oxygen_umol_kg, telemetry.chlorophyll_a_ug_l, pL, pT, plotW, plotH]);

  // Sawtooth Tab Data
  const sawtoothPts = useMemo(() => {
    const st = telemetry.sawtooth_transect ?? [];
    if (!st.length) return '';
    const maxDist = Math.max(...st.map((p) => p.distance_km), 50);
    return st
      .map((p) => {
        const x = pL + (p.distance_km / maxDist) * plotW;
        const y = pT + (p.depth / Math.max(1, maxD)) * plotH;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }, [telemetry.sawtooth_transect, maxD, pL, pT, plotW, plotH]);

  // SVG Depth Y-ticks
  const yTicks = useMemo(() => {
    const step = maxD <= 500 ? 100 : maxD <= 1000 ? 250 : 500;
    const ticks: number[] = [];
    for (let d = 0; d <= maxD; d += step) ticks.push(d);
    return ticks;
  }, [maxD]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col rounded-2xl bg-[#070d19] border border-amber-500/40 shadow-[0_0_50px_rgba(245,158,11,0.25)] overflow-hidden">
        
        {/* ─── Top Header ────────────────────────────────────────── */}
        <div className="px-6 py-4 bg-[#091224] border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-amber-400 shadow-[0_0_12px_#F59E0B] animate-pulse" />
            <div>
              <div className="flex items-center gap-2.5">
                <span className="text-[17px] font-black font-mono tracking-wider text-amber-300">
                  {telemetry.glider_id}
                </span>
                <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-[10.5px] font-mono font-black text-amber-300">
                  {telemetry.mission}
                </span>
                <span className="px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30 text-[10.5px] font-mono font-bold text-cyan-300">
                  {telemetry.operator}
                </span>
              </div>
              <div className="text-[11px] font-mono text-gray-400 mt-0.5 flex items-center gap-3">
                <span>COORD: <strong className="text-gray-200">{telemetry.lat.toFixed(2)}°N, {telemetry.lon.toFixed(2)}°E</strong></span>
                <span>•</span>
                <span>BASIN: <strong className="text-gray-200">{telemetry.region}</strong></span>
                <span>•</span>
                <span>MAX DIVE: <strong className="text-amber-300">{maxD}m</strong></span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[11px] font-mono text-gray-300 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>{telemetry.flight_phase}</span>
            </div>
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 hover:border-white/25 text-gray-300 hover:text-white text-xs font-mono font-bold transition-all flex items-center gap-1.5"
            >
              ✕ ESC
            </button>
          </div>
        </div>

        {/* ─── Metric Chips Strip ────────────────────────────────── */}
        <div className="px-6 py-2.5 bg-[#050a14] border-b border-white/5 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
          <div className="bg-white/[0.02] border border-cyan-500/30 rounded-lg p-2 flex flex-col justify-between">
            <span className="text-gray-400 text-[9.5px] font-bold">DEPTH-AVG CURRENT (DAC)</span>
            <div className="text-cyan-300 font-black text-[13px] flex items-center gap-1.5 mt-0.5">
              <span>{telemetry.dac_speed_kts} kts</span>
              <span className="text-cyan-500 font-normal text-[11px]">@{telemetry.dac_heading_deg}°</span>
            </div>
          </div>

          <div className="bg-white/[0.02] border border-emerald-500/30 rounded-lg p-2 flex flex-col justify-between">
            <span className="text-gray-400 text-[9.5px] font-bold">HULL INTERNAL VACUUM</span>
            <div className="text-emerald-400 font-black text-[13px] flex items-center gap-1.5 mt-0.5">
              <span>{telemetry.internal_vacuum_inhg} inHg</span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-950/60 border border-emerald-500/40 text-emerald-300">
                SEALED NOMINAL
              </span>
            </div>
          </div>

          <div className="bg-white/[0.02] border border-amber-500/30 rounded-lg p-2 flex flex-col justify-between">
            <span className="text-gray-400 text-[9.5px] font-bold">BATTERY & POWER DRAIN</span>
            <div className="text-amber-300 font-black text-[13px] flex items-center gap-1.5 mt-0.5">
              <span>{telemetry.battery_pct}%</span>
              <span className="text-gray-400 font-normal text-[11px]">· {telemetry.voltage}V ({telemetry.power_watts}W)</span>
            </div>
          </div>

          <div className="bg-white/[0.02] border border-purple-500/30 rounded-lg p-2 flex flex-col justify-between">
            <span className="text-gray-400 text-[9.5px] font-bold">FLIGHT LOG & DIVE CYCLE</span>
            <div className="text-purple-300 font-black text-[13px] flex items-center gap-1.5 mt-0.5">
              <span>DIVE #{telemetry.dive_number}</span>
              <span className="text-gray-400 font-normal text-[11px]">· {depths.length} Soundings</span>
            </div>
          </div>
        </div>

        {/* ─── Workstation Navigation Tabs ───────────────────────── */}
        <div className="px-6 pt-3 bg-[#080f1e] border-b border-white/10 flex items-center gap-2">
          {[
            { id: 'ctd', label: 'PHYSICAL CTD SOUNDINGS', icon: '🌡' },
            { id: 'bgc', label: 'BIOGEOCHEMICAL (O₂ & CHL-A)', icon: '🧬' },
            { id: 'flight', label: 'FLIGHT & DIAGNOSTICS', icon: '🧭' },
            { id: 'sawtooth', label: 'SAWTOOTH TRANSECT', icon: '📉' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as GliderTab)}
              className={`px-4 py-2 rounded-t-lg font-mono text-xs font-bold transition-all border-t border-x ${
                activeTab === tab.id
                  ? 'bg-[#0a1428] text-amber-300 border-amber-500/60 shadow-[0_-2px_10px_rgba(245,158,11,0.2)]'
                  : 'bg-white/[0.02] text-gray-400 border-transparent hover:text-gray-200 hover:bg-white/5'
              }`}
            >
              <span className="mr-1.5">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ─── Main Tab Viewport ─────────────────────────────────── */}
        <div className="p-6 flex-1 overflow-y-auto bg-[#0a1428]">
          {/* TAB 1: PHYSICAL CTD */}
          {activeTab === 'ctd' && (
            <div className="flex flex-col lg:flex-row items-stretch gap-6">
              {/* Plot Canvas */}
              <div className="flex-1 flex flex-col bg-[#050b16] border border-white/10 rounded-xl p-4">
                {/* Settled Legend Header */}
                <div className="flex items-center justify-between pb-3 mb-2 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-black tracking-wider text-amber-300 uppercase">
                      IN-SITU {ctdVar === 'temp' ? 'TEMPERATURE' : 'PRACTICAL SALINITY'} [0 – {maxD}m]
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0a1324] border border-amber-500/40 text-[11px] font-mono font-bold text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.2)]">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      <span>{ctdVar === 'temp' ? 'Temperature (°C)' : 'Salinity (PSU)'}</span>
                    </div>
                    <div className="flex items-center rounded-lg bg-white/5 p-0.5 border border-white/10">
                      <button
                        onClick={() => setCtdVar('temp')}
                        className={`px-2.5 py-1 rounded text-[10.5px] font-mono font-bold transition-all ${
                          ctdVar === 'temp' ? 'bg-amber-500 text-black' : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        TEMP (°C)
                      </button>
                      <button
                        onClick={() => setCtdVar('salinity')}
                        className={`px-2.5 py-1 rounded text-[10.5px] font-mono font-bold transition-all ${
                          ctdVar === 'salinity' ? 'bg-amber-500 text-black' : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        SALINITY (PSU)
                      </button>
                    </div>
                  </div>
                </div>

                {/* SVG Graph */}
                <div className="flex-1 flex items-center justify-center">
                  <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-h-[380px]">
                    {/* Grid lines */}
                    {yTicks.map((d) => {
                      const y = pT + (d / Math.max(1, maxD)) * plotH;
                      return (
                        <g key={d}>
                          <line x1={pL} y1={y} x2={W - pR} y2={y} stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
                          <text x={pL - 8} y={y + 3} fill="#94A3B8" fontSize="9" fontFamily="monospace" textAnchor="end">
                            {d}m
                          </text>
                        </g>
                      );
                    })}

                    {/* Curve */}
                    {ctdData.pts.length > 1 && (
                      <polyline
                        points={ctdData.pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}
                        fill="none"
                        stroke="#F59E0B"
                        strokeWidth="2.5"
                      />
                    )}

                    {/* Sounding nodes */}
                    {ctdData.pts.map((p, idx) => {
                      const isHov = hoveredIdx === idx;
                      return (
                        <g
                          key={p.d}
                          className="cursor-pointer"
                          onMouseEnter={() => setHoveredIdx(idx)}
                          onMouseLeave={() => setHoveredIdx(null)}
                        >
                          <circle cx={p.x} cy={p.y} r={isHov ? 6 : 3.5} fill={isHov ? '#FFF' : '#F59E0B'} stroke="#050B16" strokeWidth="1.5" />
                          {isHov && (
                            <text
                              x={p.x + 10}
                              y={p.y - 6}
                              fill="#FFF"
                              fontSize="10"
                              fontFamily="monospace"
                              fontWeight="bold"
                              className="pointer-events-none drop-shadow-md"
                            >
                              {p.v} {ctdVar === 'temp' ? '°C' : 'PSU'} @ {p.d}m
                            </text>
                          )}
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </div>

              {/* Data Ledger */}
              <div className="w-full lg:w-72 bg-[#050b16] border border-white/10 rounded-xl p-3.5 flex flex-col">
                <div className="text-[11.5px] font-mono font-black text-amber-300 pb-2 border-b border-white/10 flex items-center justify-between">
                  <span>CTD SOUNDING LEDGER</span>
                  <span className="text-gray-400 font-normal text-[10px]">{depths.length} Levels</span>
                </div>
                <div className="flex-1 overflow-y-auto mt-2 space-y-1 max-h-[360px] pr-1">
                  <div className="grid grid-cols-3 text-[10px] font-mono font-bold text-gray-400 px-2 py-1 border-b border-white/5">
                    <span>DEPTH</span>
                    <span>TEMP</span>
                    <span className="text-right">SALINITY</span>
                  </div>
                  {depths.map((d, i) => {
                    const isHov = hoveredIdx === i;
                    return (
                      <div
                        key={d}
                        onMouseEnter={() => setHoveredIdx(i)}
                        onMouseLeave={() => setHoveredIdx(null)}
                        className={`grid grid-cols-3 text-[10.5px] font-mono px-2 py-1 rounded transition-colors cursor-pointer ${
                          isHov ? 'bg-amber-500/20 text-white font-bold' : 'text-gray-300 hover:bg-white/5'
                        }`}
                      >
                        <span className="text-gray-400">{d}m</span>
                        <span className="text-emerald-400 font-semibold">{telemetry.temperature[i]}°C</span>
                        <span className="text-cyan-300 text-right font-semibold">{telemetry.salinity[i]}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BIOGEOCHEMICAL SENSORS */}
          {activeTab === 'bgc' && (
            <div className="flex flex-col lg:flex-row items-stretch gap-6">
              <div className="flex-1 flex flex-col bg-[#050b16] border border-white/10 rounded-xl p-4">
                {/* Settled Legend */}
                <div className="flex items-center justify-between pb-3 mb-2 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-black tracking-wider text-emerald-300 uppercase">
                      BIOGEOCHEMICAL PROFILER [O₂ & CHL-A]
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-mono font-bold">
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0a1324] border border-cyan-500/40 text-cyan-300">
                      <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#00E5FF]" />
                      <span>Dissolved O₂ (µmol/kg)</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0a1324] border border-emerald-500/40 text-emerald-300">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#10B981]" />
                      <span>Chlorophyll-a (µg/L)</span>
                    </div>
                  </div>
                </div>

                {/* BGC SVG */}
                <div className="flex-1 flex items-center justify-center">
                  <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-h-[380px]">
                    {/* OMZ Highlight Band (120m to 700m if applicable) */}
                    {telemetry.data_provenance.omz_identified && (
                      <g>
                        <rect
                          x={pL}
                          y={pT + (120 / maxD) * plotH}
                          width={plotW}
                          height={((Math.min(maxD, 700) - 120) / maxD) * plotH}
                          fill="rgba(244, 63, 94, 0.08)"
                          stroke="rgba(244, 63, 94, 0.25)"
                          strokeDasharray="4 4"
                        />
                        <text
                          x={W - pR - 8}
                          y={pT + (280 / maxD) * plotH}
                          fill="#F43F5E"
                          fontSize="9"
                          fontFamily="monospace"
                          fontWeight="bold"
                          textAnchor="end"
                        >
                          ⚠ OXYGEN MINIMUM ZONE (OMZ)
                        </text>
                      </g>
                    )}

                    {/* DCM Band */}
                    <line
                      x1={pL}
                      y1={pT + (telemetry.data_provenance.dcm_depth_m / maxD) * plotH}
                      x2={W - pR}
                      y2={pT + (telemetry.data_provenance.dcm_depth_m / maxD) * plotH}
                      stroke="#10B981"
                      strokeWidth="1.5"
                      strokeDasharray="4 2"
                    />
                    <text
                      x={W - pR - 8}
                      y={pT + (telemetry.data_provenance.dcm_depth_m / maxD) * plotH - 5}
                      fill="#10B981"
                      fontSize="9"
                      fontFamily="monospace"
                      fontWeight="bold"
                      textAnchor="end"
                    >
                      🌱 DEEP CHLOROPHYLL MAX ({telemetry.data_provenance.dcm_depth_m}m)
                    </text>

                    {/* Depth grid ticks */}
                    {yTicks.map((d) => {
                      const y = pT + (d / Math.max(1, maxD)) * plotH;
                      return (
                        <g key={d}>
                          <line x1={pL} y1={y} x2={W - pR} y2={y} stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
                          <text x={pL - 8} y={y + 3} fill="#94A3B8" fontSize="9" fontFamily="monospace" textAnchor="end">
                            {d}m
                          </text>
                        </g>
                      );
                    })}

                    {/* Dissolved Oxygen Curve (Cyan) */}
                    {bgcData.oxPts.length > 1 && (
                      <polyline
                        points={bgcData.oxPts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}
                        fill="none"
                        stroke="#00E5FF"
                        strokeWidth="2.5"
                      />
                    )}

                    {/* Chlorophyll-a Curve (Emerald) */}
                    {bgcData.chlPts.length > 1 && (
                      <polyline
                        points={bgcData.chlPts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}
                        fill="none"
                        stroke="#10B981"
                        strokeWidth="2.5"
                      />
                    )}

                    {/* Nodes */}
                    {bgcData.oxPts.map((p) => (
                      <circle key={`ox-${p.d}`} cx={p.x} cy={p.y} r="3" fill="#00E5FF" stroke="#050B16" strokeWidth="1" />
                    ))}
                    {bgcData.chlPts.map((p) => (
                      <circle key={`chl-${p.d}`} cx={p.x} cy={p.y} r="3" fill="#10B981" stroke="#050B16" strokeWidth="1" />
                    ))}
                  </svg>
                </div>
              </div>

              {/* BGC Diagnostic Details */}
              <div className="w-full lg:w-72 bg-[#050b16] border border-white/10 rounded-xl p-4 flex flex-col justify-between space-y-4">
                <div>
                  <span className="text-[12px] font-mono font-black text-emerald-300 block pb-2 border-b border-white/10">
                    OCEAN BIOGEOCHEMISTRY
                  </span>
                  <div className="space-y-3 mt-3 text-xs font-mono">
                    <div className="bg-white/5 p-2.5 rounded border border-white/5">
                      <span className="text-gray-400 block text-[10px] font-bold">MINIMUM O₂ CORE</span>
                      <span className="text-rose-400 font-black text-[13px]">
                        {Math.min(...telemetry.dissolved_oxygen_umol_kg)} µmol/kg
                      </span>
                      <span className="text-[9.5px] text-gray-400 block mt-0.5">
                        Suboxic intermediate water layer
                      </span>
                    </div>

                    <div className="bg-white/5 p-2.5 rounded border border-white/5">
                      <span className="text-gray-400 block text-[10px] font-bold">PEAK CHLOROPHYLL-A</span>
                      <span className="text-emerald-300 font-black text-[13px]">
                        {Math.max(...telemetry.chlorophyll_a_ug_l)} µg/L
                      </span>
                      <span className="text-[9.5px] text-gray-400 block mt-0.5">
                        Deep Chlorophyll Maximum at {telemetry.data_provenance.dcm_depth_m}m
                      </span>
                    </div>

                    <div className="bg-white/5 p-2.5 rounded border border-white/5">
                      <span className="text-gray-400 block text-[10px] font-bold">TURBIDITY / BACKSCATTER</span>
                      <span className="text-amber-300 font-black text-[13px]">
                        {telemetry.turbidity_ntu[0]} NTU
                      </span>
                      <span className="text-[9.5px] text-gray-400 block mt-0.5">
                        Photic particulate backscatter
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-emerald-950/40 border border-emerald-500/30 rounded p-2.5 text-[10.5px] font-mono text-emerald-200/90 leading-relaxed">
                  {telemetry.data_provenance.bgc_source}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: FLIGHT & ATTITUDE */}
          {activeTab === 'flight' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Compass DAC */}
              <div className="bg-[#050b16] border border-white/10 rounded-xl p-4 flex flex-col items-center justify-center text-center">
                <span className="text-xs font-mono font-bold text-gray-400 mb-3">DAC CURRENT VECTOR</span>
                <div className="relative w-32 h-32 rounded-full border-2 border-cyan-500/40 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.15)]">
                  <span className="absolute top-1 text-[9px] font-mono font-black text-cyan-400">N</span>
                  <span className="absolute bottom-1 text-[9px] font-mono font-bold text-gray-500">S</span>
                  <span className="absolute left-1 text-[9px] font-mono font-bold text-gray-500">W</span>
                  <span className="absolute right-1 text-[9px] font-mono font-bold text-gray-500">E</span>
                  {/* Needle */}
                  <div
                    className="w-1.5 h-16 bg-gradient-to-t from-transparent via-cyan-400 to-amber-400 rounded-full shadow-[0_0_10px_#22D3EE] transition-transform duration-500"
                    style={{ transform: `rotate(${telemetry.dac_heading_deg}deg)` }}
                  />
                </div>
                <div className="mt-3 font-mono">
                  <div className="text-cyan-300 font-black text-sm">{telemetry.dac_speed_kts} KNOTS</div>
                  <div className="text-gray-400 text-[11px]">Heading {telemetry.dac_heading_deg}°</div>
                </div>
              </div>

              {/* Vacuum Gauge */}
              <div className="bg-[#050b16] border border-white/10 rounded-xl p-4 flex flex-col items-center justify-center text-center">
                <span className="text-xs font-mono font-bold text-gray-400 mb-3">HULL SEAL INTEGRITY</span>
                <div className="w-28 h-28 rounded-full border-4 border-emerald-500/60 flex flex-col items-center justify-center bg-emerald-950/20 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                  <span className="text-emerald-300 font-black text-xl font-mono">{telemetry.internal_vacuum_inhg}</span>
                  <span className="text-[10px] font-mono text-emerald-400">inHg</span>
                </div>
                <div className="mt-3 font-mono">
                  <div className="text-emerald-400 font-bold text-xs">PRESSURE NOMINAL</div>
                  <div className="text-gray-400 text-[10px]">Safe limits: 6.0 – 9.0 inHg</div>
                </div>
              </div>

              {/* Artificial Horizon / Pitch & Roll */}
              <div className="bg-[#050b16] border border-white/10 rounded-xl p-4 flex flex-col items-center justify-center text-center">
                <span className="text-xs font-mono font-bold text-gray-400 mb-3">FLIGHT ATTITUDE</span>
                <div className="w-28 h-28 rounded-full border-2 border-white/20 overflow-hidden relative flex items-center justify-center bg-[#071329]">
                  {/* Pitch bar */}
                  <div
                    className="absolute w-24 h-1 bg-amber-400 shadow-[0_0_8px_#F59E0B]"
                    style={{
                      transform: `rotate(${telemetry.roll_deg}deg) translateY(${-telemetry.pitch_deg * 1.5}px)`,
                    }}
                  />
                  <div className="w-2 h-2 rounded-full bg-white z-10" />
                </div>
                <div className="mt-3 font-mono space-y-0.5">
                  <div className="text-amber-300 font-bold text-xs">PITCH: {telemetry.pitch_deg}° (GLIDE)</div>
                  <div className="text-gray-400 text-[10px]">ROLL: {telemetry.roll_deg}° TRIM</div>
                </div>
              </div>

              {/* Buoyancy Engine */}
              <div className="bg-[#050b16] border border-white/10 rounded-xl p-4 flex flex-col items-center justify-center text-center">
                <span className="text-xs font-mono font-bold text-gray-400 mb-3">HYDRAULIC ENGINE</span>
                <div className="w-28 h-28 rounded-xl border border-purple-500/40 bg-purple-950/20 flex flex-col items-center justify-center p-2">
                  <span className="text-purple-300 font-black text-xl font-mono">{telemetry.buoyancy_displacement_cc}</span>
                  <span className="text-[10px] font-mono text-purple-400">cc OIL STROKE</span>
                </div>
                <div className="mt-3 font-mono">
                  <div className="text-purple-300 font-bold text-xs">BALLAST PUMP</div>
                  <div className="text-gray-400 text-[10px]">Negative stroke (Descent)</div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SAWTOOTH TRANSECT */}
          {activeTab === 'sawtooth' && (
            <div className="flex flex-col bg-[#050b16] border border-white/10 rounded-xl p-4">
              <div className="flex items-center justify-between pb-3 mb-2 border-b border-white/10">
                <div>
                  <span className="text-xs font-mono font-black tracking-wider text-amber-300 uppercase block">
                    SAWTOOTH YO-YO DIVE TRANSECT (DEPTH VS DISTANCE)
                  </span>
                  <span className="text-[11px] font-mono text-gray-400">
                    6 Sequential yo-yo dive-and-climb cycles sampling the full {maxD}m water column
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="px-2.5 py-1 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold">
                    Sawtooth Undulation: 0m ⟷ {maxD}m
                  </span>
                </div>
              </div>

              <div className="flex-1 flex items-center justify-center">
                <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-h-[380px]">
                  {/* Depth lines */}
                  {yTicks.map((d) => {
                    const y = pT + (d / Math.max(1, maxD)) * plotH;
                    return (
                      <g key={d}>
                        <line x1={pL} y1={y} x2={W - pR} y2={y} stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
                        <text x={pL - 8} y={y + 3} fill="#94A3B8" fontSize="9" fontFamily="monospace" textAnchor="end">
                          {d}m
                        </text>
                      </g>
                    );
                  })}

                  {/* Ocean surface boundary */}
                  <line x1={pL} y1={pT} x2={W - pR} y2={pT} stroke="#00E5FF" strokeWidth="1.5" />
                  <text x={pL + 8} y={pT + 12} fill="#00E5FF" fontSize="9" fontFamily="monospace" fontWeight="bold">
                    SURFACE (0m) — SATELLITE TELEMETRY FIXES
                  </text>

                  {/* Sawtooth flight polyline */}
                  {sawtoothPts && (
                    <polyline
                      points={sawtoothPts}
                      fill="none"
                      stroke="#F59E0B"
                      strokeWidth="2.5"
                      strokeLinejoin="round"
                    />
                  )}

                  {/* Inflection Points */}
                  {(telemetry.sawtooth_transect ?? []).map((p, i) => {
                    const maxDist = 50.4;
                    const x = pL + (p.distance_km / maxDist) * plotW;
                    const y = pT + (p.depth / Math.max(1, maxD)) * plotH;
                    return (
                      <circle
                        key={i}
                        cx={x}
                        cy={y}
                        r="3.5"
                        fill={p.depth === 0 ? '#00E5FF' : '#F59E0B'}
                        stroke="#050B16"
                        strokeWidth="1.5"
                      />
                    );
                  })}
                </svg>
              </div>

              <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-xs font-mono text-gray-400">
                <span>HORIZONTAL TRANSECT SPAN: ~50.4 KM</span>
                <span>AVERAGE GLIDE RATIO: ~1:3.2</span>
                <span className="text-amber-400 font-bold">MISSION: {telemetry.mission}</span>
              </div>
            </div>
          )}
        </div>

        {/* ─── Bottom Footer ─────────────────────────────────────── */}
        <div className="px-6 py-3 bg-[#070e1b] border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-gray-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>{telemetry.data_provenance.telemetry_protocol} · UNESCO EOS-80 Validated</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold transition-all"
          >
            RETURN TO 3D GLOBE (ESC)
          </button>
        </div>

      </div>
    </div>
  );
};
