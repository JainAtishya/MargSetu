@echo off
echo Initializing Gradle Wrapper for SMS Gateway...

if not exist gradlew.bat (
    echo Creating Gradle Wrapper...
    gradle wrapper --gradle-version=7.6 --distribution-type=bin
    if %errorlevel% neq 0 (
        echo Error: Failed to create Gradle Wrapper
        echo Please ensure Gradle is installed or use Android Studio to sync the project
        pause
        exit /b 1
    )
)

echo Gradle Wrapper created successfully!
echo.
echo To build the project:
echo 1. Open Android Studio
echo 2. Open this directory: %cd%
echo 3. Let Android Studio sync the project
echo 4. Build -^> Build Bundle(s) / APK(s) -^> Build APK(s)
echo.
pause