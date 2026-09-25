import { useState, useEffect } from 'react';
import { API_BASE } from '../api/client';

interface BGCFloat {
  float_id: string;
  wmo_id: string;
  lat: number;
  lon: number;
  chla: number;
  doxy: number;
  data_source: string;
}

export function BGCPanel() {
  const [floats, setFloats] = useState<BGCFloat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/bgc/floats`)
      .then(res => {
        if (!res.ok) throw new Error('Backend not yet deployed (404)');
        return res.json();
      })
      .then(data => {
        setFloats(data.floats || []);
        setError(null);
      })
      .catch(err => {
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-[#050810] border border-emerald-500/30 rounded p-3 font-mono text-[11px] text-gray-300 mt-2">
      <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
        <span className="text-emerald-300 font-bold">🧪 BGC FLOATS</span>
        <span className="bg-white/10 px-1.5 py-0.5 rounded text-white font-black">{floats.length}</span>
      </div>

      {loading && <div className="text-gray-500 animate-pulse">Loading BGC data...</div>}
      
      {error && (
        <div className="text-amber-400 bg-amber-950/40 p-2 rounded border border-amber-500/40 text-[10px]">
          {error}
        </div>
      )}

      {!loading && !error && floats.length > 0 && (
        <div className="space-y-2">
          {floats.slice(0, 5).map(f => (
            <div key={f.float_id} className="bg-white/5 p-2 rounded border border-white/5">
              <div className="flex justify-between font-bold text-white mb-1">
                <span>WMO {f.wmo_id}</span>
                <span className="text-[9px] text-gray-500">{f.data_source}</span>
              </div>
              <div className="grid grid-cols-2 text-[9px] gap-1">
                <div className="text-emerald-200">CHLA: {f.chla.toFixed(2)} mg/m³</div>
                <div className="text-cyan-200">DOXY: {f.doxy.toFixed(1)} µmol/kg</div>
              </div>
            </div>
          ))}
          {floats.length > 5 && (
            <div className="text-center text-[9px] text-gray-500 italic">
              + {floats.length - 5} more floats...
            </div>
          )}
        </div>
      )}
      {!loading && !error && floats.length === 0 && (
        <div className="text-gray-500">No BGC floats found in region.</div>
      )}
    </div>
  );
}
