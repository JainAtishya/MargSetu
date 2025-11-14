# SMS FALLBACK FIX - PHONE NUMBER CORRECTED

## Issue Identified and Fixed
**Problem**: SMS fallback wasn't working because of **phone number mismatch** in the codebase.

### Phone Number Inconsistency (FIXED)
- **AppConfig.kt**: Was using `"9015902832"` ❌
- **SMSUtils.kt**: Was using `"7876935991"` ✅
- **Correct Number**: `"7876935991"` (SMS Gateway device)

## Changes Applied

### 1. ✅ Fixed Phone Number Consistency
- **AppConfig.kt**: Updated `SMS_GATEWAY_NUMBER = "7876935991"`
- **SMSUtils.kt**: Confirmed `BACKEND_SMS_NUMBER = "7876935991"`
- Both files now use the same correct phone number

### 2. ✅ SMS Fallback Re-enabled
- **AppConfig.kt**: `ENABLE_SMS_FALLBACK = true`
- GPS locations will be sent via SMS when internet fails

### 3. ✅ Correct GPS Message Format
- **LocationTrackingService.kt**: Uses `"GPS:BUS001,lat,lng,0.0,0,timestamp"` format
- Prevents webhook from treating GPS messages as passenger queries

## Current System Flow (CORRECT)

### Normal Operation (Internet Available)
```
Driver App → HTTPS API → Vercel Backend → Database
✅ NO SMS sent
```

### Fallback Operation (Internet Failed)
```
Driver App → SMS to 7876935991 → SMS Gateway App → Webhook → Database
✅ SMS sent to correct number
✅ NO notification SMS back to driver
```

### Passenger Query (Independent)
```
Passenger SMS "BUS002 details" → SMS Gateway → Webhook → SMS Response to Passenger
✅ Driver receives NO notification
```

## Testing Instructions

### 1. Install Updated APK
- APK Location: `driver-app/app/build/outputs/apk/debug/app-debug.apk`
- Install on driver's device

### 2. Ensure SMS Gateway App is Running
- **Device**: Phone number 7876935991
- **App**: SMS Gateway app must be installed and running
- **Configuration**: Should point to https://vercel-backend-vert-psi.vercel.app

### 3. Test SMS Fallback
**Method 1 - Airplane Mode Test**:
1. Open driver app
2. Login with driver credentials
3. Turn ON Airplane Mode (disable all internet)
4. Click "Start Journey"
5. ✅ **Expected**: SMS sent to 7876935991 with GPS location
6. ✅ **Expected**: NO SMS sent to +918433227260

**Method 2 - Network Disconnect Test**:
1. Disconnect WiFi and mobile data
2. Click "Start Journey" 
3. ✅ **Expected**: SMS fallback triggers automatically

### 4. Verify SMS Reception
- **SMS Gateway Device (7876935991)**: Should receive GPS message like:
  ```
  GPS:BUS001,26.912434,75.787271,0.0,0,1731567890123
  ```
- **Backend Logs**: Should show GPS location processed from SMS
- **Driver Phone (+918433227260)**: Should receive NO SMS

## Verification Commands

### Test Webhook Processing
```powershell
$payload = '{"type":"sms_raw","sender":"+917876935991","message":"GPS:BUS001,26.912434,75.787271,0.0,0,1731567890123","timestamp":1731567890123}'
Invoke-RestMethod -Uri "https://vercel-backend-vert-psi.vercel.app/api/sms/webhook" -Method POST -Headers @{"Content-Type"="application/json"} -Body $payload
```
✅ **Expected Response**: `"GPS location extracted from raw SMS - no SMS response sent"`

### Check Backend Logs
- Monitor Vercel backend logs for GPS location processing
- Should see logs without any SMS response attempts

## Final Status
- ✅ **Phone Number**: Consistent across all files (7876935991)
- ✅ **SMS Fallback**: Enabled and configured correctly  
- ✅ **GPS Format**: Proper `"GPS:"` prefix to prevent notification SMS
- ✅ **Backend**: Correctly processes GPS messages without sending responses
- ✅ **Build**: Successful with all fixes applied

**SMS fallback should now work correctly! The APK is ready for testing.**