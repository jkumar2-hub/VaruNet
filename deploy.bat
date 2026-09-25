@echo off
echo VaruNet Deployment Script
echo ==============================

:: Determine Python executable
set PYTHON_CMD=python
where python >nul 2>nul || set PYTHON_CMD=C:\Users\jitin\AppData\Local\Programs\Python\Python311\python.exe

echo [1/4] Installing Python dependencies...
cd /d "%~dp0backend"
%PYTHON_CMD% -m pip install -r requirements.txt --quiet

echo [2/4] Building frontend...
cd /d "%~dp0frontend"
call npm install --quiet
call npm run build

echo [3/4] Starting backend...
cd /d "%~dp0backend"
start /B %PYTHON_CMD% -m uvicorn main_v3:app --host 0.0.0.0 --port 8001 --workers 2 2>backend.log

echo [4/4] Serving frontend...
echo Frontend: Open http://localhost:5174 (dev) or serve dist/ folder
echo Backend:  http://localhost:8001
echo API Docs: http://localhost:8001/docs
echo WMS:      http://localhost:8001/wms?SERVICE=WMS^&REQUEST=GetCapabilities
echo WCS:      http://localhost:8001/wcs?SERVICE=WCS^&REQUEST=GetCapabilities

pause
