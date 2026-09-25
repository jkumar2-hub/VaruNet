/**
 * RightSidebar — VaruNet
 * Depth slider, variable selector, model-vs-observed card, colorbar.
 * Layout: right edge of screen, full-height panel.
 *
 * Design: Clean scientific dashboard — teal primary (#0F6E56), near-black text (#2C2C2A),
 * white background, coral accent (#993C1D) for interactive highlights.
 */
import type { ProfileResponse } from '../api/client';

interface RightSidebarProps {
  variable: string;
  setVariable: (v: string) => void;
  depth: number;
  setDepth: (d: number) => void;
  profileData: ProfileResponse | null;
  profileLoading: boolean;
  cacheNotice: string | null;
  dataSource: string | null;
}

const DEPTH_MARKS = [0, 100, 200, 500, 1000, 1500, 2000];

const VARIABLES = [
  { value: 'temperature', label: 'Temperature', unit: '°C' },
  { value: 'salinity', label: 'Salinity', unit: 'PSU' },
  { value: 'density', label: 'Density', unit: 'kg/m³' },
];

function ColorbarStrip({ variable }: { variable: string }) {
  const gradients: Record<string, string> = {
    temperature:
      'linear-gradient(to top, #0A1931 0%, #0F6E56 25%, #00D2B4 55%, #F59E0B 80%, #E11D48 100%)',
    salinity:
      'linear-gradient(to top, #0F6E56 0%, #A7F3D0 100%)',
    density:
      'linear-gradient(to top, #1e3a5f 0%, #5b9bd5 50%, #e8f4f8 100%)',
  };

  const ranges: Record<string, [number, number, string]> = {
    temperature: [4, 32, '°C'],
    salinity: [32, 37, 'PSU'],
    density: [1026, 1030, 'kg/m³'],
  };

  const [min, max, unit] = ranges[variable] ?? [0, 1, ''];

  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">
        {unit}
      </span>
      <div className="flex gap-2 items-stretch">
        {/* Labels */}
        <div className="flex flex-col justify-between text-[10px] font-mono text-gray-500 py-0.5">
          <span>{max}</span>
          <span>{Math.round((min + max) / 2)}</span>
          <span>{min}</span>
        </div>
        {/* Bar */}
        <div
          className="w-4 h-40 rounded-full border border-gray-200"
          style={{ background: gradients[variable] ?? gradients.temperature }}
        />
      </div>
    </div>
  );
}

function ModelVsObsCard({ profile, variable }: { profile: ProfileResponse | null; variable: string }) {
  if (!profile) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
        <p className="text-xs font-semibold text-gray-500 mb-1">Model vs. Observed</p>
        <p className="text-[11px] text-gray-400">
          Click an Argo float marker to compare model predictions with real CTD observations.
        </p>
      </div>
    );
  }

  const rmse = variable === 'temperature' ? profile.rmse_temp : profile.rmse_salinity;
  const unit = variable === 'temperature' ? '°C' : 'PSU';
  const hasData = profile.depth_levels.length > 0;

  // Build mini comparison sparkline — last 5 surface points
  const n = Math.min(5, profile.depth_levels.length);
  const obs = variable === 'temperature' ? profile.observed_temp : profile.observed_salinity;
  const mdl = variable === 'temperature' ? profile.model_temp : profile.model_salinity;
  const hasRealObs = !profile.no_observation && obs !== null && obs.length > 0;

  return (
    <div className="rounded-lg border border-[#0F6E56]/30 bg-white p-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-[#2C2C2A]">{hasRealObs ? 'Model vs. Observed' : 'Model Estimate'}</p>
        <span className="text-[10px] font-mono text-[#0F6E56] bg-[#0F6E56]/8 px-1.5 py-0.5 rounded">
          WMO {profile.wmo_id}
        </span>
      </div>

      {!hasRealObs && (
        <p className="text-[10px] text-amber-600 font-mono">⚠ No real CTD observation — model estimate only</p>
      )}

      {hasData && (
        <>
          {/* RMSE badge */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-500">RMSE</span>
            <span
              className={`text-xs font-mono font-semibold ${
                rmse !== null && rmse < 0.5
                  ? 'text-emerald-600'
                  : rmse !== null && rmse < 1.5
                  ? 'text-amber-600'
                  : 'text-gray-400'
              }`}
            >
              {rmse !== null ? `${rmse} ${unit}` : 'N/A — no observation'}
            </span>
          </div>

          {/* Mini table: depth vs obs vs model */}
          <table className="w-full text-[10px] font-mono border-collapse">
            <thead>
              <tr className="text-gray-400">
                <th className="text-left pb-0.5">Depth (m)</th>
                {hasRealObs && <th className="text-right pb-0.5 text-[#0F6E56]">Obs</th>}
                <th className="text-right pb-0.5 text-[#534AB7]">Model</th>
                {hasRealObs && <th className="text-right pb-0.5 text-[#993C1D]">Δ</th>}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: n }).map((_, i) => {
                const obsVal = hasRealObs ? (obs as number[])[i] : undefined;
                const delta = obsVal !== undefined && mdl[i] !== undefined
                  ? Math.abs(obsVal - mdl[i]).toFixed(2)
                  : '–';
                return (
                  <tr key={i} className="border-t border-gray-100">
                    <td className="py-0.5 text-gray-500">{Math.round(profile.depth_levels[i])}</td>
                    {hasRealObs && <td className="py-0.5 text-right text-[#0F6E56]">{obsVal?.toFixed(1) ?? '–'}</td>}
                    <td className="py-0.5 text-right text-[#534AB7]">{mdl[i]?.toFixed(1) ?? '–'}</td>
                    {hasRealObs && <td className="py-0.5 text-right text-[#993C1D]">{delta}</td>}
                  </tr>
                );
              })}
            </tbody>
          </table>

          <p className="text-[10px] text-gray-400">{profile.data_source}</p>
        </>
      )}

      {!hasData && (
        <p className="text-[11px] text-amber-600">
          {profile.error ?? 'No profile data returned for this float.'}
        </p>
      )}
    </div>
  );
}

