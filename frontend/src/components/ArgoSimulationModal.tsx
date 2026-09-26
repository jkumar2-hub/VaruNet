/**
 * ArgoSimulationModal — VaruNet Tactical Ocean Digital Twin
 * Interactive Argo Float 10-Day Profiling Cycle Mission Simulator
 *
 * Simulates and visualizes the complete 5-stage oceanographic profiling cycle:
 *   Stage 1: Surface Descent (0 -> 1,000m) - Hydraulic oil bladder deflation
 *   Stage 2: Neutral Drift (1,000m) - 9-day deep ocean current trajectory
 *   Stage 3: Deep Profile Descent (1,000m -> 2,000m) - Abyssal water column entry
 *   Stage 4: Ascending CTD Sounding (2,000m -> 0m) - High-frequency sensor sampling
 *   Stage 5: Surface Transmission (0m) - GPS acquisition & Iridium telemetry burst
 *
 * SIH 2026 | PS 26067 | MoES / INCOIS
 */
import React, { useState, useEffect, useRef } from 'react';
import type { ArgoFloat } from '../api/client';

interface ArgoSimulationModalProps {
  float: ArgoFloat;
  onClose: () => void;
}

export const ArgoSimulationModal: React.FC<ArgoSimulationModalProps> = ({ float, onClose }) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1); // 1x, 2x, 5x
  const [cycleProgress, setCycleProgress] = useState<number>(0); // 0.0 to 1.0
  const animRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Animation Loop (full 10-day cycle takes ~16 seconds at 1x)
  useEffect(() => {
    const loop = (now: number) => {
      const dt = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      if (isPlaying) {
        setCycleProgress((prev) => {
          const next = prev + (dt / 16) * playbackSpeed;
          return next >= 1.0 ? 0 : next;
        });
      }
      animRef.current = requestAnimationFrame(loop);
    };

    lastTimeRef.current = performance.now();
    animRef.current = requestAnimationFrame(loop);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isPlaying, playbackSpeed]);

  // ─── Balanced 5-Phase Mission Cycle Mapping ────────────────────────────────
  // Rebalanced across [0.0, 1.0] cycleProgress so each phase receives smooth,
  // cinematic pacing without freezing or jumping, while calculating exact scientific days.
  let stage = 1;
  let stageTitle = 'Stage 1: Surface Descent';
  let stageDesc = 'Hydraulic oil pumped from external rubber bladder into internal reservoir. Density increases, initiating slow descent to parking depth.';
  let currentDepth = 0; // metres
  let bladderVolume = 0; // cc
  let buoyancyForce = -0.38; // Newtons
  let currentDay = 0; // days (0.0 to 10.0)
  let isAscendingSampling = false;

  const p = Math.max(0, Math.min(1, cycleProgress));

  if (p < 0.22) {
    // Stage 1: Descent to Parking Depth (0m -> 1,000m) | Day 0.0 -> 0.8
    stage = 1;
    stageTitle = 'Stage 1: Descent to Parking Depth';
    stageDesc = 'Float deflates external rubber bladder, increasing density above ambient seawater. Descends from surface to 1,000m parking depth at ~10 cm/s.';
    const f = p / 0.22;
    currentDay = f * 0.8;
    currentDepth = Math.round(f * 1000);
    bladderVolume = Math.round(250 * (1 - f));
    buoyancyForce = -0.38;
  } else if (p < 0.52) {
    // Stage 2: Neutral Drift at 1,000m | Day 0.8 -> 9.0
    stage = 2;
    stageTitle = 'Stage 2: Neutral Drift (Deep Subsurface Current)';
    stageDesc = 'Float drifts neutrally buoyant at 1,000m for ~8.2 days with zero battery drain. Carried by intermediate ocean currents (e.g. Antarctic Intermediate Water / Red Sea Outflow).';
    const f = (p - 0.22) / 0.30;
    currentDay = 0.8 + f * 8.2;
    // Realistic isobaric equilibrium undulation (±10m)
    currentDepth = Math.round(1000 + Math.sin(f * Math.PI * 4) * 10);
    bladderVolume = 0;
    buoyancyForce = 0.0;
  } else if (p < 0.70) {
    // Stage 3: Deep Profile Descent (1,000m -> 2,000m) | Day 9.0 -> 9.3
    stage = 3;
    stageTitle = 'Stage 3: Deep Profile Descent to Baseline';
    stageDesc = 'Internal valve draws remaining oil into internal reservoir. Float density increases, initiating dive from 1,000m to 2,000m abyssal sounding baseline.';
    const f = (p - 0.52) / 0.18;
    currentDay = 9.0 + f * 0.3;
    currentDepth = Math.round(1000 + f * 1000);
    bladderVolume = 0;
    buoyancyForce = -0.32;
  } else if (p < 0.90) {
    // Stage 4: Ascending Profile & CTD Soundings (2,000m -> 0m) | Day 9.3 -> 9.8
    stage = 4;
    stageTitle = 'Stage 4: Ascending Profile & High-Frequency CTD Sampling';
    stageDesc = 'High-pressure hydraulic pump inflates external rubber bladder. Vehicle ascends at ~10 cm/s continuously recording high-resolution Temperature, Salinity, and Pressure.';
    const f = (p - 0.70) / 0.20;
    currentDay = 9.3 + f * 0.5;
    currentDepth = Math.round(2000 * (1 - f));
    bladderVolume = Math.round(f * 250);
    buoyancyForce = 0.42;
    isAscendingSampling = true;
  } else {
    // Stage 5: Surface Satellite Uplink (0m) | Day 9.8 -> 10.0
    stage = 5;
    stageTitle = 'Stage 5: Surface Satellite Uplink & GPS Fix';
    stageDesc = 'At sea surface, antenna extends above waves. GPS fix is acquired and full 2,000m CTD soundings are transmitted via Iridium satellite telemetry to INCOIS & GDAC.';
    const f = (p - 0.90) / 0.10;
    currentDay = 9.8 + f * 0.2;
    currentDepth = Math.round(Math.abs(Math.sin(f * Math.PI * 4)) * 3);
    bladderVolume = 250;
    buoyancyForce = 0.48;
  }

  // Simulated physical sensor readings based on depth
  const tempEst = 2.4 + (28.2 - 2.4) * Math.exp(-currentDepth / 240);
  const salEst = 34.6 + 0.95 * Math.exp(-currentDepth / 390);
  const pressureDbar = (currentDepth * 1.025).toFixed(1);

  // SVG Water Column Dimensions (Container 340px)
  const colH = 340;
  // Position float: 0m is at top (12px), 2000m is near bottom (268px)
  const floatY = (currentDepth / 2000) * (colH - 74) + 12;

  return (
    <div
      className="fixed inset-0 z-[99999999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl bg-[#060a14] border border-[#00f0ff]/40 rounded-2xl shadow-[0_0_80px_rgba(0,240,255,0.25)] flex flex-col overflow-hidden text-white font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#080e1c] border-b border-white/10 select-none">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_12px_#00F0FF] animate-pulse" />
            <div>
              <div className="flex items-center gap-3">
                <span className="text-[16px] font-mono font-black text-cyan-300 tracking-wider">
                  ARGO FLOAT 10-DAY PROFILING CYCLE SIMULATOR
                </span>
                <span className="text-[11px] font-mono px-2.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 font-black">
                  WMO {float.wmo_id}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 font-bold">
                  {float.platform_type || 'PROVOR-CTS4'}
                </span>
              </div>
              <div className="text-[11px] font-mono text-gray-400 mt-0.5">
                Physical Hydraulics, Buoyancy Engine & In-Situ CTD Soundings Reconstruction
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all text-sm font-mono cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* MAIN BODY */}
        <div className="p-6 grid grid-cols-12 gap-6 bg-[#040810]">
          {/* LEFT: 2D Ocean Depth Column Animation */}
          <div className="col-span-4 bg-[#060c18] border border-white/10 rounded-xl p-4 flex flex-col items-center relative overflow-hidden select-none">
            <div className="text-[11px] font-mono font-bold text-cyan-300 mb-2 w-full flex justify-between">
              <span>WATER COLUMN</span>
              <span className="text-emerald-400 font-black">{currentDepth} m</span>
            </div>

            {/* Depth Tank Graphic */}
            <div className="relative w-full h-[340px] rounded-lg overflow-hidden border border-white/10 bg-gradient-to-b from-[#0284c7]/40 via-[#033b8a]/60 to-[#020b1e]">
              {/* Depth Grid Lines */}
              {[
                { d: 0, label: '0m Surface' },
                { d: 500, label: '500m' },
                { d: 1000, label: '1000m Park Depth' },
                { d: 1500, label: '1500m' },
                { d: 2000, label: '2000m Abyssal' },
              ].map((tick) => (
                <div
                  key={tick.d}
                  className="absolute w-full border-b border-white/15 flex justify-between px-2 text-[9px] font-mono text-gray-400 pointer-events-none"
                  style={{ top: `${(tick.d / 2000) * (colH - 24)}px` }}
                >
                  <span>{tick.label}</span>
                </div>
              ))}

              {/* Stage 2 Subsurface Current Drift Streamers */}
              {stage === 2 && (
                <div
                  className="absolute w-full pointer-events-none overflow-hidden"
                  style={{ top: '136px', height: '56px' }}
                >
                  <div className="w-full h-full flex flex-col justify-between py-1 px-3 opacity-60 bg-cyan-900/15 border-y border-cyan-400/20">
                    <span className="text-[8px] font-mono font-bold text-cyan-300 animate-pulse tracking-wider">
                      ≋ ≋ 1,000m Subsurface Current Vector (0.12 m/s Eastward) ≋ ≋
                    </span>
                    <span className="text-[7.5px] font-mono text-cyan-400/80 text-right">
                      Isobaric Neutral Density Layer ≋
                    </span>
                  </div>
                </div>
              )}

              {/* Stage 4 Ascending CTD sampling beam effect */}
              {isAscendingSampling && (
                <div
                  className="absolute w-full pointer-events-none"
                  style={{
                    top: `${Math.min(colH - 20, floatY + 84)}px`,
                    bottom: 0,
                    background: 'linear-gradient(to bottom, rgba(16, 185, 129, 0.45), rgba(6, 182, 212, 0.1) 75%, transparent)',
                  }}
                >
                  <div className="w-full text-center text-[8px] font-mono font-bold text-emerald-300 animate-pulse mt-2">
                    ⚡ CTD SOUNDINGS (2 Hz)
                  </div>
                </div>
              )}

              {/* Stage 5 Surface Transmission Radiance */}
              {stage === 5 && (
                <div className="absolute top-1 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none z-10">
                  <div className="flex items-center gap-1.5 bg-cyan-950/95 border border-cyan-400/90 px-2.5 py-0.5 rounded-full shadow-[0_0_15px_#00F0FF] animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                    <span className="text-[8.5px] font-mono text-cyan-200 font-black tracking-wide">
                      📡 IRIDIUM UPLINK ACTIVE
                    </span>
                  </div>
                </div>
              )}

              {/* Argo Float Vehicle Model Graphic (Synchronous 60 FPS positioning without CSS lag) */}
              <div
                className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none z-20"
                style={{ top: `${floatY}px`, willChange: 'top' }}
              >
                {/* Float Antenna */}
                <div className="w-1 h-5 bg-gradient-to-t from-gray-300 to-amber-400 rounded-t" />
                {/* Float Body (High-pressure Aluminum Hull) */}
                <div className="w-7 h-14 bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-500 rounded-md shadow-[0_0_15px_rgba(245,158,11,0.5)] border border-yellow-200 flex flex-col justify-between items-center py-1">
                  <div className="w-4 h-1.5 bg-black/70 rounded-sm" />
                  <span className="text-[6.5px] font-mono font-black text-black">ARGO</span>
                  <div className="w-5 h-2 bg-emerald-950/90 rounded border border-emerald-400/80 flex items-center justify-center">
                    <span className="text-[5.5px] font-mono font-bold text-emerald-300">CTD</span>
                  </div>
                </div>
                {/* External Rubber Oil Bladder (Expands/Contracts) */}
                <div
                  className="w-5 bg-gradient-to-b from-gray-600 to-black rounded-b-full border border-white/20"
                  style={{ height: `${Math.max(3, (bladderVolume / 250) * 12)}px` }}
                />
              </div>
            </div>

            {/* Depth Gauge Pill */}
            <div className="mt-3 w-full grid grid-cols-2 gap-2 text-[10px] font-mono">
              <div className="bg-black/60 p-1.5 rounded border border-white/10">
                <span className="text-gray-400 block">PRESSURE</span>
                <span className="text-cyan-300 font-bold">{pressureDbar} dbar</span>
              </div>
              <div className="bg-black/60 p-1.5 rounded border border-white/10">
                <span className="text-gray-400 block">OIL BLADDER</span>
                <span className="text-amber-300 font-bold">{bladderVolume} cc</span>
              </div>
            </div>
          </div>

          {/* RIGHT: Mission Timeline, Real-time CTD Telemetry & Stage Blueprint */}
          <div className="col-span-8 flex flex-col justify-between space-y-4">
            {/* Active Stage Banner */}
            <div className="bg-[#091122] border border-[#00f0ff]/30 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[13px] font-mono font-black text-cyan-300 uppercase tracking-wide flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
                  {stageTitle}
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/10 text-gray-300 font-bold">
                  Day {currentDay.toFixed(1)} / 10.0
                </span>
              </div>
              <p className="text-[12px] font-sans text-gray-300 leading-relaxed">
                {stageDesc}
              </p>
            </div>

            {/* Interactive 5-Stage Stepper Ribbon */}
            <div className="grid grid-cols-5 gap-2">
              {[
                { id: 1, name: 'Descent', range: '0–0.8d', depth: '0→1000m', pJump: 0.01 },
                { id: 2, name: 'Parking Drift', range: '0.8–9d', depth: '1000m', pJump: 0.23 },
                { id: 3, name: 'Deep Dive', range: '9–9.3d', depth: '1000→2000m', pJump: 0.53 },
                { id: 4, name: 'CTD Ascent', range: '9.3–9.8d', depth: '2000→0m', pJump: 0.71 },
                { id: 5, name: 'Satellite Uplink', range: '9.8–10d', depth: '0m', pJump: 0.91 },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setCycleProgress(s.pJump);
                  }}
                  className={`p-2 rounded-lg text-left border font-mono transition-all cursor-pointer ${
                    stage === s.id
                      ? 'bg-cyan-500/20 border-cyan-400 shadow-[0_0_12px_rgba(0,240,255,0.3)]'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <div className={`text-[10px] font-black ${stage === s.id ? 'text-cyan-300' : 'text-gray-400'}`}>
                    {s.name}
                  </div>
                  <div className="text-[9px] text-gray-400">{s.depth}</div>
                  <div className="text-[8px] text-gray-500">{s.range}</div>
                </button>
              ))}
            </div>

            {/* In-Situ CTD Telemetry Readouts */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[#060c18] border border-white/10 rounded-xl p-3.5 flex flex-col justify-between">
                <span className="text-[10px] font-mono text-gray-400 font-bold uppercase">SEA TEMPERATURE</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-[22px] font-mono font-black text-rose-400">{tempEst.toFixed(2)}</span>
                  <span className="text-[12px] font-mono text-gray-400">°C</span>
                </div>
                <span className="text-[9px] font-mono text-gray-500">SBE-41CP Micro-Thermistor</span>
              </div>

              <div className="bg-[#060c18] border border-white/10 rounded-xl p-3.5 flex flex-col justify-between">
                <span className="text-[10px] font-mono text-gray-400 font-bold uppercase">PRACTICAL SALINITY</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-[22px] font-mono font-black text-emerald-400">{salEst.toFixed(2)}</span>
                  <span className="text-[12px] font-mono text-gray-400">PSU</span>
                </div>
                <span className="text-[9px] font-mono text-gray-500">Conductivity Cell Electrode</span>
              </div>

              <div className="bg-[#060c18] border border-white/10 rounded-xl p-3.5 flex flex-col justify-between">
                <span className="text-[10px] font-mono text-gray-400 font-bold uppercase">BUOYANCY FORCE</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className={`text-[22px] font-mono font-black ${stage >= 4 ? 'text-cyan-400' : stage === 2 ? 'text-yellow-400' : 'text-blue-400'}`}>
                    {buoyancyForce >= 0 ? `+${buoyancyForce.toFixed(2)}` : buoyancyForce.toFixed(2)}
                  </span>
                  <span className="text-[12px] font-mono text-gray-400">N</span>
                </div>
                <span className="text-[9px] font-mono text-gray-500">
                  {stage === 2 ? 'Neutrally Buoyant' : stage >= 4 ? 'Positive Buoyancy' : 'Negative Buoyancy'}
                </span>
              </div>
            </div>

            {/* Controls Bar */}
            <div className="bg-[#070d1a] border border-white/10 rounded-xl p-3 flex items-center justify-between">
              {/* Play / Pause & Speed */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="px-3.5 py-1.5 rounded-lg bg-cyan-500/25 border border-cyan-400 hover:bg-cyan-500/40 text-cyan-300 font-mono text-[12px] font-bold transition-all flex items-center gap-1.5 shadow-[0_0_10px_rgba(0,240,255,0.3)] cursor-pointer"
                >
                  {isPlaying ? '⏸ PAUSE' : '▶ PLAY SIMULATION'}
                </button>
                <div className="flex items-center gap-1 bg-black/40 p-1 rounded-lg border border-white/10 text-[10px] font-mono">
                  <span className="text-gray-500 px-1 font-bold">SPEED:</span>
                  {[1, 2, 5].map((spd) => (
                    <button
                      key={spd}
                      onClick={() => setPlaybackSpeed(spd)}
                      className={`px-2 py-0.5 rounded font-black transition-all cursor-pointer ${
                        playbackSpeed === spd
                          ? 'bg-cyan-400 text-black shadow-[0_0_8px_#00F0FF]'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Scrubber slider */}
              <div className="flex items-center gap-3 w-1/2">
                <span className="text-[10px] font-mono text-gray-400">SCRUB:</span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.002}
                  value={cycleProgress}
                  onChange={(e) => {
                    setIsPlaying(false);
                    setCycleProgress(Number(e.target.value));
                  }}
                  className="w-full accent-[#00f0ff] h-1.5 bg-gray-800 rounded-lg cursor-pointer"
                />
                <span className="text-[11px] font-mono font-bold text-cyan-300 min-w-[42px]">
                  {currentDay.toFixed(1)}d
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
