/**
 * GliderSimulationModal — VaruNet Tactical Ocean Digital Twin
 * Autonomous Underwater Glider Sawtooth (Yo-Yo) Mission Flight Simulator
 *
 * Simulates and visualizes the complete glider flight dynamic cycle:
 *   Stage 1: Negative Buoyancy Dive (0 -> 1,000m) - Pitch -17°, Battery pack slides forward
 *   Stage 2: Apogee Inflection (1,000m) - Hydraulic pump inflates external oil bladder
 *   Stage 3: Positive Buoyancy Climb (1,000m -> 0m) - Pitch +17°, Hydrodynamic lift on delta wings
 *   Stage 4: Surface Apogee (0m) - Tail antenna exposed, Iridium packet burst & GPS fix
 *
 * SIH 2026 | PS 26067 | MoES / INCOIS
 */
import React, { useState, useEffect, useRef } from 'react';
import type { GliderMission } from '../api/client';

interface GliderSimulationModalProps {
  glider: GliderMission;
  onClose: () => void;
}

export const GliderSimulationModal: React.FC<GliderSimulationModalProps> = ({ glider, onClose }) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [flightProgress, setFlightProgress] = useState<number>(0); // 0.0 to 1.0 (representing 0 to 6 hours)
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

  // Animation Loop (6-hour glide cycle takes ~12 seconds at 1x)
  useEffect(() => {
    const loop = (now: number) => {
      const dt = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      if (isPlaying) {
        setFlightProgress((prev) => {
          const next = prev + (dt / 12) * playbackSpeed;
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

  const maxDepth = glider.depth_max || 1000;
  const currentHours = flightProgress * 6; // 0 to 6 hours

  let stage = 1;
  let stageTitle = 'Glide Stage 1: Negative Buoyancy Dive';
  let stageDesc = 'External oil bladder deflated. Internal pitch mass (battery pack) rolled forward. Glider dives downward at -17° pitch at 0.35 m/s horizontal velocity.';
  let currentDepth = 0;
  let pitchAngle = -17; // degrees
  let horizontalDistanceKm = 0;
  let buoyancyState = 'Negative (-250cc)';
  let batteryDrawWatts = 1.2; // ultra-low baseline

  if (flightProgress < 0.48) {
    // Diving down
    stage = 1;
    stageTitle = 'Glide Stage 1: Negative Buoyancy Dive';
    stageDesc = 'Glider is descending under gravity and hydrodynamic lift. Fixed wings generate forward propulsion from vertical sink rate.';
    const f = flightProgress / 0.48;
    currentDepth = Math.round(f * maxDepth);
    pitchAngle = -17;
    horizontalDistanceKm = Number((f * 3.5).toFixed(2));
    buoyancyState = 'Negative (Deflated)';
    batteryDrawWatts = 1.4;
  } else if (flightProgress < 0.52) {
    // Turnaround at depth
    stage = 2;
    stageTitle = 'Glide Stage 2: Deep Inflection Point';
    stageDesc = 'At maximum operating depth (1,000m), hydraulic pump engages. Oil is transferred to external rubber bladder, changing total displaced volume and shifting buoyancy to positive.';
    currentDepth = maxDepth;
    pitchAngle = 0;
    horizontalDistanceKm = 3.6;
    buoyancyState = 'Pumping (+450cc)';
    batteryDrawWatts = 42.0; // pump spike
  } else if (flightProgress < 0.95) {
    // Climbing up
    stage = 3;
    stageTitle = 'Glide Stage 3: Positive Buoyancy Ascent';
    stageDesc = 'Glider glides upward towards sea surface with +17° upward pitch. Continuous CTD, dissolved oxygen, and acoustic backscatter sensors sample the water column.';
    const f = (flightProgress - 0.52) / 0.43;
    currentDepth = Math.round(maxDepth * (1 - f));
    pitchAngle = 17;
    horizontalDistanceKm = Number((3.6 + f * 3.5).toFixed(2));
    buoyancyState = 'Positive (Inflated)';
    batteryDrawWatts = 1.5;
  } else {
    // Surface transmission
    stage = 4;
    stageTitle = 'Glide Stage 4: Surface Apogee & Satellite Uplink';
    stageDesc = 'Glider breaches surface with aft tail antenna pitched at 45°. Establishes Iridium satellite link with INCOIS ground station, downloads next waypoint, and uploads high-res transect data.';
    currentDepth = 0;
    pitchAngle = 45;
    horizontalDistanceKm = 7.2;
    buoyancyState = 'Fully Buoyant (+500cc)';
    batteryDrawWatts = 18.5; // Iridium modem active
  }

  // Sawtooth SVG Path
  const svgW = 320;
  const svgH = 220;
  const diveX = 140;
  const surfX2 = 280;

  // Glider coordinates on SVG
  let gx = 20;
  let gy = 20;
  if (flightProgress <= 0.48) {
    const f = flightProgress / 0.48;
    gx = 20 + f * (diveX - 20);
    gy = 20 + f * (svgH - 40);
  } else if (flightProgress <= 0.52) {
    gx = diveX;
    gy = svgH - 40;
  } else if (flightProgress <= 0.95) {
    const f = (flightProgress - 0.52) / 0.43;
    gx = diveX + f * (surfX2 - diveX);
    gy = (svgH - 40) - f * (svgH - 60);
  } else {
    gx = surfX2;
    gy = 20;
  }

  return (
    <div
      className="fixed inset-0 z-[99999999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl bg-[#060a14] border border-[#f59e0b]/40 rounded-2xl shadow-[0_0_80px_rgba(245,158,11,0.2)] flex flex-col overflow-hidden text-white font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#120c04] border-b border-white/10 select-none">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-amber-400 shadow-[0_0_12px_#F59E0B] animate-pulse" />
            <div>
              <div className="flex items-center gap-3">
                <span className="text-[16px] font-mono font-black text-amber-300 tracking-wider">
                  AUTONOMOUS GLIDER SAWTOOTH FLIGHT SIMULATOR
                </span>
                <span className="text-[11px] font-mono px-2.5 py-0.5 rounded bg-amber-950/80 border border-amber-500/50 text-amber-300 font-black">
                  {glider.glider_id}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-gray-300">
                  SLOCUM G3 / SEAGLIDER
                </span>
              </div>
              <div className="text-[11px] font-mono text-gray-400 mt-0.5">
                Sawtooth (Yo-yo) Undulating Trajectory, Mass-Shifter & Hydraulic Buoyancy Engine
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all text-sm font-mono"
          >
            ✕
          </button>
        </div>

        {/* MAIN BODY */}
        <div className="p-6 grid grid-cols-12 gap-6 bg-[#040810]">
          {/* LEFT: Sawtooth (Yo-yo) Dynamic Flight Path */}
          <div className="col-span-5 bg-[#090d18] border border-white/10 rounded-xl p-4 flex flex-col items-center">
            <div className="text-[11px] font-mono font-bold text-amber-300 mb-2 w-full flex justify-between">
              <span>SAWTOOTH FLIGHT PROFILE</span>
              <span className="text-cyan-400 font-black">{currentDepth} m</span>
            </div>

            <div className="relative w-full h-[250px] rounded-lg overflow-hidden border border-white/10 bg-gradient-to-b from-[#0369a1]/30 via-[#075985]/40 to-[#020b1e]">
              {/* Sea surface and depth markers */}
              <div className="absolute top-0 w-full border-b border-cyan-400/40 px-2 py-0.5 text-[8.5px] font-mono text-cyan-300">
                0m Sea Surface
              </div>
              <div className="absolute bottom-1 w-full border-t border-white/20 px-2 py-0.5 text-[8.5px] font-mono text-gray-400 flex justify-between">
                <span>{maxDepth}m Max Glide Depth</span>
                <span>Distance: {horizontalDistanceKm} km</span>
              </div>

              {/* Sawtooth Path Lines */}
              <svg className="w-full h-full" viewBox={`0 0 ${svgW} ${svgH}`}>
                {/* Dive Slope */}
                <line x1="20" y1="20" x2={diveX} y2={svgH - 40} stroke="#f59e0b" strokeWidth="2.5" strokeDasharray="4 2" />
                {/* Climb Slope */}
                <line x1={diveX} y1={svgH - 40} x2={surfX2} y2="20" stroke="#00f0ff" strokeWidth="2.5" strokeDasharray="4 2" />

                {/* Glider Diamond Vehicle Icon */}
                <g transform={`translate(${gx}, ${gy}) rotate(${pitchAngle})`}>
                  {/* Wings */}
                  <line x1="-12" y1="0" x2="12" y2="0" stroke="#f59e0b" strokeWidth="3" />
                  {/* Torpedo Body */}
                  <polygon points="14,0 -10,-4 -14,0 -10,4" fill="#fde047" stroke="#b45309" strokeWidth="1" />
                  {/* Tail Fin */}
                  <line x1="-12" y1="-5" x2="-8" y2="0" stroke="#f59e0b" strokeWidth="2" />
                </g>
              </svg>
            </div>

            {/* Flight Gauges */}
            <div className="mt-3 w-full grid grid-cols-2 gap-2 text-[10px] font-mono">
              <div className="bg-black/60 p-1.5 rounded border border-white/10">
                <span className="text-gray-400 block">PITCH ANGLE</span>
                <span className={`font-black text-[12px] ${pitchAngle < 0 ? 'text-blue-400' : pitchAngle > 0 ? 'text-amber-400' : 'text-gray-300'}`}>
                  {pitchAngle > 0 ? `+${pitchAngle}°` : `${pitchAngle}°`}
                </span>
              </div>
              <div className="bg-black/60 p-1.5 rounded border border-white/10">
                <span className="text-gray-400 block">BUOYANCY ENGINE</span>
                <span className="text-cyan-300 font-bold">{buoyancyState}</span>
              </div>
            </div>
          </div>

          {/* RIGHT: Flight Telemetry & Mission Systems */}
          <div className="col-span-7 flex flex-col justify-between space-y-4">
            {/* Active Stage Banner */}
            <div className="bg-[#120d04] border border-[#f59e0b]/30 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[13px] font-mono font-black text-amber-300 uppercase tracking-wide flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                  {stageTitle}
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/10 text-gray-300 font-bold">
                  {currentHours.toFixed(1)}h / 6.0h Yo-Yo Cycle
                </span>
              </div>
              <p className="text-[12px] font-sans text-gray-300 leading-relaxed">
                {stageDesc}
              </p>
            </div>

            {/* 4-Stage Navigation Ribbon */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 1, name: 'Glide Dive', hours: '0–2.9h', pitch: '-17°' },
                { id: 2, name: 'Oil Pump Turn', hours: '2.9–3.1h', pitch: '0°' },
                { id: 3, name: 'Glide Ascent', hours: '3.1–5.7h', pitch: '+17°' },
                { id: 4, name: 'Surface Uplink', hours: '5.7–6h', pitch: '+45°' },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    if (s.id === 1) setFlightProgress(0.2);
                    if (s.id === 2) setFlightProgress(0.5);
                    if (s.id === 3) setFlightProgress(0.75);
                    if (s.id === 4) setFlightProgress(0.98);
                  }}
                  className={`p-2 rounded-lg text-left border font-mono transition-all ${
                    stage === s.id
                      ? 'bg-amber-500/20 border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <div className={`text-[10px] font-black ${stage === s.id ? 'text-amber-300' : 'text-gray-400'}`}>
                    {s.name}
                  </div>
                  <div className="text-[9px] text-gray-400">{s.pitch}</div>
                  <div className="text-[8px] text-gray-500">{s.hours}</div>
                </button>
              ))}
            </div>

            {/* Telemetry Metrics */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[#060c18] border border-white/10 rounded-xl p-3 flex flex-col justify-between">
                <span className="text-[10px] font-mono text-gray-400 font-bold uppercase">FORWARD SPEED</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-[20px] font-mono font-black text-cyan-400">
                    {stage === 4 ? '0.05' : '0.38'}
                  </span>
                  <span className="text-[11px] font-mono text-gray-400">m/s</span>
                </div>
                <span className="text-[9px] font-mono text-gray-500">Hydrodynamic Lift</span>
              </div>

              <div className="bg-[#060c18] border border-white/10 rounded-xl p-3 flex flex-col justify-between">
                <span className="text-[10px] font-mono text-gray-400 font-bold uppercase">SYSTEM POWER</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className={`text-[20px] font-mono font-black ${batteryDrawWatts > 10 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {batteryDrawWatts.toFixed(1)}
                  </span>
                  <span className="text-[11px] font-mono text-gray-400">W</span>
                </div>
                <span className="text-[9px] font-mono text-gray-500">Lithium Pack 14.8V</span>
              </div>

              <div className="bg-[#060c18] border border-white/10 rounded-xl p-3 flex flex-col justify-between">
                <span className="text-[10px] font-mono text-gray-400 font-bold uppercase">MISSION TRANSECT</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-[20px] font-mono font-black text-amber-400">
                    {glider.transect.length}
                  </span>
                  <span className="text-[11px] font-mono text-gray-400">Waypoints</span>
                </div>
                <span className="text-[9px] font-mono text-gray-500">Autopilot Active</span>
              </div>
            </div>

            {/* Controls Bar */}
            <div className="bg-[#0b0803] border border-white/10 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="px-3.5 py-1.5 rounded-lg bg-amber-500/25 border border-amber-400 hover:bg-amber-500/40 text-amber-300 font-mono text-[12px] font-bold transition-all flex items-center gap-1.5 shadow-[0_0_10px_rgba(245,158,11,0.3)]"
                >
                  {isPlaying ? '⏸ PAUSE' : '▶ PLAY SIMULATION'}
                </button>
                <div className="flex items-center gap-1 bg-black/40 p-1 rounded-lg border border-white/10 text-[10px] font-mono">
                  <span className="text-gray-500 px-1 font-bold">SPEED:</span>
                  {[1, 2, 5].map((spd) => (
                    <button
                      key={spd}
                      onClick={() => setPlaybackSpeed(spd)}
                      className={`px-2 py-0.5 rounded font-black transition-all ${
                        playbackSpeed === spd
                          ? 'bg-amber-400 text-black shadow-[0_0_8px_#F59E0B]'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Scrubber */}
              <div className="flex items-center gap-3 w-1/2">
                <span className="text-[10px] font-mono text-gray-400">SCRUB:</span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.005}
                  value={flightProgress}
                  onChange={(e) => {
                    setIsPlaying(false);
                    setFlightProgress(Number(e.target.value));
                  }}
                  className="w-full accent-[#f59e0b] h-1.5 bg-gray-800 rounded-lg cursor-pointer"
                />
                <span className="text-[11px] font-mono font-bold text-amber-300 min-w-[42px]">
                  {currentHours.toFixed(1)}h
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
