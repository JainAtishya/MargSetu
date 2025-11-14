@echo off
echo ==================================================
echo    Alternative Debug Method - File Logging
echo ==================================================
echo.

echo Since ADB logs aren't visible, I've added file logging to the app.
echo.
echo After clicking "Start Journey" in your app:
echo.

echo 1. Connect your phone to PC
echo 2. Open File Explorer
echo 3. Navigate to your phone's storage
echo 4. Go to: Android/data/com.margsetu.driver/files/
echo 5. Look for "debug_log.txt"
echo 6. Open this file to see what the app is doing
echo.

echo If you can't access the file directly:
echo 1. Use a file manager app on your phone
echo 2. Navigate to the app's files directory
echo 3. Share the debug_log.txt file to yourself via email/messaging
echo.

echo The log file will show:
echo - Button clicks
echo - Journey start/stop calls  
echo - Service startup attempts
echo - Any errors or issues
echo.

echo **REBUILD THE APP FIRST** with this new file logging!
echo.

pause