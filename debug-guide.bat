@echo off
echo ==================================================
echo    MargSetu Driver - Complete Debug Guide
echo ==================================================
echo.

echo [STEP 1] Backend Status Check:
echo --------------------------------
curl -s http://10.148.173.202:5000/health >nul 2>&1
if %errorlevel% == 0 (
    echo ✅ Backend is running and accessible
) else (
    echo ❌ Backend not accessible - start the backend first!
    echo Run: cd backend && npm start
    pause
    exit /b
)
echo.

echo [STEP 2] Android Debug Setup:
echo ------------------------------
echo 1. Make sure your phone is connected via USB
echo 2. Enable "USB Debugging" in Developer Options
echo 3. Install Android Studio or Android SDK Platform Tools
echo 4. Add ADB to your system PATH, or use full path like:
echo    "C:\Users\%USERNAME%\AppData\Local\Android\Sdk\platform-tools\adb.exe"
echo.

echo [STEP 3] Manual Debug Steps:
echo -----------------------------
echo 1. **REBUILD THE APP** - This is critical! The new debug logs won't work without rebuilding
echo 2. **Install the updated APK** on your device
echo 3. **Open cmd/PowerShell** and run:
echo    adb logcat -c  (clear old logs)
echo    adb logcat -s MainActivity:D LocationTrackingService:D
echo 4. **Click Start Journey** button in the app
echo 5. **You should immediately see logs** starting with:
echo    MainActivity: 🚀 MainActivity onCreate() called
echo.

echo [STEP 4] What logs to expect:
echo ------------------------------
echo When you click "Start Journey":
echo MainActivity: 🔘 Journey toggle button CLICKED!
echo MainActivity: 🔍 Current isJourneyActive = false
echo MainActivity: ▶️ Journey is NOT active, calling startJourney()
echo LocationTrackingService: 🚀 LocationTrackingService: onStartCommand called
echo.

echo [STEP 5] If NO logs appear:
echo ----------------------------
echo A) App wasn't rebuilt with debug code - rebuild and reinstall
echo B) Wrong logcat filter - try: adb logcat | findstr "MainActivity\|LocationTrackingService"
echo C) USB debugging not enabled
echo D) Button not actually calling the function - check UI binding
echo.

echo [STEP 6] Alternative - Use Android Studio:
echo ------------------------------------------
echo 1. Open Android Studio
echo 2. Go to View → Tool Windows → Logcat
echo 3. Filter by "MainActivity" or "LocationTrackingService"
echo 4. Click Start Journey in your app
echo 5. Watch for the emoji-marked debug logs
echo.

pause