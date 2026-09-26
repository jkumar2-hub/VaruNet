/**
 * TopBar — VaruNet
 * Variable dropdown (synced with sidebar) + time display + SAR drift toggle
 * + data sources button + coordinate readout.
 *
 * Design: clean scientific, primary color #0F6E56 teal
 */
interface TopBarProps {
  variable: string;
  setVariable: (v: string) => void;
  cursorCoord: { lat: number; lon: number } | null;
  driftMode: boolean;
  onToggleDrift: () => void;
  showFloats: boolean;
  setShowFloats: (v: boolean) => void;
  showCurrentVectors: boolean;
  setShowCurrentVectors: (v: boolean) => void;
  onOpenSources: () => void;
  dataStatus: 'real' | 'cached' | 'model' | 'loading';
}

const VARIABLE_OPTIONS = [
  { value: 'temperature', label: 'Temperature' },
  { value: 'salinity', label: 'Salinity' },
  { value: 'density', label: 'Density' },
];

const STATUS_CONFIG = {
  real:    { dot: 'bg-emerald-500', text: 'Live Data', cls: 'text-emerald-700' },
  cached:  { dot: 'bg-amber-400',   text: 'Cached',    cls: 'text-amber-700' },
  model:   { dot: 'bg-purple-400',  text: 'Model',     cls: 'text-purple-700' },
  loading: { dot: 'bg-gray-300 animate-pulse', text: 'Loading…', cls: 'text-gray-400' },
};

export function TopBar({
  variable,
  setVariable,
  cursorCoord,
  driftMode,
  onToggleDrift,
  showFloats,
  setShowFloats,
  showCurrentVectors,
  setShowCurrentVectors,
  onOpenSources,
  dataStatus,
}: TopBarProps) {
  const status = STATUS_CONFIG[dataStatus];

  return (
    <header
      className="fixed top-0 left-0 right-64 h-12 bg-white/95 border-b border-gray-200 shadow-sm z-40 flex items-center px-4 gap-4"
      style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
    >
      {/* Brand */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="w-2.5 h-2.5 rounded-full bg-[#0F6E56]" />
        <span className="text-[14px] font-semibold text-[#0F6E56] tracking-tight">VaruNet</span>
        <span className="text-[10px] text-gray-400 hidden sm:block">INCOIS · PS 26067</span>
      </div>

      <div className="w-px h-5 bg-gray-200 mx-1" />

      {/* Variable Dropdown */}
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] text-gray-400 font-medium">Variable</span>
        <select
          value={variable}
          onChange={(e) => setVariable(e.target.value)}
          className="text-[12px] font-medium text-[#2C2C2A] border border-gray-200 rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-[#0F6E56] cursor-pointer"
        >
          {VARIABLE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="w-px h-5 bg-gray-200 mx-1" />

      {/* Layer Toggles */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setShowFloats(!showFloats)}
          className={`flex items-center gap-1.5 text-[11px] font-medium px-2 py-1 rounded border transition-all ${
            showFloats
              ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
              : 'bg-gray-50 border-gray-200 text-gray-400'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          Argo Floats
        </button>
        <button
          onClick={() => setShowCurrentVectors(!showCurrentVectors)}
          className={`flex items-center gap-1.5 text-[11px] font-medium px-2 py-1 rounded border transition-all ${
            showCurrentVectors
              ? 'bg-teal-50 border-teal-300 text-teal-700'
              : 'bg-gray-50 border-gray-200 text-gray-400'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-teal-400" />
          Currents
        </button>
      </div>

      <div className="w-px h-5 bg-gray-200 mx-1" />

      {/* SAR Drift Mode Toggle */}
      <button
        onClick={onToggleDrift}
        className={`flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-md border-2 transition-all ${
          driftMode
            ? 'bg-[#993C1D] border-[#993C1D] text-white shadow-md'
            : 'bg-white border-[#993C1D]/40 text-[#993C1D] hover:border-[#993C1D]'
        }`}
      >
        {driftMode ? '✕ Cancel Drift' : '⊕ SAR Drift'}
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Data Status Indicator */}
      <div className="flex items-center gap-1.5">
        <span className={`w-2 h-2 rounded-full ${status.dot}`} />
        <span className={`text-[11px] font-medium ${status.cls}`}>{status.text}</span>
      </div>

      {/* Cursor Coordinate */}
      {cursorCoord && (
        <div className="text-[10px] font-mono text-gray-500 bg-gray-50 px-2 py-1 rounded border border-gray-200 hidden md:block">
          {cursorCoord.lat.toFixed(2)}°N &nbsp; {cursorCoord.lon.toFixed(2)}°E
        </div>
      )}

      {/* Data Sources Button */}
      <button
        onClick={onOpenSources}
        className="flex items-center gap-1 text-[11px] font-medium text-[#534AB7] hover:text-[#3d37a0] px-2 py-1 rounded border border-[#534AB7]/30 hover:bg-[#534AB7]/5 transition-all"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Sources
      </button>
    </header>
  );
}
