# Passenger App Crash Fix - Build & Test Guide

## 🐛 Issue Fixed
**Problem:** App was crashing when clicking "Search Buses" button
**Root Cause:** App was using sample data instead of connecting to real backend API
**Solution:** Updated app to use actual backend API calls

## 🔧 Changes Made

### 1. Created Station Model
- `models/Station.kt` - Proper station data structure with ID, name, coordinates

### 2. Updated ApiClient
- Fixed `getStations()` to return Station objects with IDs
- Updated `searchBuses()` to handle backend response format correctly
- Added proper error handling and fallback to sample data

### 3. Updated BusListingActivity
- Now uses real API calls instead of sample data
- Added coroutine support for async API calls
- Graceful fallback to sample data if API fails

### 4. Updated Bus Model
- Fixed JSON parsing to match backend API response format
- Properly maps `busNumber`, `routeName`, `driverName`, etc.

## 🚀 Build & Test Instructions

### 1. Build the App
```bash
cd C:\Users\DELL\Desktop\MargSetu\passenger-app
.\build-passenger-app.bat
```

### 2. Install & Test
1. Install the APK on your device
2. Make sure backend server is running: `npm start` in backend folder  
3. Ensure device is on same WiFi as your computer (IP: 10.148.173.6)

### 3. Test Flow
1. **Open App** - Should load without crashes
2. **Enter Locations:**
   - From: `Rajpura` (or any station from backend)
   - To: `Zirakpur` (or any other station)
3. **Click "Search Buses"** - Should NOT crash now
4. **Verify Results:**
   - If API connection works: Shows real buses from backend
   - If API fails: Falls back to sample data (no crash)

## 🔍 Debug Information

### Backend API Endpoints Being Used:
- `http://10.148.173.6:5000/api/android/stations` - Get all stations
- `http://10.148.173.6:5000/api/android/buses/search?from=X&to=Y` - Search buses

### Log Messages to Watch:
- **BusListingActivity**: Look for "Loading buses for route" messages
- **ApiClient**: Watch for API call success/failure logs
- **Error Fallback**: If API fails, should see "Falling back to sample data"

### Test Both Scenarios:
1. **With Backend Running**: Should get real data from seeded Punjab routes
2. **Without Backend**: Should gracefully fall back to sample data

## 📱 Expected Behavior

### ✅ Success Case (Backend Connected):
- App shows real buses for valid routes (e.g., Rajpura → Zirakpur)
- Bus details include real driver names and bus numbers
- No crashes, smooth navigation

### ✅ Fallback Case (Backend Offline):
- App shows sample buses for any search
- No crashes, graceful error handling
- User can still interact with sample data

## 🛠️ If Issues Persist:

1. **Check Logs:**
   - Use `adb logcat | grep -E "(BusListingActivity|ApiClient)"` 
   - Look for connection errors or JSON parsing issues

2. **Verify Network:**
   - Test backend URL in browser: `http://10.148.173.6:5000/api/android/health`
   - Check device WiFi connection

3. **Reset & Retry:**
   - Uninstall old app version
   - Rebuild and reinstall fresh APK

---

**Status:** 🔧 Ready for testing  
**Expected Result:** No more crashes on "Search Buses" button  
**Fallback:** Sample data if API connection fails