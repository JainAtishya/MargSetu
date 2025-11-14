@echo off
echo ==================================================
echo    Find and Setup Android ADB Tool
echo ==================================================
echo.

echo Searching for ADB on your system...
echo.

REM Common ADB locations
set "locations=%USERPROFILE%\AppData\Local\Android\Sdk\platform-tools\adb.exe"
set "locations=%locations% C:\Android\sdk\platform-tools\adb.exe"
set "locations=%locations% C:\Users\%USERNAME%\Android\sdk\platform-tools\adb.exe"
set "locations=%locations% C:\Program Files (x86)\Android\android-sdk\platform-tools\adb.exe"

for %%i in (%locations%) do (
    if exist "%%i" (
        echo ✅ Found ADB at: %%i
        echo.
        echo Testing ADB connection...
        "%%i" devices
        echo.
        echo Now run these commands:
        echo "%%i" logcat -c
        echo "%%i" logcat -s MainActivity:D LocationTrackingService:D
        echo.
        echo Copy and run the commands above, then click Start Journey in your app!
        pause
        exit /b
    )
)

echo ❌ ADB not found in common locations.
echo.
echo SOLUTION OPTIONS:
echo.
echo 1. **Install Android Studio:**
echo    - Download from: https://developer.android.com/studio
echo    - ADB comes with Android Studio
echo.
echo 2. **Or install SDK Platform Tools only:**
echo    - Download from: https://developer.android.com/studio/releases/platform-tools
echo    - Extract to C:\android-tools\
echo.
echo 3. **Or use Android Studio Logcat:**
echo    - Open Android Studio
echo    - Go to: View → Tool Windows → Logcat
echo    - Connect your device
echo    - Filter by "MainActivity" 
echo    - Click Start Journey in your app
echo.
echo 4. **Alternative - Use Windows Event Logs (if available):**
echo    - Some Android logs might appear in Windows Event Viewer
echo    - Run: eventvwr.msc
echo    - Look under Applications and Services Logs
echo.
pause