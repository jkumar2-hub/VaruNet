/**
 * DataSourcesModal — VaruNet (Deep Ocean Command)
 * Tactical Provenance & Open Science Catalog.
 * Required by PS 26067: Every value is traceable to an authoritative source.
 */

interface DataSourcesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SOURCES = [
  {
    id: 'incois_las',
    name: 'INCOIS Live Access Server (LAS)',
    code: 'INCOIS-HYCOM-IO',
    type: 'Numerical Ocean Model Output (NetCDF / OPeNDAP)',
    description:
      'Operational numerical model outputs for the Indian Ocean basin (40°E–110°E, 30°S–26°N). Delivers 3D hydrostatic fields of temperature, practical salinity, and velocity vectors at standard depth levels.',
    url: 'https://las.incois.gov.in/',
    badge: 'Model Field',
    badgeClass: 'bg-purple-950/80 text-purple-300 border-purple-600/50',
    org: 'INCOIS, Ministry of Earth Sciences, Govt. of India',
    metrics: 'Spatial: 0.25° grid · Depth: 0–2000m · Update: Daily',
  },
  {
    id: 'copernicus',
    name: 'Copernicus Marine Service (CMEMS)',
    code: 'GLOBAL_MULTIYEAR_PHY_001_030',
    type: 'Global Ocean Reanalysis & Physics Product',
    description:
      'High-resolution multi-year reanalysis and near-real-time global physical ocean model outputs. Used for historical cross-validation, surface current benchmarks, and boundary layer thermodynamics.',
    url: 'https://data.marine.copernicus.eu/product/GLOBAL_MULTIYEAR_PHY_001_030/description',
    badge: 'Reanalysis',
    badgeClass: 'bg-blue-950/80 text-blue-300 border-blue-600/50',
    org: 'Mercator Ocean International / EU Copernicus',
    metrics: 'Standard: CF-1.6 Metadata · Format: NetCDF-4',
  },
  {
    id: 'argo',
    name: 'Argo Global Data Assembly Centre (GDAC)',
    code: 'ARGO-IFREMER-ERDDAP',
    type: 'In-Situ Autonomous CTD Profiling Floats',
    description:
      'Real-time physical observations from autonomous profiling floats drifting between surface and 2000m depth. Provides true in-situ temperature, salinity, and pressure profiles for empirical validation.',
    url: 'ftp://ftp.ifremer.fr/ifremer/argo',
    erddap: 'https://erddap.ifremer.fr/erddap/tabledap/ArgoFloats.html',
    badge: 'Real In-Situ',
    badgeClass: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50',
    org: 'IFREMER Brest / NOAA / Argo International',
    metrics: 'Sensors: Sea-Bird CTD · Cycle: ~10 Days · Precision: ±0.002°C',
  },
  {
    id: 'gliders',
    name: 'IFREMER Ocean Glider Data Facility v2',
    code: 'GLIDER-GDAC-V2',
    type: 'Autonomous Underwater Glider Mission Transects',
    description:
      'High-resolution saw-tooth transect profiles collected by autonomous underwater gliders across the Arabian Sea, Bay of Bengal, and Equatorial Indian Ocean. Measures pycnoclines and sub-mesoscale eddies.',
    url: 'ftp://ftp.ifremer.fr/ifremer/glider/v2/',
    badge: 'Glider Transect',
    badgeClass: 'bg-amber-950/80 text-amber-300 border-amber-500/50',
    org: 'IFREMER / OceanGliders / INCOIS-NIOT',
    metrics: 'Mission Endurance: 90 Days · Max Depth: 1000m',
  },
];

export function DataSourcesModal({ isOpen, onClose }: DataSourcesModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[99999999] flex items-center justify-center p-4 backdrop-blur-md bg-black/85 animate-in fade-in duration-200"
      style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
    >
      {/* Click outside backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal Card */}
      <div className="relative bg-[#090d16]/95 border border-[#00f0ff]/25 rounded-xl shadow-[0_0_50px_rgba(0,240,255,0.1)] w-full max-w-3xl max-h-[88vh] overflow-hidden flex flex-col z-10">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 bg-[#0c1322] flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#00f0ff] animate-pulse" />
              <h2 className="text-[16px] font-black tracking-tight text-white font-mono uppercase">
                Data Sources &amp; Telemetry Provenance
              </h2>
            </div>
            <p className="text-[12px] text-gray-300 font-mono font-bold mt-0.5">
              SIH 2026 · PS 26067 · Operational Oceanography Standards (CF-1.6 &amp; OGC)
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded border border-white/15 bg-white/5 text-gray-300 hover:text-white hover:bg-white/15 transition-colors font-bold text-[14px]"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          <div className="p-3.5 rounded-lg bg-[#00f0ff]/10 border border-[#00f0ff]/30 text-[12px] text-cyan-200 font-mono font-bold leading-relaxed">
            <span className="font-black text-[#00f0ff]">PROVENANCE POLICY:</span> In accordance with PS 26067 guidelines, VaruNet strictly distinguishes between{' '}
            <span className="text-emerald-400 font-black underline decoration-emerald-500/60">empirical in-situ observations</span> (Argo profiling floats &amp; gliders) and{' '}
            <span className="text-purple-300 font-black underline decoration-purple-500/60">numerical forecast model fields</span> (INCOIS HyCOM &amp; Copernicus). No synthetic or fabricated data is presented as real.
          </div>

          <div className="space-y-3.5">
            {SOURCES.map((src) => (
              <div
                key={src.id}
                className="rounded-lg border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] p-4 transition-all duration-200 hover:border-[#00f0ff]/50 space-y-2.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className="text-[14px] font-black text-white font-mono">{src.name}</span>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-white/10 text-gray-300 border border-white/15">
                        {src.code}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-300 font-mono font-bold mt-0.5">{src.org}</p>
                  </div>
                  <span
                    className={`flex-shrink-0 text-[11px] font-mono font-black px-2.5 py-0.5 rounded border ${src.badgeClass}`}
                  >
                    {src.badge}
                  </span>
                </div>

                <p className="text-[12px] text-gray-200 font-medium leading-relaxed">{src.description}</p>

                <div className="flex items-center justify-between pt-1.5 border-t border-white/10 text-[11px] font-mono font-bold text-gray-300">
                  <span className="text-gray-400">{src.metrics}</span>
                  <div className="flex items-center gap-3.5">
                    <a
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#00f0ff] hover:text-cyan-300 font-black flex items-center gap-1 transition-colors"
                    >
                      Official Link ↗
                    </a>
                    {'erddap' in src && src.erddap && (
                      <a
                        href={src.erddap}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#20e3b2] hover:text-emerald-300 font-black flex items-center gap-1 transition-colors"
                      >
                        ERDDAP Server ↗
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-white/10 bg-[#070b14] flex items-center justify-between text-[11px] font-mono font-bold text-gray-400">
          <span>Indian National Centre for Ocean Information Services (INCOIS), MoES</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-[#00f0ff]/15 hover:bg-[#00f0ff]/25 text-[#00f0ff] border border-[#00f0ff]/40 transition-colors font-black text-[12px]"
          >
            Acknowledge &amp; Close
          </button>
        </div>
      </div>
    </div>
  );
}
