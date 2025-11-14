# Twilio SMS Integration Setup

## 🔧 **Twilio Configuration Required**

To enable SMS responses for passenger queries, you need to configure Twilio credentials:

### **Step 1: Get Twilio Credentials**
1. Sign up at [Twilio Console](https://console.twilio.com)
2. Get your **Account SID** and **Auth Token**
3. Purchase a **Twilio phone number**

### **Step 2: Set Environment Variables on Vercel**
```bash
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
```

### **Step 3: Add to Vercel Dashboard**
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add the three variables above
3. Redeploy the project

## 📱 **How SMS Responses Work**

### **Passenger Query Flow:**
1. **Passenger sends SMS:** "BUS001" or "Where is BUS001?"
2. **SMS Gateway forwards** to backend webhook
3. **Backend detects bus query** in message
4. **Backend calls Twilio API** to send response
5. **Passenger receives SMS** with bus details

### **SMS Response Format:**
```
🚌 MH-01-5678 (BUS001)
📍 Route: Mumbai - Pune
📍 Current: Mumbai Central Station
⏱️ ETA: 25 minutes
💺 Seats: 15/40 available
✅ Status: ACTIVE

For live tracking, visit: https://your-app-link.com/bus/BUS001
```

## 🧪 **Testing SMS Responses**

### **Test Endpoint:**
```
POST https://vercel-backend-vert-psi.vercel.app/api/sms/send
{
  "to": "+919876543210",
  "busId": "BUS001",
  "queryType": "bus_details"
}
```

### **Query Detection:**
- **"BUS001"** → Responds with BUS001 details
- **"Where is BUS2?"** → Responds with BUS002 details  
- **"bus status 003"** → Responds with BUS003 details
- **"GPS:BUS001,19.076..."** → Ignored (driver location)

## ⚡ **Current Status**

✅ **SMS Webhook:** Ready to receive passenger queries
✅ **Query Detection:** Detects BUS001-BUS008 requests
✅ **Response Formatting:** Bus details formatted for SMS
⏳ **Twilio Integration:** Needs credentials configuration
⏳ **Environment Variables:** Need to be set on Vercel

## 🚀 **Next Steps**

1. **Configure Twilio credentials** on Vercel
2. **Test SMS sending** with the test endpoint
3. **Send SMS to your SMS Gateway number** with "BUS001"
4. **Check if you receive** bus details response

---

**Note:** Without Twilio credentials, the SMS responses won't be sent. The webhook will log the queries but won't send replies.