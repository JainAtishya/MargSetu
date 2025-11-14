# MargSetu Driver App 🚍

The **MargSetu Driver App** is an Android application built with Kotlin for bus drivers to track their location and send real-time updates to the MargSetu backend system. It supports both internet-based tracking and SMS fallback for low connectivity areas.

## 🎯 Features

### ✅ Core Functionality
- **Driver Authentication**: Secure login with Driver ID and Bus ID
- **Real-time GPS Tracking**: Continuous location updates every 5-10 seconds
- **Journey Management**: Start/Stop journey controls with status tracking
- **SOS Emergency Alerts**: Emergency button to send immediate alerts to authorities
- **SMS Fallback**: Automatic SMS sending when internet is unavailable
- **Persistent Tracking**: Foreground service ensures tracking continues in background
- **Network-aware**: Automatic switching between internet and SMS modes

### 🎨 UI/UX Features
- **Light Theme Design**: Clean, driver-friendly interface using the specified color palette
- **Status Indicators**: Real-time display of GPS, network, and journey status
- **Intuitive Navigation**: Simple, large buttons for easy use while driving
- **Permission Handling**: Smooth permission requests and status management
- **Notifications**: Persistent notification showing journey status

## 🛠 Technical Architecture

### **Tech Stack**
- **Language**: Kotlin
- **UI Framework**: Android Native with Material Design 3
- **Location Services**: Google Play Services Location API
- **Networking**: Retrofit + OkHttp
- **Background Processing**: Android Foreground Services
- **Local Storage**: SharedPreferences
- **SMS Integration**: Android SmsManager

### **Project Structure**
```
app/
├── src/main/java/com/margsetu/driver/
│   ├── MainActivity.kt                 # Main dashboard activity
│   ├── LoginActivity.kt               # Login screen
│   ├── network/
│   │   ├── ApiService.kt              # REST API interface
│   │   └── ApiClient.kt               # Retrofit configuration
│   ├── services/
│   │   ├── LocationTrackingService.kt # Background GPS tracking
│   │   └── SOSService.kt              # Emergency alert service
│   └── utils/
│       ├── NetworkUtils.kt            # Network connectivity helpers
│       └── SMSUtils.kt                # SMS communication helpers
└── src/main/res/
    ├── layout/                        # UI layouts
    ├── values/
    │   ├── colors.xml                 # Light color palette
    │   ├── strings.xml                # App strings
    │   └── themes.xml                 # Material Design themes
    └── drawable/                      # Vector icons
```

## 🎨 Design System

### **Color Palette**
Following the specified **Core Light Color Palette**:

| Element | Color | Usage |
|---------|--------|-------|
| **Background** | `#FFFFFF` / `#F9F9F9` | Main backgrounds |
| **Cards/Panels** | `#FAFAFA` / `#F5F5F5` | Card backgrounds |
| **Primary Actions** | `#1976D2` | Start Journey, Login buttons |
| **Secondary Actions** | `#64B5F6` | Secondary buttons |
| **Success/Online** | `#4CAF50` | Online status, GPS enabled |
| **Warning/Idle** | `#FFB74D` | Idle state, warnings |
| **Error/SOS** | `#E57373` | Emergency alerts, errors |
| **Text Primary** | `#212121` | Main text |
| **Text Secondary** | `#616161` | Secondary text |

### **Typography & Components**
- **Material Design 3** components throughout
- **Large touch targets** (minimum 48dp) for driver safety
- **High contrast text** for visibility in various lighting conditions
- **Consistent spacing** using 8dp grid system

## 📱 Key Screens

### **1. Login Screen**
- Clean input fields for Driver ID and Bus ID
- Input validation and error handling
- Automatic login persistence
- Loading states with user feedback

### **2. Main Dashboard**
- **Header Section**: Welcome message, driver/bus info, logout
- **Status Section**: Journey status, GPS/network indicators, last update time
- **Journey Control**: Large Start/Stop journey button
- **Emergency Section**: Prominent SOS button with confirmation dialog

### **3. Status Indicators**
Real-time display of:
- Journey Status (Active/Inactive)
- GPS Status (Enabled/Disabled)
- Network Status (Online/Offline)
- Location Updates (Sending/Stopped)
- Last Update Timestamp

## 🔧 Setup & Installation

### **Prerequisites**
- **Android Studio** Flamingo or newer
- **Android SDK** API level 21+ (Android 5.0+)
- **Google Play Services** for location APIs
- **Kotlin** 1.9.0+

### **Installation Steps**

1. **Clone/Download the project**
   ```bash
   # Navigate to the project directory
   cd MargSetu/driver-app
   ```

2. **Open in Android Studio**
   - File → Open → Select the `driver-app` folder
   - Wait for Gradle sync to complete

3. **Configure API Endpoint**
   ```kotlin
   // In ApiClient.kt, update the BASE_URL
   private const val BASE_URL = "https://your-backend-api.com/"
   ```

4. **Configure SMS Backend Number**
   ```kotlin
   // In SMSUtils.kt, update the backend SMS number
   private const val BACKEND_SMS_NUMBER = "+your-sms-number"
   ```

5. **Build and Run**
   - Connect Android device or start emulator
   - Click **Run** (▶️) or press `Shift + F10`

## 🔐 Permissions

The app requests the following permissions:

| Permission | Purpose | Required |
|------------|---------|----------|
| `ACCESS_FINE_LOCATION` | Precise GPS tracking | ✅ Critical |
| `ACCESS_COARSE_LOCATION` | Network-based location | ✅ Critical |
| `ACCESS_BACKGROUND_LOCATION` | Background GPS tracking | ✅ Critical |
| `INTERNET` | API communication | ✅ Critical |
| `ACCESS_NETWORK_STATE` | Network status checking | ✅ Critical |
| `SEND_SMS` | SMS fallback capability | ✅ Critical |
| `FOREGROUND_SERVICE` | Background tracking service | ✅ Critical |
| `WAKE_LOCK` | Keep app running | ⚡ Performance |
| `POST_NOTIFICATIONS` | Journey status notifications | 📢 UX |

## 🌐 API Integration

### **Expected Backend Endpoints**

The app expects these REST API endpoints:

```kotlin
POST /api/driver/login
POST /api/location/update
POST /api/sos/alert
GET  /api/driver/{driverId}/status
```

### **Sample API Requests**

**Location Update:**
```json
{
  "driverId": "DRV001",
  "busId": "BUS123",
  "latitude": 18.5204,
  "longitude": 73.8567,
  "accuracy": 10.0,
  "speed": 25.5,
  "timestamp": "2024-09-13 14:30:15",
  "source": "GPS"
}
```

**SOS Alert:**
```json
{
  "driverId": "DRV001",
  "busId": "BUS123",
  "latitude": 18.5204,
  "longitude": 73.8567,
  "timestamp": "2024-09-13 14:30:15",
  "message": "Emergency alert from driver"
}
```

### **SMS Protocol**

When internet is unavailable, the app sends formatted SMS messages:

```
Location: MARGSETU:LOC:BUS123:DRV001:18.5204:73.8567:10.0:2024-09-13 14:30:15
SOS Alert: MARGSETU:SOS:BUS123:DRV001:18.5204:73.8567:EMERGENCY
```

## 🔄 Usage Flow

### **Driver Workflow**

1. **Login**
   - Enter Driver ID and Bus ID
   - App validates and stores credentials
   - Redirects to main dashboard

2. **Start Journey**
   - Tap "Start Journey" button
   - App requests location permissions if needed
   - Begins GPS tracking every 5-10 seconds
   - Shows persistent notification

3. **During Journey**
   - Real-time status indicators update
   - Location sent via internet (or SMS fallback)
   - SOS button available for emergencies

4. **Emergency Situations**
   - Tap red "SOS EMERGENCY" button
   - Confirmation dialog prevents accidental activation
   - Immediate alert sent to backend via API or SMS

5. **End Journey**
   - Tap "Stop Journey" button
   - GPS tracking stops
   - Notification disappears

6. **Logout**
   - Tap logout button in header
   - Stops any active journey
   - Clears stored credentials
   - Returns to login screen

## 🚀 Future Enhancements

### **Planned Features**
- [ ] **Offline Route Caching**: Store route data for offline operation
- [ ] **Driver Analytics**: Journey statistics and performance metrics  
- [ ] **Push Notifications**: Receive messages from dispatch center
- [ ] **Voice Commands**: Hands-free journey control
- [ ] **Multi-language Support**: Hindi, Marathi, and other regional languages
- [ ] **Advanced SMS Features**: Two-way SMS communication
- [ ] **Battery Optimization**: Adaptive location frequency based on battery level
- [ ] **Geofencing**: Automatic journey start/stop at depot locations

### **Technical Improvements**
- [ ] **Room Database**: Local data persistence
- [ ] **WorkManager**: Reliable background task scheduling
- [ ] **Jetpack Compose**: Modern UI framework migration
- [ ] **Dependency Injection**: Hilt/Dagger integration
- [ ] **Unit Testing**: Comprehensive test coverage
- [ ] **CI/CD Pipeline**: Automated building and deployment

## 🐛 Troubleshooting

### **Common Issues**

**GPS Not Working:**
- Check location permissions are granted
- Ensure GPS is enabled in device settings
- Try restarting the app

**SMS Not Sending:**
- Verify SMS permission is granted
- Check device has cellular connectivity
- Confirm SMS backend number is configured

**Journey Not Starting:**
- Check all location permissions
- Verify GPS is enabled
- Ensure app has background permissions

**Network Issues:**
- App automatically falls back to SMS
- Check internet connectivity
- Verify API endpoint is reachable

## 📋 Testing

### **Manual Testing Checklist**
- [ ] Login with valid/invalid credentials
- [ ] Permission grant/deny scenarios
- [ ] Start/stop journey functionality  
- [ ] GPS tracking accuracy
- [ ] Network switching (WiFi ↔ Mobile Data ↔ Offline)
- [ ] SMS fallback when offline
- [ ] SOS alert functionality
- [ ] App backgrounding/foregrounding
- [ ] Device restart with active journey
- [ ] Logout and session management

### **Device Testing**
Test on various Android versions and device types:
- [ ] Android 5.0+ (API 21+)
- [ ] Different screen sizes
- [ ] Low-end and high-end devices
- [ ] Various network conditions

## 📞 Support

For technical issues or feature requests:
- **Project Repository**: Contact project maintainer
- **Emergency Backend Issues**: Check with backend team
- **SMS Configuration**: Verify with SMS service provider

---

**Built with ❤️ for better public transportation in India 🇮🇳**

*MargSetu - Connecting Passengers, Drivers, and Authorities*