/**
 * VaruNet API Client — v3
 * SIH 2026 | PS 26067
 * All data is labeled — backend tells us whether each value is
 * a real observation, real model output, or a physics fallback.
 */

export const API_BASE = import.meta.env.VITE_API_URL ?? '';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const resp = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options?.headers ?? {}) },
  });
  if (!resp.ok) throw new Error(`API ${path} → HTTP ${resp.status}`);
  return resp.json() as Promise<T>;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GridResponse {
  variable: string;
  depth: number;
  units: string;
  lats: number[];
  lons: number[];
  data: number[][];
  source: string;
  using_cache: boolean;
  cache_notice: string | null;
  las_online?: boolean;
  is_live?: boolean;
  is_real_data?: boolean;
}

export interface ArgoFloat {
  float_id: string;
  wmo_id: string;
  platform_type: string;
  sensor: string;
  lat: number;
  lon: number;
  depth: number;
  temp: number;
  salinity: number;
  density: number;
  transmission_status: string;
  data_source: string;
  profile_time: string;
}

export interface FloatsResponse {
  floats: ArgoFloat[];
  count: number;
  cache_hit: boolean;
  cache_notice: string | null;
  data_source: string;
  gdac_url: string;
}

export interface ProfileResponse {
  float_id: string;
  wmo_id: string;
  lat: number;
  lon: number;
  depth_levels: number[];
  observed_temp: number[] | null;
  model_temp: number[];
  observed_salinity: number[] | null;
  model_salinity: number[];
  rmse_temp: number | null;
  rmse_salinity: number | null;
  data_source: string;
  data_notice?: string;
  no_observation?: boolean;
  gdac_url?: string;
  error?: string;
}

/** One waypoint in a glider mission transect */
export interface GliderWaypoint {
  lat: number;
  lon: number;
}

export interface GliderMission {
  glider_id: string;
  mission: string;
  lat: number;
  lon: number;
  depth_max: number;
  temp: number;
  salinity: number;
  battery_pct: number;
  region: string;
  operator: string;
  transect: number[][];   // [[lat, lon], ...]
  data_source: string;
  gdac_url: string;
}

export interface GlidersResponse {
  gliders: GliderMission[];
  count: number;
  data_source: string;
  gdac_url: string;
}

export interface DriftWaypoint {
  step: number;
  lat: number;
  lon: number;
  timestamp: string;
  search_radius_km: number;
  current_speed_knots: number;
}

export interface DriftResponse {
  path: DriftWaypoint[];
  total_drift_distance_km: number;
  final_search_radius_km: number;
  sar_datum_status: string;
  run_id: string;
  physics: string;
  disclaimer: string;
}

// ─── API Functions ────────────────────────────────────────────────────────────

export const getGridData = (
  variable: string,
  depth: number,
  timestamp?: string,
): Promise<GridResponse> =>
  apiFetch(
    `/api/grid?variable=${variable}&depth=${depth}` +
    (timestamp ? `&timestamp=${encodeURIComponent(timestamp)}` : ''),
  );

export const getFloats = (): Promise<FloatsResponse> => apiFetch('/api/floats');

export const getFloatProfile = (floatId: string): Promise<ProfileResponse> =>
  apiFetch(`/api/floats/${encodeURIComponent(floatId)}/profile`);

export interface GliderSawtoothPoint {
  distance_km: number;
  depth: number;
  phase: string;
  dive_idx: number;
}

export interface GliderTelemetry {
  glider_id: string;
  mission: string;
  operator: string;
  region: string;
  lat: number;
  lon: number;
  depth_max: number;
  battery_pct: number;
  voltage: number;
  internal_vacuum_inhg: number;
  internal_temp_c: number;
  humidity_pct: number;
  power_watts: number;
  pitch_deg: number;
  roll_deg: number;
  buoyancy_displacement_cc: number;
  dac_speed_mps: number;
  dac_speed_kts: number;
  dac_heading_deg: number;
  dac_vector: [number, number];
  dive_number: number;
  flight_phase: string;
  depth_levels: number[];
  temperature: number[];
  salinity: number[];
  density: number[];
  dissolved_oxygen_umol_kg: number[];
  chlorophyll_a_ug_l: number[];
  turbidity_ntu: number[];
  sawtooth_transect: GliderSawtoothPoint[];
  transect: number[][];
  data_provenance: {
    ctd_source: string;
    bgc_source: string;
    telemetry_protocol: string;
    omz_identified: boolean;
    dcm_depth_m: number;
    dcm_peak_ug_l: number;
  };
}

export const getGliders = (): Promise<GlidersResponse> => apiFetch('/api/gliders');

export const getGliderTelemetry = (gliderId: string): Promise<GliderTelemetry> =>
  apiFetch(`/api/gliders/${encodeURIComponent(gliderId)}/telemetry`);

export const simulateDrift = (
  start_lat: number,
  start_lon: number,
  start_time: string,
  duration_hours: number,
  object_type: string,
): Promise<DriftResponse> =>
  apiFetch('/api/drift', {
    method: 'POST',
    body: JSON.stringify({ start_lat, start_lon, start_time, duration_hours, object_type }),
  });

export const getHealth = () => apiFetch('/api/health');
