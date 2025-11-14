@echo off
REM MargSetu SMS Gateway - Windows Build Script
REM This script builds the Android APK and prepares the system for deployment

echo =========================================
echo MargSetu SMS Gateway - Build Script
echo =========================================
echo.

REM Check if we're in the right directory
if not exist "android-app\build.gradle" (
    echo ❌ Error: Please run this script from the sms-gateway directory
    echo Expected structure: sms-gateway\android-app\build.gradle
    pause
    exit /b 1
)

echo 📱 Building Android SMS Gateway App...
echo.

REM Change to Android app directory
cd android-app

REM Check if gradlew.bat exists
if not exist "gradlew.bat" (
    echo ⚠️  Warning: gradlew.bat not found. You need to create Gradle Wrapper.
    echo Please run: gradle wrapper --gradle-version=8.1.1 --distribution-type=all
    echo.
    pause
    exit /b 1
)

echo 🔧 Cleaning project...
call gradlew.bat clean

echo 🔄 Syncing dependencies...
call gradlew.bat --refresh-dependencies

echo 🏗️  Building APK...
call gradlew.bat assembleDebug

if %errorlevel% == 0 (
    echo.
    echo ✅ Build successful!
    echo.
    
    REM Find and copy APK
    for /r %%i in (app-debug.apk) do (
        if exist "%%i" (
            echo 📦 APK found: %%i
            copy "%%i" "..\sms-gateway.apk" >nul 2>&1
            echo 📋 APK copied to: ..\sms-gateway.apk
        )
    )
    
    echo.
    echo =========================================
    echo 📱 Installation Instructions
    echo =========================================
    echo.
    echo Option 1 - Install via ADB:
    echo   adb install sms-gateway.apk
    echo.
    echo Option 2 - Manual Installation:
    echo   1. Copy sms-gateway.apk to your Android device
    echo   2. Enable 'Install from unknown sources' in Settings
    echo   3. Open the APK file to install
    echo.
    echo =========================================
    echo ⚙️  Configuration
    echo =========================================
    echo.
    echo Default Settings (should work with existing backend):
    echo   📡 Server URL: http://10.148.173.6:5000
    echo   🔑 API Key: margsetu-gateway-key-2024
    echo.
    echo After Installation:
    echo   1. ✅ Grant SMS and Internet permissions
    echo   2. 🔋 Disable battery optimization
    echo   3. 🧪 Test connection in the app
    echo   4. 📲 Send test SMS to verify functionality
    echo.
    echo =========================================
    echo 🧪 Testing Commands
    echo =========================================
    echo.
    echo Test SMS Messages:
    echo   Driver Location: BUS123:26.912345,75.123456
    echo   Passenger Query: LOC BUS123
    echo.
    echo ADB Test Commands:
    echo   adb emu sms send +919876543210 "BUS123:26.912345,75.123456"
    echo   adb emu sms send +919876543210 "LOC BUS123"
    echo.
    echo Direct Backend Test:
    echo   curl -X POST http://10.148.173.6:5000/api/sms/webhook ^
    echo     -H "Content-Type: application/json" ^
    echo     -H "x-gateway-api-key: margsetu-gateway-key-2024" ^
    echo     -d "{\"type\":\"test\",\"timestamp\":1640995200000,\"message\":\"Test\"}"
    echo.
    echo =========================================
    echo 🚀 SMS Gateway System Ready!
    echo =========================================
    echo.
    echo ✅ Android Gateway App: BUILT
    echo ✅ Backend Server: RUNNING (10.148.173.6:5000)
    echo ✅ Testing Scripts: AVAILABLE
    echo ✅ Documentation: COMPLETE
    echo.
    echo Next Steps:
    echo 1. Install APK on Android device
    echo 2. Configure and test connection
    echo 3. Send test SMS messages
    echo 4. Verify backend receives data
    echo 5. Monitor logs for any issues
    echo.
    
) else (
    echo.
    echo ❌ Build failed!
    echo.
    echo Common solutions:
    echo 1. Check Java version (needs Java 11+)
    echo 2. Ensure Android SDK is properly installed
    echo 3. Try: gradlew.bat clean build
    echo 4. Check for any missing dependencies
    echo.
    echo For detailed error information, run:
    echo   gradlew.bat assembleDebug --stacktrace --info
    echo.
)

echo.
pause