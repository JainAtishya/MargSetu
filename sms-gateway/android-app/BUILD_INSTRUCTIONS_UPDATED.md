# SMS Gateway Android App - Build Instructions (Updated)

## What we've fixed:

1. **Updated Android Gradle Plugin** to 8.2.0 (from 8.1.4)
   - Better compatibility with Java 21 and Gradle 8.5
   - Resolves jlink.exe transformation issues

2. **Updated Java Target** to 17 (from 11)
   - More stable with current Android toolchain
   - Better jlink compatibility

3. **Updated Kotlin** to 1.9.20 (from 1.9.10)
   - Matches AGP 8.2.0 requirements

4. **Disabled Configuration Cache**
   - Prevents serialization issues we were seeing
   - Avoids the complex cache state errors

5. **Updated Target SDK** to 33 (from 34)
   - More stable build target while keeping compile SDK at 34

## Steps to Build:

### Option 1: Android Studio (Recommended)
1. **Close Android Studio completely**
2. **Delete these directories** if they exist:
   - `C:\Users\abhiv\OneDrive\Documents\MargSetu\sms-gateway\android-app\build`
   - `C:\Users\abhiv\OneDrive\Documents\MargSetu\sms-gateway\android-app\app\build`
   - `C:\Users\abhiv\OneDrive\Documents\MargSetu\sms-gateway\android-app\.gradle`

3. **Open Android Studio**
4. **File → Open** → Select the `android-app` folder
5. **Wait for sync** (you might see "Sync Now" banner at the top)
6. Once synced, click **Build → Build Bundle(s) / APK(s) → Build APK(s)**

### Option 2: Command Line (if gradlew is fixed)
```bash
cd "C:\Users\abhiv\OneDrive\Documents\MargSetu\sms-gateway\android-app"
.\gradlew.bat clean assembleDebug --no-configuration-cache
```

## If still getting jlink errors:

1. **Check Android Studio JDK**:
   - File → Settings → Build → Build Tools → Gradle
   - Set "Gradle JDK" to "Android Studio default JDK" or Java 17

2. **Check Android SDK**:
   - File → Settings → Appearance & Behavior → System Settings → Android SDK
   - Ensure Android 13 (API 33) and Android 14 (API 34) are installed

3. **Clean everything**:
   - Build → Clean Project
   - File → Invalidate Caches → Invalidate and Restart

## Key configuration changes made:

**build.gradle (project):**
```gradle
plugins {
    id 'com.android.application' version '8.2.0' apply false
    id 'org.jetbrains.kotlin.android' version '1.9.20' apply false
}
```

**app/build.gradle:**
```gradle
android {
    compileSdk 34
    defaultConfig {
        targetSdk 33  // Changed from 34
    }
    compileOptions {
        sourceCompatibility JavaVersion.VERSION_17  // Changed from 11
        targetCompatibility JavaVersion.VERSION_17  // Changed from 11
    }
    kotlinOptions {
        jvmTarget = '17'  // Changed from '11'
    }
}
```

**gradle.properties:**
```properties
org.gradle.configuration-cache=false  # Disabled cache
```

These changes should resolve the jlink.exe and Java compatibility issues you were experiencing.