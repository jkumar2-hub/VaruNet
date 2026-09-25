/**
 * SpatiotemporalController — VaruNet Tactical Ocean Digital Twin
 * 4D Spatiotemporal Mission Controller Bar (Mounted at Bottom of 3D Globe Screen)
 *
 * Provides instant scrubbing across the 12-month annual monsoonal cycle,
 * Play/Pause animation looping, and continuous depth navigation.
 *
 * SIH 2026 | PS 26067 | MoES / INCOIS
 */
import React from 'react';

interface SpatiotemporalControllerProps {
  timestamp: string;
  setTimestamp: (t: string) => void;
  animating: boolean;
  setAnimating: (a: boolean) => void;
  depth: number;
  setDepth: (d: number) => void;
  variable: string;
  isExpanded?: boolean;
  setIsExpanded?: (expanded: boolean) => void;
}

const MONTHS = [
  { num: 1,  name: 'JAN', season: 'NE Monsoon',  color: '#38bdf8' },
  { num: 2,  name: 'FEB', season: 'NE Monsoon',  color: '#38bdf8' },
  { num: 3,  name: 'MAR', season: 'Transition',  color: '#10b981' },
  { num: 4,  name: 'APR', season: 'Transition',  color: '#10b981' },
  { num: 5,  name: 'MAY', season: 'Pre-Monsoon', color: '#f59e0b' },
  { num: 6,  name: 'JUN', season: 'SW Monsoon',  color: '#f97316' },
  { num: 7,  name: 'JUL', season: 'SW Monsoon',  color: '#ef4444' },
  { num: 8,  name: 'AUG', season: 'SW Monsoon',  color: '#ef4444' },
  { num: 9,  name: 'SEP', season: 'SW Monsoon',  color: '#f97316' },
  { num: 10, name: 'OCT', season: 'Transition',  color: '#10b981' },
  { num: 11, name: 'NOV', season: 'NE Monsoon',  color: '#38bdf8' },
  { num: 12, name: 'DEC', season: 'NE Monsoon',  color: '#38bdf8' },
];

