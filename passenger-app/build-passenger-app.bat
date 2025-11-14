@echo off
echo 🚀 Building MargSetu Passenger App...
echo.

cd /d "%~dp0"

echo 📝 Current IP Configuration:
echo Backend Server: http://10.148.173.6:5000/api/android/
echo.

echo 🔧 Cleaning previous build...
call gradlew clean

echo 📱 Building debug APK...
call gradlew assembleDebug

echo.
if exist "app\build\outputs\apk\debug\app-debug.apk" (
    echo ✅ Build successful!
    echo 📱 APK location: app\build\outputs\apk\debug\app-debug.apk
    echo.
    echo 📋 Testing Instructions:
    echo 1. Install the APK on your device
    echo 2. Make sure your device is connected to the same network as the backend server
    echo 3. Ensure backend server is running on 10.148.173.6:5000
    echo 4. Test the app features
) else (
    echo ❌ Build failed! Check the error messages above.
)

echo.
pause