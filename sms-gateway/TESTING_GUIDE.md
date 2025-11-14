# MargSetu SMS Gateway - Testing Guide

## Overview
This guide covers testing the complete SMS Gateway system that forwards SMS messages from Android devices to the backend server at `10.148.173.6:5000`.

## System Architecture
```
SMS → Android Gateway App → HTTP POST → Backend (10.148.173.6:5000) → Database/Processing
```

## Prerequisites
- Android device with SMS Gateway app installed
- Backend server running at `10.148.173.6:5000`
- Network connectivity between Android device and backend
- SMS sending capability (real device or emulator)

## Android App Setup

### 1. Installation
1. Build and install the APK on Android device
2. Open the SMS Gateway app
3. Grant all required permissions:
   - SMS reading/receiving
   - Internet access
   - Notification permissions
4. Disable battery optimization for the app

### 2. Configuration
Default settings (should work with existing backend):
- **Server URL**: `http://10.148.173.6:5000`
- **API Key**: `margsetu-gateway-key-2024`

### 3. Connection Test
1. Open the app
2. Click "Test Connection" button
3. Verify successful connection to backend

## SMS Testing

### Driver Location SMS Format
```
BUS123:26.912345,75.123456
```

**Expected Webhook Payload**:
```json
{
  "type": "driver_location",
  "busId": "BUS123",
  "latitude": 26.912345,
  "longitude": 75.123456,
  "sender": "+919876543210",
  "timestamp": 1640995200000,
  "originalMessage": "BUS123:26.912345,75.123456",
  "receivedAt": 1640995201000
}
```

### Passenger Query SMS Format
```
LOC BUS123
```

**Expected Webhook Payload**:
```json
{
  "type": "passenger_query",
  "busId": "BUS123",
  "sender": "+919876543210",
  "timestamp": 1640995200000,
  "originalMessage": "LOC BUS123",
  "receivedAt": 1640995201000
}
```

## Testing Methods

### Method 1: Real Device Testing
1. Send SMS to the device running the gateway app
2. Use the exact formats above
3. Monitor app logs for processing confirmation
4. Check backend logs for webhook reception

### Method 2: Android Emulator Testing
```bash
# Open Android Studio/AVD Manager
# Start emulator with SMS Gateway app installed
# Use ADB to send test SMS messages

# Send driver location SMS
adb emu sms send +919876543210 "BUS123:26.912345,75.123456"

# Send passenger query SMS
adb emu sms send +919876543210 "LOC BUS123"

# Send additional test cases
adb emu sms send +919876543210 "BUS456:28.123456,77.654321"
adb emu sms send +919876543210 "LOC BUS456"
```

### Method 3: Backend Webhook Testing
Test the webhook endpoint directly:

```bash
# Test driver location webhook
curl -X POST http://10.148.173.6:5000/api/sms/webhook \
  -H "Content-Type: application/json" \
  -H "x-gateway-api-key: margsetu-gateway-key-2024" \
  -d '{
    "type": "driver_location",
    "busId": "BUS123",
    "latitude": 26.912345,
    "longitude": 75.123456,
    "sender": "+919876543210",
    "timestamp": 1640995200000,
    "originalMessage": "BUS123:26.912345,75.123456",
    "receivedAt": 1640995201000
  }'

# Test passenger query webhook
curl -X POST http://10.148.173.6:5000/api/sms/webhook \
  -H "Content-Type: application/json" \
  -H "x-gateway-api-key: margsetu-gateway-key-2024" \
  -d '{
    "type": "passenger_query",
    "busId": "BUS123",
    "sender": "+919876543210",
    "timestamp": 1640995200000,
    "originalMessage": "LOC BUS123",
    "receivedAt": 1640995201000
  }'

# Test connection endpoint
curl -X POST http://10.148.173.6:5000/api/sms/webhook \
  -H "Content-Type: application/json" \
  -H "x-gateway-api-key: margsetu-gateway-key-2024" \
  -d '{
    "type": "test",
    "timestamp": 1640995200000,
    "message": "Gateway connection test"
  }'
```