export function RightSidebar({
  variable,
  setVariable,
  depth,
  setDepth,
  profileData,
  profileLoading,
  cacheNotice,
  dataSource,
}: RightSidebarProps) {
  return (
    <aside
      className="fixed right-0 top-0 h-screen w-64 bg-white/95 border-l border-gray-200 shadow-xl z-30 flex flex-col overflow-y-auto"
      style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-100">
        <h2 className="text-[13px] font-semibold text-[#2C2C2A] tracking-tight">Controls</h2>
        <p className="text-[10px] text-gray-400 mt-0.5">INCOIS Ocean Data Visualizer</p>
      </div>

      <div className="flex-1 p-4 space-y-5">
        {/* Variable Selector */}
        <section>
          <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-widest mb-1.5">
            Variable
          </label>
          <div className="flex flex-col gap-1">
            {VARIABLES.map((v) => (
              <button
                key={v.value}
                onClick={() => setVariable(v.value)}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-[12px] font-medium transition-all border ${
                  variable === v.value
                    ? 'bg-[#0F6E56] text-white border-[#0F6E56]'
                    : 'bg-white text-[#2C2C2A] border-gray-200 hover:border-[#0F6E56]/50'
                }`}
              >
                <span>{v.label}</span>
                <span className={`text-[10px] font-mono ${variable === v.value ? 'text-white/70' : 'text-gray-400'}`}>
                  {v.unit}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Depth Slider */}
        <section>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">
              Depth
            </label>
            <span className="text-[11px] font-mono font-semibold text-[#0F6E56]">
              {depth} m
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={2000}
            step={10}
            value={depth}
            onChange={(e) => setDepth(Number(e.target.value))}
            className="w-full accent-[#0F6E56]"
          />
          <div className="flex justify-between text-[10px] text-gray-400 font-mono mt-1">
            {DEPTH_MARKS.map((m) => (
              <button
                key={m}
                onClick={() => setDepth(m)}
                className={`hover:text-[#0F6E56] transition-colors ${depth === m ? 'text-[#0F6E56] font-bold' : ''}`}
              >
                {m}
              </button>
            ))}
          </div>
        </section>

        {/* Colorbar */}
        <section>
          <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-widest mb-2">
            Scale
          </label>
          <ColorbarStrip variable={variable} />
        </section>

        {/* Model vs Observed */}
        <section>
          <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-widest mb-1.5">
            Model vs. Observed
          </label>
          {profileLoading ? (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-400 animate-pulse">
              Loading profile…
            </div>
          ) : (
            <ModelVsObsCard profile={profileData} variable={variable} />
          )}
        </section>

        {/* Data source / cache notice */}
        {(cacheNotice || dataSource) && (
          <section>
            {cacheNotice && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] text-amber-700">
                ⚠ {cacheNotice}
              </div>
            )}
            {dataSource && !cacheNotice && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[10px] text-emerald-700">
                ✓ {dataSource}
              </div>
            )}
          </section>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-100">
        <p className="text-[9px] text-gray-400 leading-relaxed">
          SIH 2026 · PS 26067 · INCOIS · MoES
        </p>
      </div>
    </aside>
  );
}
