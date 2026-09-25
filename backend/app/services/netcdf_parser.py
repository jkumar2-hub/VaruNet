"""
NetCDF and delimited text file parsers for VaruNet data ingestion.
Uses xarray for NetCDF (CF Conventions auto-detection).
"""
import io
import csv
from typing import Any
import numpy as np

# CF Convention standard name aliases for auto-detection
TEMP_NAMES = {'temperature', 'sea_water_temperature', 'temp', 'sst', 'water_temp', 'thetao'}
SAL_NAMES = {'salinity', 'sea_water_salinity', 'psal', 'sal', 'so'}
LAT_NAMES = {'latitude', 'lat', 'y'}
LON_NAMES = {'longitude', 'lon', 'x'}
DEPTH_NAMES = {'depth', 'z', 'lev', 'level', 'pressure', 'pres', 'deptht'}
TIME_NAMES = {'time', 't'}


def _find_var(ds, name_set: set) -> str | None:
    """Find first variable in dataset whose lowercase name is in name_set."""
    for var in ds.data_vars:
        if var.lower() in name_set:
            return var
    for coord in ds.coords:
        if coord.lower() in name_set:
            return coord
    return None


def parse_netcdf(file_bytes: bytes) -> dict[str, Any]:
    """
    Parse a NetCDF file and return a dict matching VaruNet grid schema.
    Auto-detects variables using CF Convention standard names.
    """
    try:
        import xarray as xr
    except ImportError:
        raise RuntimeError("xarray not installed: pip install xarray netcdf4")
    
    ds = xr.open_dataset(io.BytesIO(file_bytes), engine='scipy')
    
    # Auto-detect coordinate variables
    lat_key = _find_var(ds, LAT_NAMES)
    lon_key = _find_var(ds, LON_NAMES)
    depth_key = _find_var(ds, DEPTH_NAMES)
    temp_key = _find_var(ds, TEMP_NAMES)
    sal_key = _find_var(ds, SAL_NAMES)
    
    result = {
        'source': 'NetCDF Upload (user-provided file)',
        'format': 'NetCDF',
        'cf_compliant': True,
        'variables_detected': list(ds.data_vars),
        'coordinates_detected': list(ds.coords),
    }
    
    if lat_key:
        result['lat'] = ds[lat_key].values.tolist() if hasattr(ds[lat_key].values, 'tolist') else list(ds[lat_key].values)
    if lon_key:
        result['lon'] = ds[lon_key].values.tolist() if hasattr(ds[lon_key].values, 'tolist') else list(ds[lon_key].values)
    if depth_key:
        result['depth'] = ds[depth_key].values.tolist() if hasattr(ds[depth_key].values, 'tolist') else list(ds[depth_key].values)
    if temp_key:
        arr = ds[temp_key].values
        # Flatten if multi-dim — take first time step and first depth slice for preview
        while arr.ndim > 2:
            arr = arr[0]
        result['temperature'] = arr.tolist()
        result['temperature_units'] = str(ds[temp_key].attrs.get('units', 'unknown'))
        result['temperature_standard_name'] = ds[temp_key].attrs.get('standard_name', temp_key)
    if sal_key:
        arr = ds[sal_key].values
        while arr.ndim > 2:
            arr = arr[0]
        result['salinity'] = arr.tolist()
        result['salinity_units'] = str(ds[sal_key].attrs.get('units', 'unknown'))
    
    result['global_attrs'] = {k: str(v) for k, v in ds.attrs.items()}
    ds.close()
    return result


def parse_text(file_bytes: bytes, filename: str) -> list[dict[str, Any]]:
    """
    Parse CSV/TSV/space-delimited text file into profile observation list.
    Auto-detects delimiter and column names (lat, lon, depth/pres, temp, salinity, time).
    """
    text = file_bytes.decode('utf-8', errors='replace')
    # Detect delimiter
    sample = text[:2000]
    if '\t' in sample:
        delim = '\t'
    elif ',' in sample:
        delim = ','
    else:
        delim = None  # csv sniffer
    
    reader = csv.DictReader(io.StringIO(text), delimiter=delim) if delim else csv.DictReader(io.StringIO(text))
    
    observations = []
    for row in reader:
        obs = {}
        for k, v in row.items():
            kl = k.lower().strip() if k else ''
            try:
                val = float(v)
            except (ValueError, TypeError):
                val = v
            if kl in LAT_NAMES:
                obs['lat'] = val
            elif kl in LON_NAMES:
                obs['lon'] = val
            elif kl in DEPTH_NAMES:
                obs['depth'] = val
            elif kl in TEMP_NAMES:
                obs['temp'] = val
            elif kl in SAL_NAMES:
                obs['salinity'] = val
            elif kl in TIME_NAMES:
                obs['time'] = str(v)
            else:
                obs[kl] = val
        if obs:
            observations.append(obs)
    
    return observations
