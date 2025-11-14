# SMS Gateway Connection Troubleshooting Guide

## Connection Test Failed - Troubleshooting Steps

### ✅ **Backend Status Confirmed**
The Vercel backend is working correctly:
- **Main URL:** `https://vercel-backend-vert-psi.vercel.app`
- **Test Endpoint:** `/api/sms/test` - ✅ Working (200 OK)
- **Webhook Endpoint:** `/api/sms/webhook` - ✅ Working (200 OK)
- **All Endpoints:** Health, Auth, Location, Trip-ID, Emergency, SMS - ✅ All Working

### 🔧 **SMS Gateway App Configuration**

#### Step 1: Verify Settings in SMS Gateway App
```
Server URL: https://vercel-backend-vert-psi.vercel.app
API Key: margsetu-gateway-2025 (or any string)
Gateway Enabled: ✅ Yes
```

#### Step 2: Test Connection Manually
**Method A - Simple Test:**
1. In SMS Gateway app, click "Test Connection"
2. Should connect to: `https://vercel-backend-vert-psi.vercel.app/api/sms/test`
3. Expected response: "SMS Gateway connection test successful"

**Method B - Webhook Test:**
1. Configure webhook URL: `https://vercel-backend-vert-psi.vercel.app/api/sms/webhook`
2. Send test POST request
3. Expected response: Should process SMS data

### 🚫 **Common Connection Issues & Solutions**

#### Issue 1: Network/Internet Problems
**Symptoms:** Connection timeout, no response
**Solutions:**
- ✅ Check phone has internet connection (WiFi or mobile data)
- ✅ Test by opening `https://vercel-backend-vert-psi.vercel.app/api/health` in phone browser
- ✅ Should show: `{"status":"OK","message":"MargSetu Vercel Backend is running"}`

#### Issue 2: App Permissions
**Symptoms:** Connection blocked, security errors
**Solutions:**
- ✅ Grant SMS Gateway app internet permission
- ✅ Allow network access in phone settings
- ✅ Disable any VPN or firewall blocking the connection

#### Issue 3: HTTPS Certificate Issues
**Symptoms:** SSL/TLS errors, certificate warnings
**Solutions:**
- ✅ Ensure phone date/time is correct
- ✅ Use the EXACT URL: `https://vercel-backend-vert-psi.vercel.app`
- ✅ No trailing slash, no extra characters

#### Issue 4: App Configuration Errors
**Symptoms:** 400/401/404 errors, invalid responses
**Solutions:**
- ✅ Server URL must start with `https://`
- ✅ No spaces or extra characters in URL
- ✅ API Key can be any non-empty string
- ✅ Gateway must be enabled in settings

### 🧪 **Manual Testing Commands**

#### Test 1: Basic Connectivity (Use phone browser)
```
URL: https://vercel-backend-vert-psi.vercel.app/api/health
Expected: {"status":"OK","message":"MargSetu Vercel Backend is running"}
```

#### Test 2: SMS Test Endpoint (Use SMS Gateway app or phone browser)
```
URL: https://vercel-backend-vert-psi.vercel.app/api/sms/test  
Expected: {"success":true,"message":"SMS Gateway connection test successful"}
```

#### Test 3: Webhook Endpoint (Use SMS Gateway app internal test)
```
URL: https://vercel-backend-vert-psi.vercel.app/api/sms/webhook
Method: POST
Body: {"type":"test","message":"connection test"}
Expected: Should process and log the test message
```

### 📱 **SMS Gateway App Debug Steps**

#### Step 1: Check App Logs
Look for these log messages in SMS Gateway app:
- ✅ `"Gateway service started"`
- ✅ `"Configuration valid"`
- ❌ `"Failed to connect"` - Network issue
- ❌ `"Invalid response"` - Configuration issue

#### Step 2: Check Network Logs
In SMS Gateway app network logs:
- ✅ `"Connecting to: https://vercel-backend-vert-psi.vercel.app"`
- ✅ `"Response: 200 OK"`
- ❌ `"Timeout"` - Internet connection issue
- ❌ `"404 Not Found"` - URL configuration issue

#### Step 3: Test with Different Networks
- ✅ Try on WiFi network
- ✅ Try on mobile data
- ✅ Try on different WiFi network
- ✅ If one works, the issue is network-specific

### 🔄 **Recovery Steps**

#### Quick Fix Checklist:
1. ✅ **Clear SMS Gateway app cache/data**
2. ✅ **Restart SMS Gateway app**
3. ✅ **Re-enter server URL exactly:** `https://vercel-backend-vert-psi.vercel.app`
4. ✅ **Set API key:** `margsetu-gateway-2025`  
5. ✅ **Enable gateway service**
6. ✅ **Grant all required permissions**
7. ✅ **Test connection**

#### If Still Failing:
1. ✅ **Test URL in phone browser first**
2. ✅ **Check phone date/time settings**
3. ✅ **Disable VPN if active**
4. ✅ **Try different network connection**
5. ✅ **Check phone firewall/security apps**

### 📊 **Expected Working Flow**

#### When Connection Works:
```
1. SMS Gateway app → Connects to Vercel backend ✅
2. Test endpoint → Returns success message ✅  
3. Webhook ready → Can receive SMS forwards ✅
4. Driver SMS → Gets forwarded to backend ✅
5. Backend logs → Shows "SMS webhook received" ✅
```

#### Success Indicators:
- ✅ Test connection shows green/success
- ✅ App logs show "Connected successfully"
- ✅ Backend logs show test requests
- ✅ No timeout or error messages

---
**Troubleshooting Date:** November 14, 2025  
**Backend Status:** All endpoints working ✅  
**Next Step:** Test connection with exact URL above ⬆️