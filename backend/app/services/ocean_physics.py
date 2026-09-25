import numpy as np
import math
from typing import Dict, Any, List

# Indian Ocean Basin Geographic Boundaries
LAT_MIN, LAT_MAX = -30.0, 26.0
LON_MIN, LON_MAX = 40.0, 110.0

def is_land(lat: float, lon: float) -> bool:
    """
    Simplified polygon bounding check for Indian Subcontinent, Arabian Peninsula,
    Horn of Africa, and Southeast Asia to mask out terrestrial coordinates.
    """
    # Indian Subcontinent
    if 8.0 <= lat <= 32.0 and 68.0 <= lon <= 89.0:
        # Taper south to Kanyakumari (~8°N, 77.5°E)
        center_lon = 77.5
        allowed_half_width = 1.0 + (lat - 8.0) * 0.55
        if abs(lon - center_lon) < allowed_half_width and lat < 24.0:
            return True
        if lat >= 24.0 and 68.0 <= lon <= 88.0:
            return True

    # Arabian Peninsula (Oman, Yemen, Saudi land mass is north-west of the coast)
    if 12.0 <= lat <= 32.0 and 40.0 <= lon <= 60.0:
        coast_lat = 12.5 + (lon - 44.0) * 0.65
        if lat >= coast_lat:
            return True

    # Horn of Africa & East African Coast
    if lat <= 12.0 and lon < 51.0:
        if lon < 40.0 + max(0, lat + 10) * 0.6:
            return True

    # Myanmar / Thailand / Malay Peninsula
    if lat >= 1.0 and lon >= 98.0:
        if lat >= 10.0 or (lon >= 99.0 and lat >= 2.0):
            return True

    # Sri Lanka
    if 5.8 <= lat <= 9.8 and 79.5 <= lon <= 82.0:
        return True

    # Madagascar
    if -25.5 <= lat <= -12.0 and 43.0 <= lon <= 50.5:
        return True

    # Australia top-left corner
    if lat <= -12.0 and lon >= 115.0:
        return True

    return False

