@echo off
cls
title MargSetu Server - Best Startup Method
color 0A

echo.
echo ████████████████████████████████████████
echo █          MargSetu Driver App          █
echo █         Best Server Startup          █
echo ████████████████████████████████████████
echo.

echo 🧹 Step 1: Cleaning any existing processes...
taskkill /F /IM node.exe 2>nul >nul
if %errorlevel% == 0 (
    echo ✅ Killed existing Node.js processes
) else (
    echo ℹ️  No conflicting processes found
)

echo.
echo ⏳ Step 2: Waiting for cleanup...
timeout /t 2 /nobreak >nul
echo ✅ Cleanup complete

echo.
echo 🔍 Step 3: Checking environment...
if exist .env (
    echo ✅ Environment file found
) else (
    echo ⚠️  Environment file not found - using defaults
)

echo.
echo 🚀 Step 4: Starting MargSetu Server...
echo 🌐 Port: 5000
echo 📱 Local: http://localhost:5000
echo 🔗 Health: http://localhost:5000/health
echo.

REM Start with working-server.js - most reliable
node working-server.js

echo.
echo ❌ Server stopped. Check for errors above.
echo Press any key to exit...
pause >nul