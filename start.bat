@echo off
title Starting EDITH - WB-Agent Platform
echo ========================================================
echo   Starting EDITH Autonomous AI Sales Agent Platform
echo ========================================================
echo.

echo [1/4] Starting WhatsApp Bridge (Port 3001)...
start "EDITH - WhatsApp Bridge" cmd /k "cd whatsapp-bridge && node index.js"

timeout /t 3 /nobreak >nul

echo [2/4] Starting FastAPI Backend (Port 8000)...
start "EDITH - FastAPI Backend" cmd /k "set PYTHONPATH=backend && python -m uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port 8000"

timeout /t 2 /nobreak >nul

echo [3/4] Starting Job Worker Daemon...
start "EDITH - Background Worker" cmd /k "set PYTHONPATH=backend && python -m app.jobs.worker"

timeout /t 2 /nobreak >nul

echo [4/4] Starting Next.js Dashboard (Port 3000)...
start "EDITH - Next.js Dashboard" cmd /k "cd dashboard && npm run dev"

timeout /t 5 /nobreak >nul

echo.
echo ========================================================
echo   All 4 EDITH services are running!
echo   Opening Operator Dashboard at http://localhost:3000 ...
echo ========================================================
start http://localhost:3000
pause