def get_surface_current(lat: float, lon: float, timestamp: str = "") -> tuple[float, float]:
    """
    Calculates hydrodynamic surface current velocity vectors (U = Eastward, V = Northward)
    based on the Indian Ocean circulation regime for the specified seasonal date:
    - Southwest Monsoon (June - September): Somali Current flows northward; eastward SMC.
    - Northeast Monsoon (November - February): Currents reverse; Somali flows southward; westward NEC.
    - Transition / Equinox (April-May, October): Equatorial Wyrtki Jet flows eastward.
    """
    if is_land(lat, lon):
        return 0.0, 0.0

    # Parse month from timestamp (1 to 12)
    month = 7  # default July (SW monsoon)
    if timestamp:
        try:
            parts = timestamp.split("-")
            if len(parts) >= 2:
                month = int(parts[1])
        except Exception:
            pass

    is_sw_monsoon = (6 <= month <= 9)
    is_ne_monsoon = (month <= 2 or month >= 11)

    # Base background planetary drift
    u = 0.04 * math.sin(math.radians(lat * 3))
    v = 0.02 * math.cos(math.radians(lon * 2))

    # 1. South Equatorial Current (SEC): 8°S to 22°S -> Persistent westward flow (u < 0)
    if -22.0 <= lat <= -8.0:
        strength = math.exp(-((lat + 15.0) / 5.0) ** 2)
        u -= 0.45 * strength
        v += 0.05 * math.sin(math.radians(lon * 4))

    # 2. Equatorial Jet / Countercurrent: -3° to +3°N
    elif -4.0 <= lat <= 4.0:
        # Wyrtki Jet peaks during transitions (April-May, Oct-Nov)
        wyrtki_boost = 0.35 if month in (4, 5, 10, 11) else 0.0
        strength = math.exp(-(lat / 3.0) ** 2)
        u += (0.50 + wyrtki_boost) * strength
        v += 0.08 * math.cos(math.radians(lon * 3))

    # 3. Somali Boundary Current: 0° to 14°N, 45°E-56°E
    if 0.0 <= lat <= 15.0 and 45.0 <= lon <= 56.0:
        strength = math.exp(-((lon - 50.0) / 4.0) ** 2)
        if is_sw_monsoon:
            # Summer: Intense northward flow (up to +0.85 m/s)
            v += 0.85 * strength
            u += 0.25 * strength
        elif is_ne_monsoon:
            # Winter: Reverses southward (-0.40 m/s)
            v -= 0.40 * strength
            u -= 0.15 * strength
        else:
            v += 0.25 * strength

    # 4. Bay of Bengal Circulation (8°N to 22°N, 80°E to 96°E)
    if 8.0 <= lat <= 22.0 and 80.0 <= lon <= 96.0:
        clat, clon = 15.0, 88.0
        dlat = (lat - clat) / 7.0
        dlon = (lon - clon) / 8.0
        dist = math.hypot(dlat, dlon)
        if dist < 1.0:
            speed = 0.35 * (1.0 - dist)
            if is_sw_monsoon:
                # Anticyclonic (clockwise) during SW monsoon
                u += speed * (-dlat)
                v += speed * dlon
            else:
                # Cyclonic (counter-clockwise) during NE monsoon
                u += speed * dlat
                v += speed * (-dlon)

    # 5. Arabian Sea Circulation (10°N to 24°N, 55°E to 75°E)
    if 10.0 <= lat <= 24.0 and 55.0 <= lon <= 75.0:
        clat, clon = 16.0, 65.0
        dlat = (lat - clat) / 7.0
        dlon = (lon - clon) / 10.0
        dist = math.hypot(dlat, dlon)
        if dist < 1.0:
            speed = 0.32 * (1.0 - dist)
            if is_sw_monsoon:
                u += speed * (-dlat)
                v += speed * dlon
            else:
                u += speed * dlat
                v += speed * (-dlon)

    return round(float(u), 4), round(float(v), 4)

