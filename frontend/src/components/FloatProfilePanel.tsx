/**
 * FloatProfilePanel — VaruNet
 * Slide-in panel showing a full CTD depth-vs-variable profile for a clicked Argo float.
 * Renders both observed data and model predictions for direct comparison.
 *
 * Shows: observed line (teal) vs model line (purple) + depth table + RMSE + source label
 */
import type { ProfileResponse, ArgoFloat } from '../api/client';

interface FloatProfilePanelProps {
  float: ArgoFloat;
  profile: ProfileResponse | null;
  loading: boolean;
  variable: string;
  onClose: () => void;
}

function DepthProfileSVG({
  depths,
  observed,
  model,
  variable,
}: {
  depths: number[];
  observed: number[];
  model: number[];
  variable: string;
}) {
  if (depths.length === 0) return null;

  const W = 220, H = 260, padL = 36, padR = 12, padT = 12, padB = 24;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const maxDepth = Math.max(...depths, 1);
  const allVals = [...observed, ...model].filter(Number.isFinite);
  const minV = Math.min(...allVals);
  const maxV = Math.max(...allVals);
  const rangeV = maxV - minV || 1;

  const xScale = (v: number) => padL + ((v - minV) / rangeV) * plotW;
  const yScale = (d: number) => padT + (d / maxDepth) * plotH;

  const toPath = (vals: number[]) =>
    vals
      .map((v, i) => `${i === 0 ? 'M' : 'L'}${xScale(v).toFixed(1)},${yScale(depths[i]).toFixed(1)}`)
      .join(' ');

  // Axis tick values
  const xTicks = [minV, (minV + maxV) / 2, maxV].map((v) => Math.round(v * 10) / 10);
  const yTicks = [0, Math.round(maxDepth * 0.25), Math.round(maxDepth * 0.5), Math.round(maxDepth * 0.75), maxDepth];
  const unit = variable === 'temperature' ? '°C' : variable === 'salinity' ? 'PSU' : 'kg/m³';

  return (
    <svg width={W} height={H} className="w-full" viewBox={`0 0 ${W} ${H}`}>
      {/* Grid lines */}
      {yTicks.map((d) => (
        <line key={d}
          x1={padL} x2={W - padR}
          y1={yScale(d)} y2={yScale(d)}
          stroke="#e5e7eb" strokeWidth={0.5}
        />
      ))}

      {/* Model line (purple) */}
      <path d={toPath(model)} fill="none" stroke="#534AB7" strokeWidth={1.5} strokeDasharray="4,2" opacity={0.8} />

      {/* Observed line (teal) */}
      <path d={toPath(observed)} fill="none" stroke="#0F6E56" strokeWidth={2} />

      {/* Y-axis labels (depth) */}
      {yTicks.map((d) => (
        <text key={d} x={padL - 4} y={yScale(d) + 3} textAnchor="end"
          fontSize={8} fill="#9ca3af" fontFamily="monospace">
          {d}
        </text>
      ))}

      {/* X-axis labels (value) */}
      {xTicks.map((v, i) => (
        <text key={i} x={xScale(v)} y={H - padB + 12} textAnchor="middle"
          fontSize={8} fill="#9ca3af" fontFamily="monospace">
          {v}
        </text>
      ))}

      {/* Axis unit */}
      <text x={W / 2} y={H - 2} textAnchor="middle" fontSize={8} fill="#6b7280" fontFamily="monospace">
        {unit}
      </text>
      <text x={8} y={padT + plotH / 2} textAnchor="middle" fontSize={8} fill="#6b7280"
        fontFamily="monospace" transform={`rotate(-90, 8, ${padT + plotH / 2})`}>
        depth (m)
      </text>

      {/* Legend */}
      <line x1={padL + 4} x2={padL + 18} y1={padT + 6} y2={padT + 6} stroke="#0F6E56" strokeWidth={2} />
      <text x={padL + 22} y={padT + 10} fontSize={8} fill="#0F6E56" fontFamily="monospace">Observed</text>
      <line x1={padL + 80} x2={padL + 94} y1={padT + 6} y2={padT + 6} stroke="#534AB7" strokeWidth={1.5} strokeDasharray="4,2" />
      <text x={padL + 98} y={padT + 10} fontSize={8} fill="#534AB7" fontFamily="monospace">Model</text>
    </svg>
  );
}

export function FloatProfilePanel({ float: f, profile, loading, variable, onClose }: FloatProfilePanelProps) {
  const observed = variable === 'temperature' ? (profile?.observed_temp ?? []) : (profile?.observed_salinity ?? []);
  const model    = variable === 'temperature' ? (profile?.model_temp ?? []) : (profile?.model_salinity ?? []);
  const rmse     = variable === 'temperature' ? profile?.rmse_temp : profile?.rmse_salinity;
  const unit     = variable === 'temperature' ? '°C' : variable === 'salinity' ? 'PSU' : 'kg/m³';

  return (
    <div
      className="fixed right-64 top-12 w-72 bg-white border-l border-b border-gray-200 shadow-2xl z-50 rounded-bl-xl overflow-hidden"
      style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#0F6E56] text-white">
        <div>
          <p className="text-[12px] font-semibold">Argo Float CTD Profile</p>
          <p className="text-[10px] font-mono opacity-80">WMO {f.wmo_id} · {f.lat.toFixed(2)}°N {f.lon.toFixed(2)}°E</p>
        </div>
        <button onClick={onClose} className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/20 text-white text-sm">
          ✕
        </button>
      </div>

      <div className="p-4 space-y-4">
        {loading && (
          <div className="text-xs text-gray-400 animate-pulse text-center py-8">
            Fetching real CTD profile…
          </div>
        )}

        {!loading && profile && profile.depth_levels.length > 0 && (
          <>
            {/* RMSE Badge */}
            <div className="flex items-center gap-3">
              <div className="flex-1 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                <p className="text-[9px] text-gray-400 uppercase tracking-wider">Model RMSE</p>
                <p className={`text-[13px] font-mono font-bold ${
                  rmse !== null && rmse !== undefined && rmse < 0.5
                    ? 'text-emerald-600'
                    : rmse !== null && rmse !== undefined && rmse < 1.5
                    ? 'text-amber-600'
                    : 'text-red-600'
                }`}>
                  {rmse !== null && rmse !== undefined ? `${rmse} ${unit}` : 'N/A'}
                </p>
              </div>
              <div className="flex-1 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                <p className="text-[9px] text-gray-400 uppercase tracking-wider">Depth levels</p>
                <p className="text-[13px] font-mono font-bold text-[#0F6E56]">{profile.depth_levels.length}</p>
              </div>
            </div>

            {/* Chart */}
            <DepthProfileSVG
              depths={profile.depth_levels}
              observed={observed}
              model={model}
              variable={variable}
            />

            {/* Data source label */}
            <div className="rounded border border-emerald-200 bg-emerald-50 px-2.5 py-1.5">
              <p className="text-[9px] text-emerald-700 leading-relaxed">{profile.data_source}</p>
            </div>
          </>
        )}

        {!loading && profile && profile.depth_levels.length === 0 && (
          <div className="text-center py-8">
            <p className="text-xs text-amber-600">
              {profile.error ?? 'No profile data available for this float.'}
            </p>
            <p className="text-[10px] text-gray-400 mt-1">Try a different float.</p>
          </div>
        )}

        {!loading && !profile && (
          <p className="text-xs text-gray-400 text-center py-8">No profile loaded.</p>
        )}
      </div>
    </div>
  );
}
