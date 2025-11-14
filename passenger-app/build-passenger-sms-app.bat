@echo off
echo Building Passenger App with Direct SMS Query Integration...

cd /d "%~dp0"

echo.
echo Cleaning previous build...
call gradlew clean -x lint -x lintDebug -x lintAnalyzeDebug -x lintReportDebug -x lintVitalAnalyzeRelease -x lintVitalReportRelease --no-daemon

echo.
echo Building Debug APK with Direct SMS functionality...
call gradlew assembleDebug -x lint -x lintDebug -x lintAnalyzeDebug -x lintReportDebug -x lintVitalAnalyzeRelease -x lintVitalReportRelease --no-daemon

echo.
if exist "app\build\outputs\apk\debug\app-debug.apk" (
    echo SUCCESS: passenger-app-direct-sms.apk created!
    copy "app\build\outputs\apk\debug\app-debug.apk" "passenger-app-direct-sms.apk"
    echo.
    echo NEW FEATURES IMPLEMENTED:
    echo ==========================
    echo Direct SMS Query System:
    echo - SMS queries sent directly to SMS Gateway phone (+917876935991)
    echo - Click "Query SMS" in timetable sends "LOC [BUS_NUMBER]"  
    echo - No backend API dependency for SMS queries
    echo - Direct phone-to-phone communication
    echo.
    echo Bus Details Map Fixes:
    echo - Bus marker shows at origin when "Not started yet"
    echo - Fixed Google Maps loading timeouts and error messages
    echo - Improved location detection and fallbacks
    echo.
    echo SMS Integration Features:
    echo - LOC command: "LOC MH12AB1234" for bus location
    echo - STATUS command: "STATUS MH12AB1234" for bus status  
    echo - Proper error handling and user feedback
    echo - SMS permission handling and fallback to SMS app
    echo.
    echo System Integration:
    echo - Driver App: Journey notifications + GPS updates
    echo - SMS Gateway: Phone forwarding (+917876935991)
    echo - Backend: MARGSETU, JOURNEY, LOC command processing
    echo - Passenger App: Direct SMS queries + offline timetable
    echo.
    echo APK Location: %cd%\passenger-app-direct-sms.apk
    echo.
    echo TESTING: Click SMS button in timetable to send query directly to SMS Gateway!
) else (
    echo FAILED: APK not found
)

pause