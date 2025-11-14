# 📱 MargSetu SMS Integration Guide

## Overview
The MargSetu SMS integration enables offline GPS tracking and passenger queries when internet connectivity is unavailable. This system uses Twilio SMS to maintain communication between drivers, passengers, and the backend system.

## 🎯 Key Features

### 1. Offline GPS Tracking
- **Automatic GPS via SMS**: Drivers can send location data via SMS when internet is down
- **Standardized Format**: Uses GPS:BusID,Lat,Lng,Speed,Heading,Timestamp format
- **Auto-confirmation**: Drivers receive confirmation SMS when GPS is received
- **Real-time Processing**: GPS data is processed and stored in real-time

### 2. Passenger Location Queries
- **Bus Location**: Query specific bus location via SMS
- **Route Information**: Get all buses on a specific route
- **Nearest Buses**: Find buses near a location
- **Help System**: Built-in help and instruction system

### 3. Emergency Alerts
- **Bulk SMS Alerts**: Send emergency notifications to multiple contacts
- **Real-time Alerts**: Immediate SMS delivery for critical situations
- **Multi-recipient Support**: Alert passengers, drivers, and authorities

## 🔧 Setup Instructions

### 1. Twilio Account Setup
1. Create a Twilio account at https://www.twilio.com
2. Get your Account SID and Auth Token from the console
3. Purchase a Twilio phone number
4. Configure webhook URL: `https://your-domain.com/api/sms/webhook`

### 2. Environment Configuration
Add to your `.env` file:
```env
# Twilio SMS Configuration
TWILIO_ACCOUNT_SID=your_twilio_account_sid_here
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890

# SMS Feature Flags
SMS_GPS_ENABLED=true
SMS_PASSENGER_QUERIES_ENABLED=true

# SMS Configuration
SMS_AUTO_GPS_INTERVAL=60
SMS_MAX_RETRY_ATTEMPTS=3
SMS_WEBHOOK_URL=https://your-domain.com/api/sms/webhook
```

### 3. Install Dependencies
```bash
npm install twilio
```

## 📱 SMS Message Formats

### Driver GPS Messages
Format: `GPS:BusID,Latitude,Longitude,Speed,Heading,Timestamp`

**Examples:**
```
GPS:MH12AB1234,19.0760,72.8777,45,180,1694615425
GPS:KA05BC5678,12.9716,77.5946,60,270,1694615500
```

**Parameters:**
- `BusID`: Unique bus identifier (e.g., MH12AB1234)
- `Latitude`: GPS latitude coordinate
- `Longitude`: GPS longitude coordinate
- `Speed`: Current speed in km/h
- `Heading`: Direction in degrees (0-360)
- `Timestamp`: Unix timestamp

### Passenger Query Messages

#### 1. Bus Location Query
```
BUS MH12AB1234
```
**Response:** Current location, speed, route info, last update time

#### 2. Route Information Query
```
ROUTE 42
```
**Response:** All active buses on the specified route

#### 3. Nearest Buses Query
```
NEAREST Central Station
```
**Response:** Buses near the specified location with distances and ETAs

#### 4. Help Query
```
HELP
```
**Response:** Complete usage instructions and command reference

## 🛠️ API Endpoints

### Public Endpoints
- `POST /api/sms/webhook` - Twilio webhook for incoming SMS (no auth)

### Protected Endpoints (require authentication)
- `POST /api/sms/bulk-send` - Send bulk SMS notifications
- `POST /api/sms/driver-instructions/:busId` - Send driver setup instructions
- `GET /api/sms/health` - SMS service health check
- `GET /api/sms/analytics` - SMS usage analytics and reports
- `POST /api/sms/test` - Test SMS functionality

## 🔄 Workflow Examples

### 1. Driver Offline GPS Workflow
```
1. Driver's phone detects no internet
2. GPS app automatically sends SMS: "GPS:MH12AB1234,19.0760,72.8777,45,180,1694615425"
3. System receives SMS via webhook
4. GPS data is parsed and validated
5. Location is stored in database
6. Confirmation SMS sent to driver: "✅ GPS received for Bus MH12AB1234"
```

### 2. Passenger Query Workflow
```
1. Passenger has no internet, sends SMS: "BUS MH12AB1234"
2. System receives SMS via webhook
3. Query is parsed and bus location is retrieved
4. Response SMS sent: "🚌 Bus MH12AB1234, Location: 19.0760, 72.8777, Speed: 45 km/h, Last Update: 2 min ago"
```

