#!/bin/bash

echo "🔥 === MargSetu API Connection Test ==="
echo "📍 Testing backend server connectivity..."

# Test basic health
echo "1. Testing server health..."
curl -s "http://localhost:5000/api/android/stations" | head -c 100
echo ""

echo "2. Testing bus search API..."
curl -s "http://localhost:5000/api/android/buses/search?from=Mumbai%20Central&to=Pune" | head -c 200
echo ""

echo "3. Backend server status:"
echo "✅ Server should be running on http://localhost:5000"
echo "✅ Android emulator should use http://10.0.2.2:5000"
echo ""

echo "🚀 === Next Steps ==="
echo "1. Install APK: .\gradlew installDebug"
echo "2. Run app and search for 'Pune → Mumbai'"
echo "3. Check if you see toast: '🔄 Showing sample data' or '✅ SHOWING REAL API DATA!'"
echo "4. Watch backend terminal for incoming HTTP requests"
echo ""

echo "🔍 === Debug Info ==="
echo "Backend URL from app: http://10.0.2.2:5000/api/android/"
echo "Station names in DB: Mumbai Central, Pune Railway Station, Nashik Road, etc."
echo "Sample search: from=Pune&to=Mumbai"

