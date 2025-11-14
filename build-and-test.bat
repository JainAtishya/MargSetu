@echo off
echo ========================================
echo    🔧 FIXING COMPILATION ERRORS 🔧
echo ========================================
echo.
echo ✅ FIXES APPLIED:
echo    1. Removed 'status' parameter from LocationUpdateRequest in MainActivity.kt
echo    2. Fixed deprecated stopForeground() method in LocationTrackingService.kt
echo.
echo 🚀 BUILDING APP...
cd /d "C:\Users\abhiv\Downloads\Project MS\driver-app"
echo.
gradlew assembleDebug
echo.
if %ERRORLEVEL% EQU 0 (
    echo ========================================
    echo    ✅ BUILD SUCCESSFUL! 
    echo ========================================
    echo.
    echo 📱 NEXT STEPS:
    echo    1. Install the new APK on your device
    echo    2. Login with DRV1001/pass1234/BUS001
    echo    3. Click "Start Journey"
    echo    4. Check backend terminal for GPS updates every 5 seconds!
    echo.
    echo 🎯 Expected backend logs:
    echo    [NET-GPS] Location update from BUS001: lat=XX.XX, lng=YY.YY
    echo.
) else (
    echo ========================================
    echo    ❌ BUILD FAILED - Check errors above
    echo ========================================
)
pause