# 📱 Twilio Setup Guide for MargSetu

## Step 1: Create Twilio Account

1. **Go to Twilio website**: https://www.twilio.com
2. **Sign up for free account**: Click "Sign up" button
3. **Verify your phone number**: Twilio will send you a verification code
4. **Complete account setup**: Choose "SMS" as your primary use case

## Step 2: Get Your Credentials

After logging in to Twilio Console:

### Account SID and Auth Token
1. Go to **Twilio Console Dashboard**: https://console.twilio.com
2. In the **Project Info** section, you'll see:
   - **Account SID**: Something like `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - **Auth Token**: Click "Show" to reveal it (starts with something like `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`)

### Get a Phone Number
1. Go to **Phone Numbers** → **Manage** → **Buy a number**
2. Choose your country (India for +91 numbers)
3. Search for available numbers
4. Buy a number (Twilio trial gives you $15 free credit)
5. Your number will be something like `+1234567890`

## Step 3: Configure Webhook URL

1. Go to **Phone Numbers** → **Manage** → **Active numbers**
2. Click on your purchased phone number
3. In the **Messaging** section:
   - **Webhook URL**: `https://your-domain.com/api/sms/webhook`
   - **HTTP Method**: POST
   - For local testing: Use ngrok to expose your local server

## Step 4: Set Up ngrok for Local Testing

1. Download ngrok: https://ngrok.com/download
2. Install and run:
```bash
ngrok http 3000
```
3. Copy the HTTPS URL (like `https://abc123.ngrok.io`)
4. Set webhook URL to: `https://abc123.ngrok.io/api/sms/webhook`

## Step 5: Add Credentials to .env File

```env
# Twilio SMS Configuration
TWILIO_ACCOUNT_SID=ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890

# SMS Feature Flags
SMS_GPS_ENABLED=true
SMS_PASSENGER_QUERIES_ENABLED=true
```

## Step 6: Test Your Setup

Run this command to test:
```bash
node tests/sms-test.js
```

---

## 🆓 Free Trial Limitations

- **$15 free credit** (enough for ~1000 SMS)
- **Trial phone numbers** have "Sent from your Twilio trial account" prefix
- **Verified numbers only**: Can only send to verified phone numbers

## 💰 Production Upgrade

Once ready for production:
- **Upgrade account**: Remove trial limitations
- **Buy more credit**: Pay-as-you-go pricing
- **Remove trial messages**: Clean SMS without trial prefix

## 🔍 Finding Your Credentials

**Quick Access:**
1. Login to Twilio Console
2. Credentials are on the main dashboard
3. Account SID: Always visible
4. Auth Token: Click "Show" to reveal

**Screenshot locations:**
- Dashboard → Project Info section
- Account SID: First line
- Auth Token: Second line (click Show)
- Phone Number: Phone Numbers → Manage → Active numbers