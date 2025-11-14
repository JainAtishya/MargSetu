# SMS Gateway Android App

## Overview
MargSetu SMS Gateway is an Android application that receives SMS messages and forwards them to a backend webhook server. It specifically handles:

1. **Driver Location SMS**: Format `BUS123:26.912345,75.123456` 
2. **Passenger Query SMS**: Format `LOC BUS123`

## Features
- Automatic SMS interception and parsing
- Real-time forwarding to configurable webhook endpoint
- Built-in connection testing
- Activity logging and monitoring
- Foreground service for reliable operation
- Battery optimization handling

## Setup Instructions

### Prerequisites
- Android device with SMS capability
- Network connectivity to backend server
- Backend server running at configured endpoint

### Installation
1. Install the APK on your Android device
2. Grant required permissions:
   - SMS reading/receiving
   - Internet access
   - Notification permissions (Android 13+)
3. Disable battery optimization for the app
4. Configure server settings

### Configuration
1. Open the app
2. Configure Server Settings:
   - **Server URL**: `http://10.148.173.6:5000` (or your backend server)
   - **API Key**: `margsetu-gateway-key-2024` (or your configured key)
3. Test connection to verify setup
4. The gateway will automatically start monitoring SMS

## Architecture

### Core Components
- `SmsReceiver`: BroadcastReceiver for intercepting SMS
- `NetworkService`: HTTP client for webhook forwarding  
- `GatewayService`: Foreground service for persistence
- `LogManager`: Activity logging and history
- `GatewayConfig`: Settings management

### SMS Processing Flow
1. SMS received → `SmsReceiver.onReceive()`
2. Message parsed using regex patterns
3. Payload constructed with metadata
4. HTTP POST to webhook endpoint with auth header
5. Response logged and UI updated

## API Integration

### Webhook Endpoint
```
POST /api/sms/webhook
Headers:
  Content-Type: application/json
  x-gateway-api-key: margsetu-gateway-key-2024
```

### Payload Format
**Driver Location**:
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

**Passenger Query**:
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

## Troubleshooting

### SMS Not Being Processed
1. Check SMS permissions are granted
2. Verify app is not battery optimized
3. Ensure gateway service is running
4. Check server connectivity

### Connection Issues
1. Verify server URL and API key
2. Test network connectivity
3. Check server logs for incoming requests
4. Verify firewall/port settings

### Performance
- App runs as foreground service for reliability
- Lightweight HTTP client with connection pooling
- Minimal UI updates to preserve battery
- Automatic log rotation (max 100 entries)

## Testing

### Emulator SMS Testing
```bash
# Send driver location SMS
adb emu sms send +919876543210 "BUS123:26.912345,75.123456"

# Send passenger query SMS  
adb emu sms send +919876543210 "LOC BUS123"
```

### Manual Testing
1. Send SMS to device with correct format
2. Check app logs for processing confirmation
3. Verify webhook received on backend
4. Monitor connection status in UI

## Security
- API key authentication for webhook calls
- No sensitive data stored locally
- HTTPS support for secure transmission
- Permission-based SMS access only