export const SpatiotemporalController: React.FC<SpatiotemporalControllerProps> = ({
  timestamp,
  setTimestamp,
  animating,
  setAnimating,
  depth,
  setDepth,
  variable,
  isExpanded: externalIsExpanded,
  setIsExpanded: externalSetIsExpanded,
}) => {
  const [internalExpanded, setInternalExpanded] = React.useState<boolean>(false);
  const isExpanded = externalIsExpanded !== undefined ? externalIsExpanded : internalExpanded;
  const setIsExpanded = externalSetIsExpanded || setInternalExpanded;

  // Parse active month from timestamp (default to 7)
  let activeMonth = 7;
  let year = '2026';
  if (timestamp) {
    const parts = timestamp.split('-');
    if (parts.length >= 2) {
      year = parts[0];
      activeMonth = parseInt(parts[1], 10) || 7;
    }
  }

  const handleSelectMonth = (mNum: number) => {
    const mStr = String(mNum).padStart(2, '0');
    setTimestamp(`${year}-${mStr}-15`);
  };

  const currentMonthObj = MONTHS.find((m) => m.num === activeMonth) || MONTHS[6];

  // Collapsed Tab Mode: sleek floating pill button placed with clear margin above footer
  if (!isExpanded) {
    return (
      <div className="absolute bottom-9 left-0 right-0 z-20 flex justify-center pointer-events-auto select-none font-mono">
        <button
          onClick={() => setIsExpanded(true)}
          className="group flex items-center gap-3 bg-[#060a14]/92 hover:bg-[#091326]/95 border border-[#00f0ff]/40 hover:border-[#00f0ff] px-4 py-2 rounded-full shadow-[0_0_30px_rgba(0,0,0,0.85)] backdrop-blur-md transition-all cursor-pointer hover:shadow-[0_0_20px_rgba(0,240,255,0.35)]"
          title="Click to expand 4D Spatiotemporal Controller"
        >
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${animating ? 'bg-emerald-400 animate-ping' : 'bg-cyan-400 shadow-[0_0_8px_#00f0ff]'}`} />
            <span className="text-[11px] font-mono font-black text-cyan-300 tracking-wide uppercase">
              ⏱️ 4D TEMPORAL DYNAMICS
            </span>
          </div>

          <span className="text-gray-600 font-normal">|</span>

          <div className="flex items-center gap-1.5 text-[10.5px]">
            <span className="text-white font-bold">{year} {currentMonthObj.name}</span>
            <span
              className="px-1.5 py-0.5 rounded font-black text-[9px] border"
              style={{
                color: currentMonthObj.color,
                borderColor: `${currentMonthObj.color}60`,
                backgroundColor: `${currentMonthObj.color}15`,
              }}
            >
              {currentMonthObj.season}
            </span>
            <span className="text-emerald-400 font-bold ml-1">· {depth}m</span>
            {animating && (
              <span className="text-cyan-300 font-black ml-1 animate-pulse">[PLAYING ▶]</span>
            )}
          </div>

          <span className="text-[10px] font-mono font-black text-cyan-400 bg-cyan-950/70 border border-cyan-500/40 px-2.5 py-0.5 rounded-full group-hover:bg-cyan-400 group-hover:text-black transition-all flex items-center gap-1">
            <span>▲</span>
            <span>EXPAND</span>
          </span>
        </button>
      </div>
    );
  }

  // Expanded HUD Mode: complete 12-month monsoonal ribbon and timeline controls
  return (
    <div className="absolute bottom-4 left-6 right-6 z-20 flex flex-col items-center pointer-events-auto select-none font-mono">
      {/* 4D Spatiotemporal Mission Deck HUD */}
      <div className="w-full max-w-4xl bg-[#060a14]/95 border border-[#00f0ff]/40 backdrop-blur-md px-5 py-3 rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.9)] flex flex-col gap-2.5">
        
        {/* Top Info Bar */}
        <div className="flex items-center justify-between text-[11px] border-b border-white/10 pb-2">
          {/* Regime Badge */}
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#00F0FF] animate-pulse" />
            <span className="font-black text-cyan-300 tracking-wide uppercase">
              4D TEMPORAL DYNAMICS // {year} {currentMonthObj.name} · {variable.toUpperCase()}
            </span>
            <span
              className="px-2 py-0.5 rounded font-black text-[9.5px] border"
              style={{
                color: currentMonthObj.color,
                borderColor: `${currentMonthObj.color}60`,
                backgroundColor: `${currentMonthObj.color}15`,
              }}
            >
              {currentMonthObj.season}
            </span>
          </div>

          {/* Quick Depth Slices & Minimize Button */}
          <div className="flex items-center gap-1.5 text-[10px]">
            <span className="text-gray-400 font-bold mr-1">DEPTH:</span>
            {[
              { d: 0, label: '0m' },
              { d: 100, label: '100m' },
              { d: 500, label: '500m' },
              { d: 1000, label: '1km' },
              { d: 2000, label: '2km' },
            ].map((slice) => (
              <button
                key={slice.d}
                onClick={() => setDepth(slice.d)}
                className={`px-2 py-0.5 rounded border transition-all ${
                  depth === slice.d
                    ? 'bg-emerald-500/25 border-emerald-400 text-emerald-300 font-black shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                    : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                }`}
              >
                {slice.label}
              </button>
            ))}
            <span className="text-emerald-400 font-black ml-1 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-500/30">
              {depth}m
            </span>

            {/* Minimize button to collapse back into tab */}
            <button
              onClick={() => setIsExpanded(false)}
              className="ml-2 px-2.5 py-0.5 rounded-lg border border-white/20 hover:border-cyan-400 text-gray-300 hover:text-white bg-white/5 hover:bg-cyan-950/50 text-[10px] font-black flex items-center gap-1 transition-all"
              title="Minimize 4D Spatiotemporal Deck"
            >
              <span>▼</span>
              <span>MINIMIZE</span>
            </button>
          </div>
        </div>

        {/* 12-Month Interactive Scrubber Ribbon */}
        <div className="flex items-center gap-2">
          {/* Play / Pause Button */}
          <button
            onClick={() => setAnimating(!animating)}
            className={`px-4 py-2 rounded-xl font-black text-[12px] border transition-all flex items-center gap-2 shadow-lg shrink-0 ${
              animating
                ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200 shadow-[0_0_15px_rgba(0,240,255,0.4)] animate-pulse'
                : 'bg-white/10 border-white/20 text-white hover:bg-cyan-500/20 hover:border-cyan-400'
            }`}
          >
            <span>{animating ? '⏸' : '▶'}</span>
            <span>{animating ? 'PAUSE' : 'PLAY 4D'}</span>
          </button>

          {/* 12 Month Buttons */}
          <div className="grid grid-cols-12 gap-1.5 flex-1">
            {MONTHS.map((m) => {
              const isCur = m.num === activeMonth;
              return (
                <button
                  key={m.num}
                  onClick={() => handleSelectMonth(m.num)}
                  className={`py-1.5 rounded-lg border text-center transition-all ${
                    isCur
                      ? 'bg-cyan-400 text-black border-cyan-300 font-black shadow-[0_0_15px_rgba(0,240,255,0.6)] scale-[1.03]'
                      : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/15 hover:text-white font-bold'
                  }`}
                >
                  <div className="text-[11px] leading-tight">{m.name}</div>
                  <div
                    className="text-[7.5px] font-black uppercase opacity-80"
                    style={{ color: isCur ? '#000' : m.color }}
                  >
                    {m.season.split(' ')[0]}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
