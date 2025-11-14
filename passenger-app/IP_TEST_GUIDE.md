# Passenger App IP Configuration - Test Guide

## ✅ Updated Configuration

**Backend Server IP:** `10.148.173.6:5000`  
**API Endpoint:** `http://10.148.173.6:5000/api/android/`

Both driver app and passenger app are now configured to use the same IP address.

## 🚀 Quick Test Steps

### 1. Build the Passenger App
```bash
cd C:\Users\DELL\Desktop\MargSetu\passenger-app
.\build-passenger-app.bat
```

### 2. Install on Device
- Install the generated APK: `app\build\outputs\apk\debug\app-debug.apk`
- Make sure your device is on the same WiFi network as your computer

### 3. Test Backend Connection
Before testing the app, verify the backend is running:

**Check Backend Status:**
```
http://10.148.173.6:5000/api/android/health
```

**Test API Endpoints:**
- Stations: `http://10.148.173.6:5000/api/android/stations`
- Routes: `http://10.148.173.6:5000/api/android/routes`
- Health: `http://10.148.173.6:5000/api/android/health`

### 4. App Testing Flow

1. **Launch Passenger App**
   - App should load without crashes
   - Check if stations are loading

2. **Search for Buses**
   - Select "From" station (e.g., Rajpura)
   - Select "To" station (e.g., Zirakpur)
   - Tap "Search Buses"
   - Should display available buses

3. **View Bus Details**
   - Tap on any bus from search results
   - Should show bus details with location (if available)

4. **Real-time Tracking**
   - If location simulation is running, bus positions should update

## 🔧 Network Configuration Details

### Files Updated:
- `passenger-app/app/src/main/java/com/margsetu/passenger/network/ApiConstants.kt`
  - Changed from: `http://10.0.2.2:5000/api/android/`
  - Changed to: `http://10.148.173.6:5000/api/android/`

### Driver App IP (for reference):
- `driver-app/app/src/main/java/com/margsetu/driver/network/ApiClient.kt`
- Uses: `http://10.148.173.6:5000/api/`

## 📊 Test Data Available

The backend has been seeded with Punjab route data:
- **Stations:** Rajpura, Zirakpur, Chandigarh
- **Routes:** Rajpura-Zirakpur, Zirakpur-Chandigarh  
- **Buses:** 2 buses total (1 per route)
- **Drivers:** 2 drivers (1 per bus)

## 🐛 Troubleshooting

**If app doesn't connect:**
1. Check WiFi network (device and computer on same network)
2. Verify backend server is running: `npm start` in backend folder
3. Test backend URL in browser: `http://10.148.173.6:5000/api/android/health`
4. Check device firewall/security settings

**If no data appears:**
1. Verify database seeding completed successfully
2. Check backend console for error messages
3. Test individual API endpoints in browser

## 🎯 Expected Results

- Passenger app should connect to backend successfully
- Station list should load with Punjab stations
- Bus search should return buses for valid route combinations
- Real-time location updates should work (if simulation is enabled)

---

**Status:** ✅ Ready for testing  
**Last Updated:** September 18, 2025