def calculate_water_properties(lat: float, lon: float, depth: float, timestamp: str = "") -> tuple[float, float, float]:
    """
    Computes accurate temperature (°C), salinity (PSU), and potential density (kg/m^3)
    at any geographic coordinate and depth throughout the Indian Ocean water column,
    accounting for annual monsoonal cycles based on the forecast date.
    """
    if is_land(lat, lon):
        return -9999.0, -9999.0, -9999.0

    # Parse month from forecast date (defaults to May pre-monsoon if unspecified)
    month = 5
    if timestamp:
        try:
            parts = timestamp.split("-")
            if len(parts) >= 2:
                month = int(parts[1])
        except Exception:
            pass

    # --- 1. Sea Surface Temperature (SST) Modeling ---
    # Equatorial Warm Pool peak around 5°N - 10°N (28.5°C to 30.5°C)
    # Southern ocean drop down to ~14°C at 30°S
    equatorial_factor = math.exp(-((lat - 6.0) / 18.0) ** 2)
    sst = 15.0 + 14.5 * equatorial_factor

    # Seasonal solar heating cycle: peak pre-monsoon May/June, cooler in Dec/Jan
    seasonal_sst_delta = 1.4 * math.cos(2.0 * math.pi * (month - 5) / 12.0)
    sst += seasonal_sst_delta

    # Bay of Bengal is characteristically warm with smooth spatial envelope
    if 6.0 <= lat <= 24.0 and 78.0 <= lon <= 98.0:
        bob_weight = math.sin(math.pi * (lat - 6.0) / 18.0) * math.sin(math.pi * (lon - 78.0) / 20.0)
        sst += 1.0 * max(0.0, bob_weight)

    # Somali upwelling region is characteristically colder with smooth radial decay from the Horn of Africa
    clat, clon = 9.0, 52.0
    dist = math.hypot((lat - clat) / 4.5, (lon - clon) / 4.5)
    if dist < 1.6:
        upwelling_intensity = 4.0 if 6 <= month <= 9 else 1.8
        sst -= upwelling_intensity * math.exp(-(dist * 1.3) ** 2)

    # --- 2. Thermocline Dynamics (Depth Decay) ---
    # Mixed layer depth: 0 - 45m (almost uniform SST)
    # Thermocline: 45m - 800m (rapid exponential drop)
    # Abyssal deep ocean: 800m - 2000m (approaching 2.5°C - 3.5°C)
    abyssal_temp = 2.8 + 0.5 * math.cos(math.radians(lat))
    thermocline_center = 180.0  # meters
    thermocline_width = 120.0

    temp_drop_ratio = 1.0 / (1.0 + math.exp((depth - thermocline_center) / thermocline_width))
    temp = abyssal_temp + (sst - abyssal_temp) * temp_drop_ratio

    # --- 3. Practical Salinity Modeling (PSU) ---
    # Arabian Sea: Excessive evaporation -> high surface salinity (36.0 - 36.8 PSU)
    # Bay of Bengal: River runoff (Ganges/Brahmaputra) -> low surface salinity (31.5 - 33.5 PSU)
    # Deep Indian Ocean water converges to ~34.7 - 34.8 PSU
    deep_salinity = 34.72

    if lat > 0.0:
        arabian_sal = 36.4 + 0.4 * math.sin(math.radians(lat))
        bob_freshening = 3.5 * max(0.0, (lat - 8.0) / 14.0)
        bob_sal = 34.2 - bob_freshening
        # Smooth continuous transition between Arabian Sea and Bay of Bengal across Sri Lanka / Kanyakumari
        t = max(0.0, min(1.0, (lon - 71.0) / 12.0))
        blend = t * t * (3.0 - 2.0 * t)
        surf_salinity = arabian_sal * (1.0 - blend) + bob_sal * blend
    else:
        # Southern Indian Ocean
        surf_salinity = 35.2 - 0.5 * (abs(lat) / 30.0)

    # Halocline transition with depth towards deep salinity
    salinity_weight = math.exp(-depth / 350.0)
    salinity = deep_salinity + (surf_salinity - deep_salinity) * salinity_weight

    # --- 4. Potential Density (sigma-theta, kg/m^3) ---
    # Simplified UNESCO equation of state approximation
    density = 1028.0 - 0.22 * temp + 0.78 * (salinity - 35.0) + (depth * 0.0045)

    return round(float(temp), 2), round(float(salinity), 2), round(float(density), 2)

def generate_ocean_grid(variable: str, depth: float, timestamp: str = "", lat_step: float = 1.5, lon_step: float = 1.5) -> Dict[str, Any]:
    """
    Generates a structured 2D scalar field slice over the Indian Ocean Basin
    for a specific forecast date snapshot.
    """
    lats = np.arange(LAT_MIN, LAT_MAX + lat_step, lat_step).tolist()
    lons = np.arange(LON_MIN, LON_MAX + lon_step, lon_step).tolist()

    grid_data: List[List[float]] = []

    for lat in lats:
        row: List[float] = []
        for lon in lons:
            temp, sal, den = calculate_water_properties(lat, lon, depth, timestamp=timestamp)
            if variable == 'temperature':
                val = temp
            elif variable == 'salinity':
                val = sal
            elif variable == 'density':
                val = den
            else:
                val = temp
            row.append(val)
        grid_data.append(row)

    return {
        "variable": variable,
        "depth": depth,
        "timestamp": timestamp,
        "units": "°C" if variable == "temperature" else "PSU" if variable == "salinity" else "kg/m³",
        "lats": [round(x, 2) for x in lats],
        "lons": [round(x, 2) for x in lons],
        "data": grid_data
    }
