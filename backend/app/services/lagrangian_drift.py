import math
from datetime import datetime, timedelta
from typing import List, Dict, Any
from .ocean_physics import get_surface_current, is_land

# Object Leeway Windage Factors (Fraction of 10m wind speed transferred to object)
LEEWAY_FACTORS = {
    "life_raft": 0.035,        # 3.5% leeway
    "fishing_vessel": 0.025,    # 2.5% leeway
    "container": 0.015,         # 1.5% leeway (standard frontend value)
    "cargo_container": 0.015,   # 1.5% leeway (alias)
    "person_in_water": 0.010    # 1.0% leeway
}

# Standard Earth constants
EARTH_RADIUS_METERS = 6371000.0

def velocity_derivatives(lat: float, lon: float, leeway_coef: float, wind_u: float, wind_v: float, timestamp: str = "") -> tuple[float, float]:
    """
    Computes dx/dt and dy/dt in degrees per second at a specific (lat, lon)
    accounting for seasonal monsoonal current reversal.
    """
    if is_land(lat, lon):
        return 0.0, 0.0

    # 1. Ocean current velocity (m/s) modulated by season
    curr_u, curr_v = get_surface_current(lat, lon, timestamp)

    # 2. Leeway velocity from wind (m/s)
    # Wind produces downwind leeway + slight Coriolis deflection to the right (NH) / left (SH)
    coriolis_sign = 1.0 if lat >= 0 else -1.0
    deflection_angle = math.radians(12.0 * coriolis_sign)  # ~12 degree divergence

    speed_wind = math.hypot(wind_u, wind_v)
    if speed_wind > 0:
        angle_wind = math.atan2(wind_v, wind_u) + deflection_angle
        leeway_u = leeway_coef * speed_wind * math.cos(angle_wind)
        leeway_v = leeway_coef * speed_wind * math.sin(angle_wind)
    else:
        leeway_u, leeway_v = 0.0, 0.0

    total_u = curr_u + leeway_u  # m/s eastward
    total_v = curr_v + leeway_v  # m/s northward

    # 3. Convert m/s into degrees/second
    # 1 deg latitude = 111,139 meters
    # 1 deg longitude = 111,139 * cos(lat) meters
    rad_lat = math.radians(lat)
    cos_lat = max(0.1, math.cos(rad_lat))

    deg_lat_per_sec = total_v / (111139.0)
    deg_lon_per_sec = total_u / (111139.0 * cos_lat)

    return deg_lat_per_sec, deg_lon_per_sec

