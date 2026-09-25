export interface ColorbBarSettings {
  palette: 'Thermal' | 'Viridis' | 'Jet' | 'Plasma' | 'RdBu';
  vmin: number;
  vmax: number;
  scale: 'linear' | 'log';
  opacity: number; // 0-100
  vExag: number; // 1-10
}

interface ColorbarPanelProps {
  settings: ColorbBarSettings;
  variable?: string; // 'temperature' | 'salinity' | 'density'
  onChange: (s: ColorbBarSettings) => void;
}

export function ColorbarPanel({ settings, variable, onChange }: ColorbarPanelProps) {
  const update = (partial: Partial<ColorbBarSettings>) => {
    onChange({ ...settings, ...partial });
  };

  const palettes = {
    Thermal: 'linear-gradient(to right, #000080, #0000ff, #00ffff, #ffff00, #ff0000)',
    Viridis: 'linear-gradient(to right, #440154, #31688e, #35b779, #fde725)',
    Jet: 'linear-gradient(to right, #00007f, #0000ff, #00ffff, #ffff00, #ff0000, #7f0000)',
    Plasma: 'linear-gradient(to right, #0d0887, #7e03a8, #cc4778, #f89441, #f0f921)',
    RdBu: 'linear-gradient(to right, #053061, #2166ac, #f7f7f7, #d6604d, #67001f)'
  };

  const rangeBounds: Record<string, { min: number; max: number; step: number }> = {
    temperature: { min: -2, max: 40, step: 0.5 },
    salinity: { min: 20, max: 45, step: 0.2 },
    density: { min: 1018, max: 1032, step: 0.1 },
  };
  const b = rangeBounds[variable || 'temperature'] ?? rangeBounds.temperature;

  return (
    <div className="bg-[#060a14] border border-white/10 p-3 rounded-lg flex flex-col gap-3 font-mono text-[11px] w-full shadow-lg">
      <div className="flex items-center justify-between text-[#00f0ff] font-bold">
        <span>PALETTE</span>
        <select
          className="bg-black/50 border border-white/20 text-white rounded px-1 py-0.5 outline-none"
          value={settings.palette}
          onChange={(e) => update({ palette: e.target.value as any })}
        >
          {Object.keys(palettes).map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex justify-between text-gray-300">
          <span>MIN: {settings.vmin}</span>
          <span>MAX: {settings.vmax}</span>
        </div>
        <div className="flex gap-2">
          <input
            type="range"
            min={b.min} max={b.max} step={b.step}
            value={settings.vmin}
            onChange={(e) => update({ vmin: Number(e.target.value) })}
            className="w-1/2 accent-[#00f0ff]"
          />
          <input
            type="range"
            min={b.min} max={b.max} step={b.step}
            value={settings.vmax}
            onChange={(e) => update({ vmax: Number(e.target.value) })}
            className="w-1/2 accent-[#00f0ff]"
          />
        </div>
      </div>

      <div className="flex justify-between items-center text-gray-300">
        <span>SCALE</span>
        <div className="flex gap-2">
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="radio"
              checked={settings.scale === 'linear'}
              onChange={() => update({ scale: 'linear' })}
              className="accent-[#00f0ff]"
            />
            Linear
          </label>
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="radio"
              checked={settings.scale === 'log'}
              onChange={() => update({ scale: 'log' })}
              className="accent-[#00f0ff]"
            />
            Log
          </label>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex justify-between text-gray-300">
          <span>OPACITY</span>
          <span>{settings.opacity}%</span>
        </div>
        <input
          type="range"
          min={0} max={100}
          value={settings.opacity}
          onChange={(e) => update({ opacity: Number(e.target.value) })}
          className="w-full accent-[#00f0ff]"
        />
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex justify-between text-gray-300">
          <span>V-EXAG</span>
          <span>{settings.vExag}x</span>
        </div>
        <input
          type="range"
          min={1} max={10} step={0.1}
          value={settings.vExag}
          onChange={(e) => update({ vExag: Number(e.target.value) })}
          className="w-full accent-[#00f0ff]"
        />
      </div>

      <div className="mt-1">
        <div className="text-[9px] text-gray-400 mb-1 font-bold">PREVIEW</div>
        <div
          className="w-full h-[14px] rounded border border-white/20"
          style={{ background: palettes[settings.palette] }}
        />
      </div>
    </div>
  );
}
