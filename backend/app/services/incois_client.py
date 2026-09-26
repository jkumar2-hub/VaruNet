"""
INCOIS LAS Client — VaruNet v3.1
Fetches real ocean data from the INCOIS Live Access Server (LAS) via THREDDS/OPeNDAP.

Strategy (in priority order):
  1. Probe INCOIS LAS UI (8s timeout, cached 60s)
  2. If online → try THREDDS OPeNDAP via xarray (real NetCDF data)
  3. If OPeNDAP fails → fall back to physics model in router
  4. All responses labeled with exact data origin — never silent fallback

THREDDS catalog: https://las.incois.gov.in/thredds/catalog/las/catalog.xml
OPeNDAP base:    https://las.incois.gov.in/thredds/dodsC/las/

SIH 2026 | PS 26067
Data Source: https://las.incois.gov.in/
"""
import logging
import time
from typing import Any

import requests
import urllib3

urllib3.disable_warnings()

logger = logging.getLogger("varunet.incois_client")

INCOIS_LAS_BASE = "https://las.incois.gov.in"

# THREDDS OPeNDAP dataset paths (discovered from catalog)
THREDDS_OPENDAP_BASE = f"{INCOIS_LAS_BASE}/thredds/dodsC"
KNOWN_DATASETS = {
    "ocean_atlas": "las/ocean_atlas_subset/data_ocean_atlas_subset.jnl",
}

# Probe and cache settings
PROBE_TIMEOUT = 8          # seconds — gov.in SSL handshake is slow
OPENDAP_TIMEOUT = 20       # seconds for xarray OPeNDAP open
PROBE_CACHE_TTL = 60.0     # seconds between re-probes

_las_status_cache: dict[str, Any] = {"online": False, "checked_at": 0.0}


def reset_las_cache() -> None:
    """Force-expire the LAS cache so the next call re-probes immediately."""
    _las_status_cache["checked_at"] = 0.0


def _las_is_available(force: bool = False) -> bool:
    """
    Quick probe to INCOIS LAS UI page.
    Returns True if LAS responds with 2xx. Result cached for 60s.
    """
    now = time.time()
    if not force and (now - _las_status_cache["checked_at"] < PROBE_CACHE_TTL):
        return bool(_las_status_cache["online"])

    try:
        resp = requests.get(
            f"{INCOIS_LAS_BASE}/las/UI.vm",
            timeout=PROBE_TIMEOUT,
            verify=False,
            allow_redirects=True,
        )
        is_online = (200 <= resp.status_code < 300)
        logger.info("LAS probe -> HTTP %d (online=%s)", resp.status_code, is_online)
    except Exception as exc:
        logger.warning("LAS probe error: %s", exc)
        is_online = False

    _las_status_cache["online"] = is_online
    _las_status_cache["checked_at"] = now
    return is_online


def get_las_status() -> dict[str, Any]:
    """Return current LAS probe state (used by /api/las/status endpoint)."""
    online = _las_is_available()
    return {
        "las_online": online,
        "las_url": INCOIS_LAS_BASE,
        "thredds_catalog": f"{INCOIS_LAS_BASE}/thredds/catalog/las/catalog.xml",
        "probe_cached": (time.time() - _las_status_cache["checked_at"]) < PROBE_CACHE_TTL,
        "cache_age_seconds": round(time.time() - _las_status_cache["checked_at"], 1),
    }


