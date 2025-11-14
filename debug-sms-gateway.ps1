# SMS Gateway Troubleshooting Guide

Write-Host "🚨 SMS Gateway Debugging - Device 7876935991" -ForegroundColor Red
Write-Host ""

Write-Host "📋 CHECKLIST - SMS Gateway App (Device 7876935991):" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. ✅ SMS Gateway app INSTALLED on device 7876935991?" 
Write-Host "2. ✅ SMS Gateway app is RUNNING (check notification bar)?"
Write-Host "3. ✅ SMS Gateway app has PERMISSIONS:"
Write-Host "   - SMS read/receive permissions"
Write-Host "   - Internet access permissions"
Write-Host "   - Background activity permissions"
Write-Host "4. ✅ Battery optimization DISABLED for SMS Gateway app?"
Write-Host "5. ✅ SMS Gateway app configuration:"
Write-Host "   - Server URL: https://vercel-backend-vert-psi.vercel.app"
Write-Host "   - API Key: margsetu-gateway-key-2024"
Write-Host "6. ✅ Device 7876935991 has stable internet connection?"
Write-Host ""

Write-Host "🧪 TESTING SMS GATEWAY FUNCTIONALITY:" -ForegroundColor Cyan
Write-Host ""

# Test 1: Manual SMS Test via backend simulation
Write-Host "Test 1: Direct webhook test (simulating SMS Gateway)" -ForegroundColor Green
$testPayload = @{
    type = "sms_raw"
    sender = "+917876935991"
    message = "GPS:BUS001,26.912434,75.787271,0.0,0,$([DateTimeOffset]::Now.ToUnixTimeMilliseconds())"
    timestamp = [DateTimeOffset]::Now.ToUnixTimeMilliseconds()
} | ConvertTo-Json

Write-Host "Sending test payload: " -NoNewline
Write-Host $testPayload -ForegroundColor Gray

try {
    $response = Invoke-RestMethod -Uri "https://vercel-backend-vert-psi.vercel.app/api/sms/webhook" -Method POST -Headers @{"Content-Type"="application/json"; "x-gateway-api-key"="margsetu-gateway-key-2024"} -Body $testPayload
    Write-Host "✅ Backend webhook working!" -ForegroundColor Green
    Write-Host "Response: $($response | ConvertTo-Json)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Backend webhook failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "Test 2: Check if SMS Gateway can reach backend" -ForegroundColor Green
try {
    $connectTest = Invoke-WebRequest -Uri "https://vercel-backend-vert-psi.vercel.app/api/sms/webhook" -Method GET
    Write-Host "✅ Backend reachable (Status: $($connectTest.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend not reachable: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "📱 NEXT STEPS IF SMS GATEWAY IS NOT WORKING:" -ForegroundColor Yellow
Write-Host ""
Write-Host "OPTION 1: Rebuild and reinstall SMS Gateway app"
Write-Host "   cd 'C:\Users\DELL\Desktop\Project MS\sms-gateway\android-app'"
Write-Host "   .\gradlew clean assembleDebug"
Write-Host "   # Install APK on device 7876935991"
Write-Host ""
Write-Host "OPTION 2: Check SMS Gateway app logs"
Write-Host "   - Open SMS Gateway app on device 7876935991"
Write-Host "   - Check recent activity/logs"
Write-Host "   - Verify it shows 'Gateway Active' status"
Write-Host ""
Write-Host "OPTION 3: Test SMS Gateway manually"
Write-Host "   - Send test SMS to 7876935991: 'GPS:BUS001,26.912434,75.787271,0.0,0,1234567890'"
Write-Host "   - Check if SMS Gateway app receives and forwards it"
Write-Host "   - Check if backend logs show webhook activity"
Write-Host ""
Write-Host "OPTION 4: Alternative SMS method (bypass SMS Gateway)"
Write-Host "   - Configure driver app to send SMS directly to Twilio"
Write-Host "   - Use Twilio SMS webhook instead of SMS Gateway"