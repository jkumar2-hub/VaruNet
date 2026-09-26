@echo off
title VaruNet — SIH 2026 PS 26067

echo.
echo =====================================================
echo  VaruNet — INCOIS Ocean Data Visualizer
echo  SIH 2026 ^| PS 26067 ^| Ministry of Earth Sciences
echo =====================================================
echo.

:: Determine Python executable
set PYTHON_CMD=python
where python >nul 2>nul || set PYTHON_CMD=C:\Users\jitin\AppData\Local\Programs\Python\Python311\python.exe

:: Start backend on port 8001
echo [1/2] Starting backend (FastAPI + uvicorn)...
start "VaruNet Backend" cmd /k "cd /d ""%~dp0backend"" && %PYTHON_CMD% -m uvicorn main_v3:app --host 0.0.0.0 --port 8001 --reload"

:: Wait 3 seconds for backend to start
timeout /t 3 /nobreak >nul

:: Start frontend on port 5174
echo [2/2] Starting frontend (Vite dev server)...
start "VaruNet Frontend" cmd /k "cd /d ""%~dp0frontend"" && npm run dev -- --port 5174"

echo.
echo Both servers starting...
echo.
echo   Backend API:   http://localhost:8001
echo   Frontend UI:   http://localhost:5174
echo   API Docs:      http://localhost:8001/docs
echo   Health check:  http://localhost:8001/api/health
echo.
echo Opening browser in 5 seconds...
timeout /t 5 /nobreak >nul

start http://localhost:5174

echo.
echo VaruNet is running! Close this window to stop nothing (servers run in their own windows).
