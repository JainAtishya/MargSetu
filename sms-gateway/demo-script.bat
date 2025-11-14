@echo off
REM MargSetu SMS Gateway - Windows Demo Script
REM This script demonstrates the SMS gateway functionality on Windows

echo =========================================
echo MargSetu SMS Gateway - Demo Script
echo =========================================
echo.

REM Configuration
set BACKEND_URL=http://10.148.173.6:5000/api/sms/webhook
set API_KEY=margsetu-gateway-key-2024

echo Starting SMS Gateway demonstration...
echo.

REM Test 1: Backend connectivity
echo === Test 1: Backend Connectivity ===
echo Testing backend connectivity...
curl -s -X POST "%BACKEND_URL%" -H "Content-Type: application/json" -H "x-gateway-api-key: %API_KEY%" -d "{\"type\":\"test\",\"timestamp\":%date:~-4%%date:~4,2%%date:~7,2%000,\"message\":\"Connection test\"}"
if %errorlevel% == 0 (
    echo ✓ Backend server is reachable
) else (
    echo ✗ Backend server test failed
    echo Please check:
    echo   - Backend server is running on 10.148.173.6:5000
    echo   - Network connectivity
    echo   - Firewall settings
)
echo.

REM Test 2: Check ADB availability
echo === Test 2: ADB Availability ===
adb version >nul 2>&1
if %errorlevel% == 0 (
    echo ✓ ADB is available
    
    REM Check for connected devices/emulators
    adb devices | findstr "device" >nul
    if %errorlevel% == 0 (
        echo ✓ Android device/emulator detected
        
        echo === Test 3: Driver Location SMS ===
        echo Sending driver location SMS...
        adb emu sms send +919876543210 "BUS123:26.912345,75.123456"
        timeout /t 3 /nobreak >nul
        
        echo === Test 4: Passenger Query SMS ===
        echo Sending passenger query SMS...
        adb emu sms send +919876543210 "LOC BUS123"
        timeout /t 3 /nobreak >nul
        
        echo === Test 5: Multiple Bus Locations ===
        echo Sending multiple bus locations...
        adb emu sms send +919876543210 "BUS456:28.123456,77.654321"
        timeout /t 2 /nobreak >nul
        adb emu sms send +919876543210 "BUS789:19.876543,72.987654"
        timeout /t 2 /nobreak >nul
        
        echo === Test 6: Invalid Format SMS ===
        echo Sending invalid format SMS (should be ignored)...
        adb emu sms send +919876543210 "Hello, how are you?"
        timeout /t 2 /nobreak >nul
        adb emu sms send +919876543210 "BUS123"
        timeout /t 2 /nobreak >nul
        
    ) else (
        echo ✗ No Android device/emulator detected
        echo Please start an Android emulator or connect a device
    )
) else (
    echo ✗ ADB not found
    echo Please install Android SDK Platform Tools
    echo SMS testing will be skipped
)
echo.

REM Test 7: Direct webhook testing
echo === Test 7: Direct Webhook Testing ===

echo Testing driver location webhook...
curl -X POST "%BACKEND_URL%" -H "Content-Type: application/json" -H "x-gateway-api-key: %API_KEY%" -d "{\"type\":\"driver_location\",\"busId\":\"BUS999\",\"latitude\":25.123456,\"longitude\":76.654321,\"sender\":\"+919999999999\",\"timestamp\":1640995200000,\"originalMessage\":\"BUS999:25.123456,76.654321\",\"receivedAt\":1640995201000}"
echo.

echo Testing passenger query webhook...
curl -X POST "%BACKEND_URL%" -H "Content-Type: application/json" -H "x-gateway-api-key: %API_KEY%" -d "{\"type\":\"passenger_query\",\"busId\":\"BUS999\",\"sender\":\"+919999999999\",\"timestamp\":1640995200000,\"originalMessage\":\"LOC BUS999\",\"receivedAt\":1640995201000}"
echo.

echo Testing connection webhook...
curl -X POST "%BACKEND_URL%" -H "Content-Type: application/json" -H "x-gateway-api-key: %API_KEY%" -d "{\"type\":\"test\",\"timestamp\":1640995200000,\"message\":\"Windows demo script test\"}"
echo.

REM Summary
echo =========================================
echo Demo completed!
echo.
echo What to check now:
echo 1. Open SMS Gateway app and check logs
echo 2. Verify backend received webhook calls
echo 3. Check database for new entries
echo 4. Monitor app status indicator
echo.
echo Expected behavior:
echo ✓ Valid SMS formats processed and forwarded
echo ✓ Invalid SMS formats ignored
echo ✓ Webhook endpoints responding correctly
echo ✓ App logs showing SMS activity
echo ✓ Backend logs showing incoming requests
echo.
echo =========================================

pause