## Troubleshooting

### Android App Issues
1. **SMS not processed**:
   - Check SMS permissions granted
   - Verify app not battery optimized
   - Ensure gateway service running
   - Check network connectivity

2. **Connection failed**:
   - Verify server URL and API key
   - Test network connectivity to 10.148.173.6:5000
   - Check backend server status
   - Verify firewall/port settings

3. **App crashes**:
   - Check device logs: `adb logcat -s "SmsReceiver"`
   - Verify all permissions granted
   - Check available storage space

### Backend Issues
1. **Webhook not received**:
   - Verify backend server running on port 5000
   - Check API key authentication
   - Monitor backend logs
   - Test direct curl requests

2. **Database issues**:
   - Verify MongoDB connection
   - Check collection permissions
   - Monitor database logs

## Monitoring and Logs

### Android App Monitoring
- Open SMS Gateway app
- Check "Status" indicator (should be green/active)
- Review "SMS Logs" section for recent activity
- Monitor "Last Activity" timestamp

### Backend Monitoring
- Monitor backend server logs
- Check webhook endpoint access logs
- Verify database insertions
- Monitor Socket.IO connections (if applicable)

### Network Monitoring
```bash
# Test connectivity from Android device
ping 10.148.173.6

# Test port connectivity
telnet 10.148.173.6 5000

# Check HTTP response
curl -I http://10.148.173.6:5000/api/sms/webhook
```

## Performance Testing

### Load Testing SMS Processing
```bash
# Send multiple SMS messages rapidly
for i in {1..10}; do
  adb emu sms send +919876543210 "BUS$i:26.$i,75.$i"
  sleep 2
done
```

### Stress Testing Webhook
```bash
# Multiple concurrent webhook calls
for i in {1..50}; do
  curl -X POST http://10.148.173.6:5000/api/sms/webhook \
    -H "Content-Type: application/json" \
    -H "x-gateway-api-key: margsetu-gateway-key-2024" \
    -d "{\"type\":\"driver_location\",\"busId\":\"BUS$i\",\"latitude\":26.$i,\"longitude\":75.$i,\"sender\":\"+919876543210\",\"timestamp\":$(date +%s)000,\"originalMessage\":\"BUS$i:26.$i,75.$i\",\"receivedAt\":$(date +%s)000}" &
done
wait
```

## Expected Results

### Successful SMS Processing
1. SMS received on Android device
2. Gateway app logs show "SMS Received" and "SMS Forwarded"
3. Backend receives webhook POST request
4. Database updated with location/query data
5. Status indicators show active state

### Error Scenarios
1. **Invalid SMS format**: App logs "SMS format not recognized"
2. **Network error**: App logs "Failed to forward SMS"  
3. **Backend error**: HTTP error response logged
4. **Authentication error**: 401/403 response from backend

## Demo Script

For demonstration purposes:

```bash
#!/bin/bash
echo "MargSetu SMS Gateway Demo"
echo "========================="

echo "1. Sending driver location SMS..."
adb emu sms send +919876543210 "BUS123:26.912345,75.123456"
sleep 3

echo "2. Sending passenger query SMS..."
adb emu sms send +919876543210 "LOC BUS123"
sleep 3

echo "3. Testing webhook directly..."
curl -X POST http://10.148.173.6:5000/api/sms/webhook \
  -H "Content-Type: application/json" \
  -H "x-gateway-api-key: margsetu-gateway-key-2024" \
  -d '{"type":"test","timestamp":'$(date +%s)'000,"message":"Demo test"}'

echo "Demo complete! Check app logs and backend for results."
```

## Success Criteria
✅ Android app receives and parses SMS correctly  
✅ HTTP requests reach backend with proper authentication  
✅ Backend processes and stores data correctly  
✅ Real-time updates work (if Socket.IO implemented)  
✅ Error handling works for invalid messages  
✅ App remains active in background  
✅ Battery optimization doesn't kill the service