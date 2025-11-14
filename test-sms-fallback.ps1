# Test SMS Fallback System
# This script tests if the SMS Gateway is receiving and forwarding messages properly

Write-Host "🧪 Testing SMS Fallback System..." -ForegroundColor Yellow
Write-Host ""

# Test 1: Check if SMS Gateway app is configured
Write-Host "📱 Step 1: SMS Gateway Configuration Test" -ForegroundColor Cyan
Write-Host "Expected SMS flow: Driver App -> SMS Gateway (7876935991) -> Backend Webhook"
Write-Host ""

# Test 2: Send a test GPS message to webhook directly to verify webhook processing
Write-Host "🌐 Step 2: Testing Webhook GPS Processing" -ForegroundColor Cyan
$testGPSMessage = "GPS:BUS001,26.912434,75.787271,0.0,0,1731567890123"
$webhookPayload = @{
    type = "sms_raw"
    sender = "+917876935991"
    message = $testGPSMessage
    timestamp = [DateTimeOffset]::Now.ToUnixTimeMilliseconds()
} | ConvertTo-Json

Write-Host "Sending test GPS message to webhook: $testGPSMessage"

try {
    $response = Invoke-RestMethod -Uri "https://vercel-backend-vert-psi.vercel.app/api/sms/webhook" -Method POST -Headers @{"Content-Type"="application/json"} -Body $webhookPayload
    Write-Host "✅ Webhook processed GPS message successfully!" -ForegroundColor Green
    Write-Host "Response: $($response | ConvertTo-Json -Depth 3)"
} catch {
    Write-Host "❌ Webhook test failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Response: $($_.Exception.Response)"
}

Write-Host ""
Write-Host "🔧 SMS Fallback Troubleshooting Steps:" -ForegroundColor Yellow
Write-Host "1. Ensure SMS Gateway app (7876935991) is installed and running"
Write-Host "2. Check if SMS Gateway has internet connection to forward messages"
Write-Host "3. Verify SMS Gateway is configured with correct webhook URL"
Write-Host "4. Test by turning off driver app internet and checking if SMS is sent"
Write-Host "5. Check SMS Gateway logs for received messages"
Write-Host ""
Write-Host "📞 To test manually:"
Write-Host "   - Turn off driver app internet/wifi"
Write-Host "   - Click 'Start Journey' in driver app"
Write-Host "   - Check if SMS is sent to 7876935991"
Write-Host "   - Check if SMS Gateway forwards it to backend"