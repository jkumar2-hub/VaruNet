# VaruNet — Deployment Guide

## Quick Start (Windows)
```batch
deploy.bat
```

## Docker Deployment
```bash
docker-compose up --build
```
Access at http://localhost

## Manual Deployment

### Backend
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main_v3:app --host 0.0.0.0 --port 8001
```

### Frontend
```bash
cd frontend
npm install
npm run build
# Serve dist/ with any static file server
```

## OGC Endpoints
- WMS GetCapabilities: `GET /wms?SERVICE=WMS&REQUEST=GetCapabilities`
- WMS GetMap: `GET /wms?SERVICE=WMS&REQUEST=GetMap&LAYERS=SST&BBOX=-5,55,26,100&WIDTH=512&HEIGHT=512&FORMAT=image/png`
- WCS GetCapabilities: `GET /wcs?SERVICE=WCS&REQUEST=GetCapabilities`
- WCS GetCoverage: `GET /wcs?SERVICE=WCS&REQUEST=GetCoverage&IDENTIFIER=SST`

## Data Ingestion
- NetCDF upload: `POST /api/ingest/netcdf` (multipart/form-data)
- CSV upload: `POST /api/ingest/text` (multipart/form-data)
