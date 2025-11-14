# MargSetu SMS Gateway - Quick Start Guide

## 🚀 Quick Setup (5 minutes)

### Step 1: Open Android Studio
```
Directory to open: c:\Users\abhiv\OneDrive\Documents\MargSetu\sms-gateway\android-app
```

### Step 2: Build and Install
1. Click "Sync Project with Gradle Files" (if prompted)
2. Click "Build" → "Build Bundle(s) / APK(s)" → "Build APK(s)"
3. Install APK on your Android device/emulator
4. Open the "MargSetu SMS Gateway" app

### Step 3: Configure App
1. Grant all permissions when prompted:
   - ✅ SMS reading/receiving
   - ✅ Internet access  
   - ✅ Notification permissions
2. Disable battery optimization (when prompted)
3. Settings should be pre-configured:
   - **Server URL**: `http://10.148.173.6:5000` ✅
   - **API Key**: `margsetu-gateway-key-2024` ✅
4. Click "Test Connection" to verify backend connectivity

### Step 4: Test SMS Processing
Send these test messages to your device:

**Driver Location:**
```
BUS123:26.912345,75.123456
```

**Passenger Query:**
```
LOC BUS123
```

### Step 5: Verify Success
- ✅ App status shows "Active" (green indicator)
- ✅ SMS logs show "SMS Received" and "SMS Forwarded"
- ✅ Backend at `10.148.173.6:5000` receives webhook calls
- ✅ No error messages in logs

---

## 🧪 Testing Options

### Option 1: Real Device Testing
Send SMS messages to the device with the gateway app installed.

### Option 2: Android Emulator Testing
```bash
# Start emulator, then use ADB commands:
adb emu sms send +919876543210 "BUS123:26.912345,75.123456"
adb emu sms send +919876543210 "LOC BUS123"
```

### Option 3: Automated Demo Scripts
Choose your platform:

**Windows PowerShell:**
```powershell
cd "c:\Users\abhiv\OneDrive\Documents\MargSetu\sms-gateway"
.\demo-script.ps1
```

**Windows Command Prompt:**
```cmd
cd "c:\Users\abhiv\OneDrive\Documents\MargSetu\sms-gateway"
demo-script.bat
```

**Linux/Mac:**
```bash
cd "/path/to/sms-gateway"
chmod +x demo-script.sh
./demo-script.sh
```

---

## 📱 Expected SMS Formats

### Driver Location Format
```
BUS[ID]:[LATITUDE],[LONGITUDE]

Examples:
BUS123:26.912345,75.123456
BUS456:28.123456,77.654321
BUS789:19.876543,72.987654
```

### Passenger Query Format
```
LOC BUS[ID]

Examples:
LOC BUS123
LOC BUS456
LOC BUS789
```

---

## 🔍 Troubleshooting

### ❌ "Connection Test Failed"
- Check if backend server is running on `10.148.173.6:5000`
- Verify network connectivity between device and server
- Test with: `ping 10.148.173.6` from your device/network

### ❌ "SMS Not Processing"
- Ensure SMS permissions are granted in app settings
- Disable battery optimization for the app
- Check that the gateway service is running (notification should be visible)

### ❌ "Gateway Status: Inactive"
- Grant all required permissions
- Save settings with valid server URL and API key
- Restart the app after granting permissions

---

## 📊 Success Indicators

### In Android App:
- 🟢 Status: "Active" 
- 📱 Recent SMS logs visible
- 🔔 Persistent notification: "Gateway is running"
- ⏰ "Last Activity" timestamp updates

### In Backend Server:
- 📨 Webhook POST requests received
- 🔑 Authentication successful (x-gateway-api-key header)
- 💾 Data stored in database
- 📝 Server logs show incoming SMS data

---

## 🚀 Production Deployment

### Android Device Setup:
1. Install APK on dedicated Android device
2. Configure with production server URL
3. Disable battery optimization permanently
4. Set app to auto-start on device boot
5. Ensure stable network connectivity

### Monitoring:
- Check app status daily
- Monitor SMS processing logs
- Verify backend webhook reception
- Test with periodic SMS messages

---

## 📋 Testing Checklist

- [ ] Android app builds successfully
- [ ] APK installs on device/emulator
- [ ] All permissions granted
- [ ] Battery optimization disabled
- [ ] Gateway status shows "Active"
- [ ] Connection test passes
- [ ] Driver location SMS processed correctly
- [ ] Passenger query SMS processed correctly
- [ ] Invalid SMS formats ignored
- [ ] Backend receives webhook calls
- [ ] Authentication headers work
- [ ] Database updates confirmed
- [ ] App logs show activity
- [ ] Service runs in background
- [ ] Notification remains persistent

**✅ All items checked = SMS Gateway fully functional!**