def run_rk4_drift(
    start_lat: float,
    start_lon: float,
    start_time_iso: str,
    duration_hours: int = 24,
    object_type: str = "life_raft",
    wind_speed_ms: float = 6.0,
    wind_dir_deg: float = 225.0
) -> Dict[str, Any]:
    """
    High-precision Lagrangian trajectory simulation using Runge-Kutta 4 (RK4) integration.
    Also produces Search & Rescue (SAR) probability search radius expansion.
    Dynamically adjusts wind and current vectors according to the seasonal monsoon date.
    """
    try:
        current_dt = datetime.fromisoformat(start_time_iso.replace("Z", "+00:00"))
    except Exception:
        current_dt = datetime.utcnow()

    leeway = LEEWAY_FACTORS.get(object_type, 0.03)

    # Adapt seasonal prevailing wind from mission start date
    month = current_dt.month
    if wind_dir_deg == 225.0:  # Default parameter adapts by season
        if 6 <= month <= 9:
            # Summer SW Monsoon: strong winds blowing from SW (225°) towards NE (45°)
            wind_dir = 225.0
            wind_spd = 8.0
        elif month <= 2 or month >= 11:
            # Winter NE Monsoon: winds blowing from NE (45°) towards SW (225°)
            wind_dir = 45.0
            wind_spd = 6.5
        else:
            # Spring / Autumn Inter-monsoon: Equatorial westerlies (270°)
            wind_dir = 270.0
            wind_spd = 4.5
    else:
        wind_dir = wind_dir_deg
        wind_spd = wind_speed_ms

    # Wind components blowing towards (meteorological conversion)
    wind_rad = math.radians((wind_dir + 180.0) % 360.0)
    wind_u = wind_spd * math.sin(wind_rad)
    wind_v = wind_spd * math.cos(wind_rad)

    lat = start_lat
    lon = start_lon

    trajectory: List[Dict[str, Any]] = [{
        "step": 0,
        "lat": round(lat, 5),
        "lon": round(lon, 5),
        "timestamp": current_dt.isoformat(),
        "search_radius_km": 0.5, # Initial navigational datum uncertainty
        "current_speed_knots": 0.0
    }]

    dt_seconds = 3600.0  # 1 hour simulation steps
    steps = min(72, max(1, duration_hours))

    cum_distance_km = 0.0

    for step_num in range(1, steps + 1):
        if is_land(lat, lon):
            break

        ts_str = current_dt.strftime("%Y-%m-%d")

        # RK4 Integration:
        # k1
        k1_lat, k1_lon = velocity_derivatives(lat, lon, leeway, wind_u, wind_v, ts_str)

        # k2
        lat_k2 = lat + 0.5 * dt_seconds * k1_lat
        lon_k2 = lon + 0.5 * dt_seconds * k1_lon
        k2_lat, k2_lon = velocity_derivatives(lat_k2, lon_k2, leeway, wind_u, wind_v, ts_str)

        # k3
        lat_k3 = lat + 0.5 * dt_seconds * k2_lat
        lon_k3 = lon + 0.5 * dt_seconds * k2_lon
        k3_lat, k3_lon = velocity_derivatives(lat_k3, lon_k3, leeway, wind_u, wind_v, ts_str)

        # k4
        lat_k4 = lat + dt_seconds * k3_lat
        lon_k4 = lon + dt_seconds * k3_lon
        k4_lat, k4_lon = velocity_derivatives(lat_k4, lon_k4, leeway, wind_u, wind_v, ts_str)

        # Final weighted step
        dlat = (k1_lat + 2.0 * k2_lat + 2.0 * k3_lat + k4_lat) * (dt_seconds / 6.0)
        dlon = (k1_lon + 2.0 * k2_lon + 2.0 * k3_lon + k4_lon) * (dt_seconds / 6.0)

        prev_lat, prev_lon = lat, lon
        lat += dlat
        lon += dlon
        current_dt += timedelta(seconds=dt_seconds)

        # Cumulative drift distance
        d_lat_rad = math.radians(lat - prev_lat)
        d_lon_rad = math.radians(lon - prev_lon)
        a_h = math.sin(d_lat_rad / 2.0) ** 2 + math.cos(math.radians(prev_lat)) * math.cos(math.radians(lat)) * math.sin(d_lon_rad / 2.0) ** 2
        step_km = EARTH_RADIUS_METERS * 2.0 * math.atan2(math.sqrt(a_h), math.sqrt(max(1e-12, 1.0 - a_h))) / 1000.0
        cum_distance_km += step_km

        # IAMSAR Total Probable Search Error (E):
        # Initial position error X = 5.0 km
        # Drift error Y = 0.28 * distance + 1.25 * sqrt(time) + 0.15 * time
        drift_error = 0.28 * cum_distance_km + 1.25 * math.sqrt(step_num) + 0.15 * step_num
        search_radius_km = round(math.sqrt(5.0 ** 2 + drift_error ** 2), 2)

        # Calculate instantaneous current speed
        cu, cv = get_surface_current(lat, lon, ts_str)
        speed_knots = round(math.hypot(cu, cv) * 1.94384, 2)

        trajectory.append({
            "step": step_num,
            "lat": round(lat, 5),
            "lon": round(lon, 5),
            "timestamp": current_dt.isoformat(),
            "search_radius_km": search_radius_km,
            "current_speed_knots": speed_knots
        })

    total_distance_km = 0.0
    for i in range(1, len(trajectory)):
        p1 = trajectory[i - 1]
        p2 = trajectory[i]
        d_lat = math.radians(p2["lat"] - p1["lat"])
        d_lon = math.radians(p2["lon"] - p1["lon"])
        a = math.sin(d_lat / 2.0) ** 2 + math.cos(math.radians(p1["lat"])) * math.cos(math.radians(p2["lat"])) * math.sin(d_lon / 2.0) ** 2
        c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
        total_distance_km += (EARTH_RADIUS_METERS * c) / 1000.0

    return {
        "object_type": object_type,
        "duration_hours": len(trajectory) - 1,
        "total_drift_distance_km": round(total_distance_km, 2),
        "final_search_radius_km": trajectory[-1]["search_radius_km"],
        "sar_datum_status": "BEACHED" if is_land(lat, lon) else "OPEN_WATER",
        "path": trajectory
    }