### 3. Emergency Alert Workflow
```
1. Emergency detected (panic button, accident, etc.)
2. System triggers bulk SMS alert
3. Alert sent to: passengers, drivers, authorities
4. SMS content: "🚨 EMERGENCY ALERT - Bus MH12AB1234 - Immediate response required"
```

## 📊 Analytics and Monitoring

### SMS Logs
All SMS interactions are logged with:
- Phone number
- Message type (driver_gps, passenger_query, notification, alert)
- Status (received, processed, responded, failed)
- Response time
- Error details (if any)

### Analytics Queries
```javascript
// Get SMS analytics for date range
GET /api/sms/analytics?startDate=2024-01-01&endDate=2024-01-31

// Get SMS analytics by type
GET /api/sms/analytics?type=passenger_query
```

### Health Check
```javascript
GET /api/sms/health
```
Response:
```json
{
  "success": true,
  "smsService": {
    "status": "active",
    "message": "SMS service operational",
    "account": "MargSetu Transport",
    "twilioNumber": "+1234567890"
  }
}
```

## 🧪 Testing

### Run SMS Tests
```bash
node tests/sms-test.js
```

### Test SMS Sending
```bash
curl -X POST http://localhost:3000/api/sms/test \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"phoneNumber": "+917890123456", "message": "Test message"}'
```

### Test Webhook (simulate Twilio)
```bash
curl -X POST http://localhost:3000/api/sms/webhook \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d 'From=%2B917890123456&To=%2B1234567890&Body=GPS%3AMH12AB1234%2C19.0760%2C72.8777%2C45%2C180%2C1694615425&MessageSid=SM1234567890'
```

## 🔒 Security Considerations

### 1. Webhook Security
- Validate Twilio webhook signatures
- Use HTTPS for webhook URLs
- Implement rate limiting on webhook endpoint

### 2. Phone Number Validation
- Validate phone number formats
- Prevent SMS spam and abuse
- Track failed delivery attempts

### 3. Data Privacy
- Encrypt sensitive location data
- Implement data retention policies
- Anonymize analytics data

## 🚀 Production Deployment

### 1. Twilio Configuration
- Set up production Twilio account
- Configure webhook URL with HTTPS
- Set up phone number verification

### 2. Environment Setup
```env
NODE_ENV=production
TWILIO_ACCOUNT_SID=prod_account_sid
TWILIO_AUTH_TOKEN=prod_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

### 3. Monitoring
- Set up SMS delivery monitoring
- Configure failure alerts
- Monitor SMS costs and usage

## 🐛 Troubleshooting

### Common Issues

#### 1. SMS Not Received
- Check Twilio account balance
- Verify phone number format
- Check webhook URL accessibility

#### 2. GPS Parsing Errors
- Verify GPS message format
- Check timestamp validity
- Validate coordinate ranges

#### 3. Webhook Not Triggered
- Verify webhook URL configuration
- Check server accessibility
- Review Twilio webhook logs

### Debug Commands
```bash
# Test SMS service health
curl http://localhost:3000/api/sms/health

# Check recent SMS logs
GET /api/sms/analytics?limit=10

# Test phone number formatting
node -e "const {smsService} = require('./services/smsService'); console.log(smsService.formatPhoneNumber('7890123456'));"
```

## 📈 Performance Optimization

### 1. SMS Rate Limiting
- Implement per-user SMS limits
- Use queuing for bulk SMS
- Monitor Twilio rate limits

### 2. Database Optimization
- Index SMS logs by phone number and date
- Implement data archiving
- Optimize query performance

### 3. Caching
- Cache frequently requested bus locations
- Implement response caching
- Use Redis for session management

## 🎯 Future Enhancements

### 1. Advanced Features
- Multi-language SMS support
- Voice call integration
- MMS support for maps
- SMS chatbot with AI

### 2. Analytics Improvements
- Real-time SMS dashboards
- Predictive analytics
- Cost optimization reports
- User behavior analysis

### 3. Integration Expansions
- WhatsApp Business API
- Telegram bot integration
- USSD support for feature phones
- Email fallback system

## 📞 Support

For technical support or questions:
- Check logs: `tail -f logs/sms-service.log`
- Review analytics: GET `/api/sms/analytics`
- Test functionality: `node tests/sms-test.js`
- Monitor health: GET `/api/sms/health`

---

**MargSetu SMS Integration - Connecting Cities When Internet Fails** 🚌📱