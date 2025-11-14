@echo off
cd /d "c:\Users\abhiv\OneDrive\Documents\MargSetu\passenger-app"
echo Stopping any running Java processes...
taskkill /f /im java.exe >nul 2>&1

echo Cleaning build directories...
rmdir /s /q app\build >nul 2>&1
rmdir /s /q build >nul 2>&1
rmdir /s /q .gradle >nul 2>&1

echo Waiting 3 seconds for file locks to clear...
timeout /t 3 /nobreak >nul

echo Starting build process...
gradlew.bat assembleDebug --no-daemon --no-parallel --no-build-cache --offline

pause