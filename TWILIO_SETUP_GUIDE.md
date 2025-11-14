# Twilio SMS Configuration Setup Guide

## 📋 **Current Status**
- ✅ SMS system is working in **mock mode**
- ✅ No environment variables currently set
- ⏳ Need Twilio credentials for real SMS delivery

## 🔧 **Step-by-Step Twilio Setup**

### **Step 1: Create Twilio Account**
1. Go to [https://console.twilio.com](https://console.twilio.com)
2. Sign up or log in
3. Complete account verification (phone/email)

### **Step 2: Get Twilio Credentials**
In your Twilio Console Dashboard, find:

```
Account SID: ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
Auth Token: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### **Step 3: Get Twilio Phone Number**
1. In Twilio Console → **Phone Numbers** → **Manage** → **Buy a number**
2. Choose country (India +91 or US +1)
3. Select a number with **SMS capabilities**
4. Buy the number (usually $1-15/month)

### **Step 4: Set Environment Variables on Vercel**

#### **Option A: Using Vercel CLI (Recommended)**
```powershell
cd "c:\Users\DELL\Desktop\Project MS\vercel-backend"

# Set Account SID
vercel env add TWILIO_ACCOUNT_SID

# Set Auth Token  
vercel env add TWILIO_AUTH_TOKEN

# Set Phone Number
vercel env add TWILIO_PHONE_NUMBER
```

#### **Option B: Using Vercel Dashboard**
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your **vercel-backend** project
3. Go to **Settings** → **Environment Variables**
4. Add these 3 variables:

| Name | Value | Environment |
|------|-------|-------------|
| `TWILIO_ACCOUNT_SID` | `ACxxxxxxxx...` | Production |
| `TWILIO_AUTH_TOKEN` | `your_auth_token` | Production |
| `TWILIO_PHONE_NUMBER` | `+1234567890` | Production |

### **Step 5: Redeploy Project**
```powershell
cd "c:\Users\DELL\Desktop\Project MS\vercel-backend"
vercel --prod
```

## 📝 **Environment Variables Template**

```bash
# Add these to Vercel Environment Variables
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1234567890
```

## 🧪 **Testing Real SMS**

### **Test 1: Direct SMS Send**
```powershell
curl -Method POST -Uri "https://vercel-backend-vert-psi.vercel.app/api/sms/send" -Headers @{"Content-Type"="application/json"} -Body '{"to":"+919876543210","busId":"BUS001","queryType":"bus_details"}'
```

### **Test 2: Via SMS Gateway**
1. Send SMS to your SMS Gateway number: **"BUS001"**
2. Should receive bus details response

### **Test 3: Check Logs**
- Vercel logs should show: **"✅ Twilio response"** instead of **"Mock SMS sent"**

## 📱 **SMS Gateway Integration**

Your SMS Gateway app should forward messages to:
```
https://vercel-backend-vert-psi.vercel.app/api/sms/webhook
```

## 🔍 **Troubleshooting**

### **Issue: Still showing mock responses**
**Solution:** Check environment variables are set correctly:
```powershell
vercel env ls
```

### **Issue: Twilio authentication error**
**Solution:** Verify credentials in Twilio Console

### **Issue: SMS not delivered**
**Solution:** Check phone number format (must include country code: +91xxxxxxxxxx)

## 💰 **Twilio Pricing (Approximate)**
- **Phone Number:** $1-15/month (depends on country)
- **SMS in India:** ~$0.04 per SMS
- **SMS in US:** ~$0.0075 per SMS
- **Free Trial:** $15 credit when you sign up

## 🎯 **Expected Results After Setup**

### **Before (Current):**
```json
{
  "success": true,
  "message": "Mock SMS sent (Twilio not configured)",
  "isMock": true
}
```

### **After (With Twilio):**
```json
{
  "success": true, 
  "message": "SMS sent successfully",
  "twilioSid": "SM1234567890abcdef",
  "isMock": false
}
```

## 🚀 **Quick Setup Commands**

```powershell
# Navigate to project
cd "c:\Users\DELL\Desktop\Project MS\vercel-backend"

# Add environment variables (you'll be prompted for values)
vercel env add TWILIO_ACCOUNT_SID
vercel env add TWILIO_AUTH_TOKEN  
vercel env add TWILIO_PHONE_NUMBER

# Redeploy with new environment variables
vercel --prod

# Test SMS sending
curl -Method POST -Uri "https://vercel-backend-vert-psi.vercel.app/api/sms/send" -Headers @{"Content-Type"="application/json"} -Body '{"to":"+919876543210","busId":"BUS001","queryType":"bus_details"}'
```

---

**Note:** The SMS system will automatically switch from mock mode to real Twilio mode once environment variables are configured!