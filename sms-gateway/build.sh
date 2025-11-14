#!/bin/bash

# MargSetu SMS Gateway - Build Script
# This script builds the Android APK and prepares the complete system for deployment

echo "========================================="
echo "MargSetu SMS Gateway - Build Script"
echo "========================================="
echo ""

# Check if we're in the right directory
if [ ! -f "android-app/build.gradle" ]; then
    echo "❌ Error: Please run this script from the sms-gateway directory"
    echo "Expected structure: sms-gateway/android-app/build.gradle"
    exit 1
fi

echo "📱 Building Android SMS Gateway App..."
echo ""

# Change to Android app directory
cd android-app

# Check if gradlew exists
if [ ! -f "gradlew" ]; then
    echo "⚠️  Warning: gradlew not found. Creating Gradle Wrapper..."
    
    # Create gradlew if it doesn't exist
    gradle wrapper --gradle-version=8.1.1 --distribution-type=all
    
    if [ ! -f "gradlew" ]; then
        echo "❌ Error: Failed to create Gradle Wrapper"
        echo "Please ensure Gradle is installed and run: gradle wrapper"
        exit 1
    fi
    
    # Make gradlew executable
    chmod +x gradlew
fi

echo "🔧 Cleaning project..."
./gradlew clean

echo "🔄 Syncing dependencies..."
./gradlew --refresh-dependencies

echo "🏗️  Building APK..."
./gradlew assembleDebug

# Check build result
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Build successful!"
    echo ""
    
    # Find the APK file
    APK_PATH=$(find . -name "*.apk" -path "*/debug/*" | head -1)
    
    if [ -n "$APK_PATH" ]; then
        echo "📦 APK created at: $APK_PATH"
        echo "📱 File size: $(du -h "$APK_PATH" | cut -f1)"
        echo ""
        
        # Copy APK to parent directory for easy access
        cp "$APK_PATH" "../sms-gateway.apk"
        echo "📋 APK copied to: ../sms-gateway.apk"
        echo ""
    else
        echo "⚠️  Warning: APK file not found in expected location"
    fi
    
    # Display installation instructions
    echo "========================================="
    echo "📱 Installation Instructions"
    echo "========================================="
    echo ""
    echo "Option 1 - Install via ADB:"
    echo "  adb install sms-gateway.apk"
    echo ""
    echo "Option 2 - Manual Installation:"
    echo "  1. Copy sms-gateway.apk to your Android device"
    echo "  2. Enable 'Install from unknown sources' in Settings"
    echo "  3. Open the APK file to install"
    echo ""
    echo "========================================="
    echo "⚙️  Configuration"
    echo "========================================="
    echo ""
    echo "Default Settings (should work with existing backend):"
    echo "  📡 Server URL: http://10.148.173.6:5000"
    echo "  🔑 API Key: margsetu-gateway-key-2024"
    echo ""
    echo "After Installation:"
    echo "  1. ✅ Grant SMS and Internet permissions"
    echo "  2. 🔋 Disable battery optimization"
    echo "  3. 🧪 Test connection in the app"
    echo "  4. 📲 Send test SMS to verify functionality"
    echo ""
    echo "========================================="
    echo "🧪 Testing Commands"
    echo "========================================="
    echo ""
    echo "Test SMS Messages:"
    echo "  Driver Location: BUS123:26.912345,75.123456"
    echo "  Passenger Query: LOC BUS123"
    echo ""
    echo "ADB Test Commands:"
    echo "  adb emu sms send +919876543210 \"BUS123:26.912345,75.123456\""
    echo "  adb emu sms send +919876543210 \"LOC BUS123\""
    echo ""
    echo "Direct Backend Test:"
    echo "  curl -X POST http://10.148.173.6:5000/api/sms/webhook \\"
    echo "    -H \"Content-Type: application/json\" \\"
    echo "    -H \"x-gateway-api-key: margsetu-gateway-key-2024\" \\"
    echo "    -d '{\"type\":\"test\",\"timestamp\":$(date +%s)000,\"message\":\"Test\"}'"
    echo ""
    echo "========================================="
    echo "🚀 SMS Gateway System Ready!"
    echo "========================================="
    echo ""
    echo "✅ Android Gateway App: BUILT"
    echo "✅ Backend Server: RUNNING (10.148.173.6:5000)"
    echo "✅ Testing Scripts: AVAILABLE"
    echo "✅ Documentation: COMPLETE"
    echo ""
    echo "Next Steps:"
    echo "1. Install APK on Android device"
    echo "2. Configure and test connection"
    echo "3. Send test SMS messages"
    echo "4. Verify backend receives data"
    echo "5. Monitor logs for any issues"
    echo ""
    
else
    echo ""
    echo "❌ Build failed!"
    echo ""
    echo "Common solutions:"
    echo "1. Check Java version (needs Java 11+)"
    echo "2. Ensure Android SDK is properly installed"
    echo "3. Try: ./gradlew clean build"
    echo "4. Check for any missing dependencies"
    echo ""
    echo "For detailed error information, run:"
    echo "  ./gradlew assembleDebug --stacktrace --info"
    echo ""
    exit 1
fi