def _try_opendap_xarray(
    variable: str,
    depth: float,
    lat_range: tuple[float, float],
    lon_range: tuple[float, float],
) -> dict[str, Any] | None:
    """
    Attempt to fetch a real grid slice from INCOIS THREDDS via OPeNDAP.
    Hard 8-second timeout — never blocks the grid endpoint.
    """
    from concurrent.futures import ThreadPoolExecutor, TimeoutError as FutureTimeout

    def _do_fetch():
        try:
            import xarray as xr
            import numpy as np
        except ImportError:
            return None

        dataset_path = KNOWN_DATASETS["ocean_atlas"]
        opendap_url = f"{THREDDS_OPENDAP_BASE}/{dataset_path}"
        logger.info("OPeNDAP open: %s", opendap_url)

        ds = xr.open_dataset(opendap_url, engine="pydap", decode_times=False)
        logger.info("OPeNDAP variables: %s", list(ds.data_vars))

        var_aliases = {
            "temperature": ["temperature", "temp", "sea_water_temperature", "thetao", "t", "sst", "Temperature"],
            "salinity":    ["salinity", "psal", "sea_water_salinity", "so", "s", "Salinity"],
            "density":     ["density", "sigma_t", "pot_density", "rho"],
        }
        ds_var = next((a for a in var_aliases.get(variable, [variable]) if a in ds), None)
        if ds_var is None:
            ds.close()
            return None

        da = ds[ds_var]
        for ddim in ["depth", "z", "lev", "level", "deptht"]:
            if ddim in da.dims:
                da = da.sel({ddim: depth}, method="nearest")
                break
        lat_dim = next((d for d in ["lat", "latitude", "y"] if d in da.dims), None)
        lon_dim = next((d for d in ["lon", "longitude", "x"] if d in da.dims), None)
        if lat_dim:
            da = da.sel({lat_dim: slice(lat_range[0], lat_range[1])})
        if lon_dim:
            da = da.sel({lon_dim: slice(lon_range[0], lon_range[1])})
        if "time" in da.dims:
            da = da.isel(time=0)

        data_arr = da.values
        if data_arr.ndim == 2:
            r_step = max(1, data_arr.shape[0] // 50)
            c_step = max(1, data_arr.shape[1] // 50)
            data_arr = data_arr[::r_step, ::c_step]

        lats = ds[lat_dim].values[::max(1, len(ds[lat_dim]) // 50)] if lat_dim else []
        lons = ds[lon_dim].values[::max(1, len(ds[lon_dim]) // 50)] if lon_dim else []

        data_list = []
        for row in data_arr:
            clean_row = []
            for v in row:
                try:
                    fv = float(v)
                    clean_row.append(None if (np.isnan(fv) or abs(fv) > 1e10) else round(fv, 3))
                except Exception:
                    clean_row.append(None)
            data_list.append(clean_row)

        ds.close()
        return {
            "data": data_list,
            "lat": [round(float(v), 3) for v in lats],
            "lon": [round(float(v), 3) for v in lons],
            "variable": variable,
            "depth_m": depth,
            "source": "INCOIS LAS — THREDDS OPeNDAP (real ocean atlas data)",
            "opendap_url": opendap_url,
            "is_real_data": True,
            "is_live": True,
        }

    try:
        with ThreadPoolExecutor(max_workers=1) as ex:
            future = ex.submit(_do_fetch)
            result = future.result(timeout=8)   # hard 8s cap
            if result:
                logger.info("OPeNDAP fetch OK: %s@%dm", variable, depth)
            return result
    except FutureTimeout:
        logger.warning("OPeNDAP fetch timed out after 8s — falling back to physics model")
        return None
    except Exception as exc:
        logger.warning("OPeNDAP fetch error: %s", exc)
        return None



def fetch_grid_slice(
    variable: str,
    depth: float,
    lat_range: tuple[float, float] = (-5.0, 26.0),
    lon_range: tuple[float, float] = (55.0, 100.0),
) -> dict[str, Any] | None:
    """
    Public interface: tries INCOIS LAS for a real grid slice.
    Returns None immediately if LAS is unreachable.
    Never raises — always returns dict | None.
    """
    if not _las_is_available():
        logger.debug("INCOIS LAS offline — using physics model")
        return None

    # Try OPeNDAP via xarray
    result = _try_opendap_xarray(variable, depth, lat_range, lon_range)
    if result:
        return result

    logger.debug("OPeNDAP fetch returned None — using physics model")
    return None
