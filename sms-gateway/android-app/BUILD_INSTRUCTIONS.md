# SMS Gateway Android App - Build Instructions

## Issue Resolution
The Gradle error you encountered is due to version compatibility. Here's how to resolve it:

## Quick Fix - Use Android Studio (Recommended)

### Step 1: Open Project in Android Studio
1. Open Android Studio
2. Choose "Open an existing Android Studio project"
3. Navigate to: `c:\Users\abhiv\OneDrive\Documents\MargSetu\sms-gateway\android-app`
4. Click "OK"

### Step 2: Let Android Studio Fix Everything
1. Android Studio will prompt to "Sync Now" - **Click "Sync Now"**
2. It may suggest upgrading Gradle - **Accept the suggestions**
3. Android Studio will automatically:
   - Download the correct Gradle version
   - Update plugin versions
   - Resolve dependency issues
   - Create missing wrapper files

### Step 3: Build the APK
1. Wait for sync to complete (check bottom status bar)
2. Go to **Build → Build Bundle(s) / APK(s) → Build APK(s)**
3. Wait for build to complete
4. APK will be created in: `app/build/outputs/apk/debug/`

## Alternative: Manual Gradle Fix

If you prefer command line, here's the manual fix:

### 1. Update Gradle Version
The project is now configured with compatible versions:
- **Gradle**: 7.6
- **Android Gradle Plugin**: 7.4.2
- **Compile SDK**: 33
- **Target SDK**: 33

### 2. Initialize Gradle Wrapper
```powershell
cd "c:\Users\abhiv\OneDrive\Documents\MargSetu\sms-gateway\android-app"
gradle wrapper --gradle-version=7.6
gradlew build
```

## Troubleshooting

### Error: "Gradle not found"
**Solution**: Use Android Studio method above (recommended)

### Error: "SDK not found"
**Solution**: 
1. Open Android Studio
2. Go to File → Settings → Appearance & Behavior → System Settings → Android SDK
3. Install Android SDK 33 (API level 33)

### Error: "Java version incompatible"  
**Solution**: 
1. Ensure Java 11 or 17 is installed
2. Set JAVA_HOME environment variable
3. Or let Android Studio manage Java automatically

## Expected Result
✅ **Successful build will create**: `app-debug.apk`  
✅ **File size**: ~8-12 MB  
✅ **Ready for installation** on Android devices  

## Installation
Once built, install the APK:
```powershell
# Via ADB (if device connected)
adb install app-debug.apk

# Or manually:
# 1. Copy APK to Android device
# 2. Enable "Install from unknown sources"  
# 3. Tap APK file to install
```

## Next Steps After Successful Build
1. **Install APK** on Android device/emulator
2. **Grant permissions**: SMS, Internet, Notifications
3. **Disable battery optimization** for the app
4. **Test connection** to backend server (10.148.173.6:5000)
5. **Send test SMS**: `BUS123:26.912345,75.123456`

The SMS Gateway system is ready once the APK is built and installed!