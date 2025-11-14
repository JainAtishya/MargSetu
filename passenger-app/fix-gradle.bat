@echo off
echo 🔧 Fixing Gradle Issues for Android Studio...
echo.

cd /d "%~dp0"

echo [1/6] Cleaning Gradle cache...
if exist ".gradle" rmdir /s /q ".gradle"
if exist "build" rmdir /s /q "build"
if exist "app\build" rmdir /s /q "app\build"

echo [2/6] Removing corrupted Gradle files...
if exist "gradle\wrapper\gradle-wrapper.jar" del "gradle\wrapper\gradle-wrapper.jar"

echo [3/6] Setting file permissions...
icacls gradlew.bat /grant Everyone:F >nul 2>&1
icacls gradle\wrapper /grant Everyone:F /t >nul 2>&1

echo [4/6] Downloading fresh Gradle wrapper...
powershell -Command "& {[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://services.gradle.org/distributions/gradle-8.2-bin.zip' -OutFile 'gradle-8.2-bin.zip' -UseBasicParsing}"

if exist "gradle-8.2-bin.zip" (
    echo [5/6] Extracting Gradle...
    powershell -Command "Expand-Archive -Path 'gradle-8.2-bin.zip' -DestinationPath 'gradle-temp' -Force"
    if exist "gradle-temp\gradle-8.2\bin\gradle.bat" (
        echo [6/6] Running Gradle wrapper task...
        "gradle-temp\gradle-8.2\bin\gradle.bat" wrapper --gradle-version 8.2
    )
    rmdir /s /q "gradle-temp" >nul 2>&1
    del "gradle-8.2-bin.zip" >nul 2>&1
)

echo.
echo ✅ Gradle fix completed!
echo.
echo 📋 Next steps for Android Studio:
echo 1. Close Android Studio completely
echo 2. Delete Android Studio caches:
echo    - Go to: File ^> Invalidate Caches and Restart ^> Invalidate and Restart
echo 3. Reopen project: passenger-app folder
echo 4. Wait for Gradle sync to complete
echo 5. If still issues, restart Android Studio
echo.

echo 🧪 Testing Gradle now...
gradlew.bat --version

pause