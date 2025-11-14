@echo off
echo ==================================================
echo    MargSetu Driver - GPS Debug Test Script
echo ==================================================
echo.

echo [1/3] Checking if backend is running...
curl -s http://10.148.173.202:5000/health > nul 2>&1
if %errorlevel% == 0 (
    echo ✅ Backend is accessible at 10.148.173.202:5000
) else (
    echo ❌ Backend not accessible - make sure it's running
)
echo.

echo [2/3] Starting Android logcat for GPS debugging...
echo Look for these key logs:
echo   🚀 = Service/Activity startup
echo   📍 = GPS location updates  
echo   ✅ = Success messages
echo   ❌ = Error messages
echo   🔍 = Debug info
echo.
echo Press Ctrl+C to stop logcat
echo ==========================================
adb logcat -s MainActivity:D LocationTrackingService:D

echo.
echo [3/3] If no logs appear:
echo   1. Make sure USB debugging is enabled
echo   2. Device is connected via ADB
echo   3. Click "Start Journey" in the app
echo   4. Check if app has location permissions