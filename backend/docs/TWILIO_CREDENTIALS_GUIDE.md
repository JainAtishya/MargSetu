# 📱 Complete Twilio Setup Guide for MargSetu

## 🎯 What You Need
1. **Account SID** - Your Twilio account identifier  
2. **Auth Token** - Your authentication token
3. **Phone Number** - A Twilio phone number for sending/receiving SMS

## 📋 Step-by-Step Instructions

### Step 1: Create Twilio Account
1. **Visit Twilio**: Go to https://www.twilio.com
2. **Sign Up**: Click "Sign up" (top right corner)
3. **Fill Details**:
   - First Name, Last Name
   - Email address
   - Strong password
4. **Verify Email**: Check your email and click verification link
5. **Phone Verification**: Enter your phone number and verify with SMS code

### Step 2: Complete Account Setup
1. **Choose Use Case**: Select "SMS" or "Programmable Messaging"
2. **Programming Experience**: Choose your level
3. **Project Details**: Enter "MargSetu Transport System"
4. **Products**: Select "Programmable Messaging" (SMS)

### Step 3: Get Your Credentials

#### A. Account SID and Auth Token
1. **Login to Console**: After verification, you'll be at https://console.twilio.com
2. **Dashboard View**: You'll see a box titled "Project Info"
3. **Copy Credentials**:
   ```
   Account SID: ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
   Auth Token: Click "Show" to reveal (keep secret)
   ```

#### B. Get a Phone Number
1. **Navigate**: Go to "Phone Numbers" → "Manage" → "Buy a number"
2. **Choose Country**: Select "India" for +91 numbers (or your preferred country)
3. **Capabilities**: Make sure "SMS" is checked
4. **Search**: Click "Search" to see available numbers
5. **Select**: Choose a number you like (preview shows: +91-XXXXX-XXXXX)
6. **Buy**: Click "Buy" (uses your free credit)

### Step 4: Configure Webhook (for receiving SMS)
1. **Go to Numbers**: Phone Numbers → Manage → Active numbers
2. **Click Your Number**: Click on the number you just bought
3. **Messaging Configuration**:
   - **Webhook URL**: For now, use: `https://your-domain.com/api/sms/webhook`
   - **HTTP Method**: POST
   - **Status Callbacks**: Enable if you want delivery reports

### Step 5: Add to Your .env File

Replace the placeholder values in your `.env` file:

```env
# Twilio SMS Configuration  
TWILIO_ACCOUNT_SID=ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
TWILIO_AUTH_TOKEN=your_actual_auth_token_here
TWILIO_PHONE_NUMBER=+911234567890

# SMS Feature Flags
SMS_GPS_ENABLED=true
SMS_PASSENGER_QUERIES_ENABLED=true
```

## 🧪 Step 6: Test Your Setup

### Test 1: Health Check
```bash
cd Backend
node -e "const {smsService} = require('./services/smsService'); smsService.healthCheck().then(console.log);"
```

### Test 2: Send Test SMS
```bash
# Create test file
echo 'const {smsService} = require("./services/smsService"); smsService.sendSMS("+917890123456", "Test from MargSetu").then(console.log).catch(console.error);' > test-sms.js

# Run test
node test-sms.js
```

### Test 3: Full SMS Test Suite
```bash
node tests/sms-test.js
```

## 🔍 Finding Your Credentials (Visual Guide)

### Dashboard Location:
```
https://console.twilio.com/
└── Project Info Box (top-left)
    ├── Account SID: AC... (always visible)
    ├── Auth Token: ••••••••••• (click "Show")
    └── My Twilio phone number: +1... (if you have one)
```

### Phone Numbers Location:
```
Console → Phone Numbers → Manage → Active numbers
└── Your purchased number with webhook configuration
```

## 🆓 Free Trial Information

### What You Get:
- **$15 USD credit** (enough for ~750 SMS in India)
- **Full API access** for testing
- **One phone number** included

### Trial Limitations:
- **Verified numbers only**: Can only send SMS to numbers you verify
- **Trial message prefix**: "Sent from your Twilio trial account - "
- **US number included**: You may want to buy a local number

### Verification Process:
1. Go to "Phone Numbers" → "Manage" → "Verified Caller IDs"
2. Add the phone numbers you want to test with
3. Twilio will call/SMS to verify each number

## 🌐 Local Testing with ngrok

For testing webhooks locally:

### Install ngrok:
1. Download from: https://ngrok.com/download
2. Extract and run: `ngrok http 3000`
3. Copy the HTTPS URL (like: https://abc123.ngrok.io)

### Configure Webhook:
1. In Twilio Console, set webhook URL to: `https://abc123.ngrok.io/api/sms/webhook`
2. Make sure your server is running on port 3000

## 💡 Pro Tips

### 1. Save Your Credentials Safely
- **Never commit** credentials to git
- **Use environment variables** only
- **Create backup** of your Account SID and Auth Token

### 2. Monitor Usage
- Check Console → Usage → SMS
- Set up billing alerts
- Monitor costs regularly

### 3. Test Numbers
Add these to verified numbers for testing:
- Your personal phone
- Team members' phones
- Test devices

## 🚨 Security Best Practices

### 1. Webhook Security
```env
# Add these for production
TWILIO_WEBHOOK_SECRET=your_webhook_secret
```

### 2. Environment Security
```bash
# Never expose .env file
echo ".env" >> .gitignore
```

### 3. Token Rotation
- Regenerate Auth Token periodically
- Use separate credentials for development/production

## 📞 Common Issues & Solutions

### Issue 1: "Account SID not found"
- **Solution**: Double-check you copied the complete Account SID
- **Check**: Should start with "AC" and be 34 characters long

### Issue 2: "Authentication failed"
- **Solution**: Verify Auth Token is correct
- **Check**: Click "Show" in Twilio console to reveal token

### Issue 3: "Phone number not verified"
- **Solution**: Add recipient number to verified caller IDs
- **Location**: Console → Phone Numbers → Manage → Verified Caller IDs

### Issue 4: "Webhook not receiving"
- **Solution**: Check ngrok is running and URL is correct
- **Test**: Visit webhook URL in browser (should see "Cannot GET")

## 🎉 Success Indicators

You'll know it's working when:
- ✅ SMS test sends successfully
- ✅ Health check shows "active" status  
- ✅ Webhook receives incoming SMS
- ✅ Address conversion works in passenger queries

## 📱 Ready to Use Features

Once configured, passengers can:
```
SMS: BUS MH12AB1234
Response: 🚌 Bus MH12AB1234
Route: Mumbai Central to Bandra
📍 Shahid Major Kaustubh Rane flyover, Zone 5, Mumbai Suburban
Speed: 45 km/h
Last Update: 2 min ago
```

---

**Need Help?** Check the Twilio documentation or run the test commands to verify your setup!