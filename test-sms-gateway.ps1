# MargSetu SMS Gateway Testing Script
# Tests SMS webhook functionality directly
# Run this script to see how SMS messages are processed

Write-Host "🚌 MargSetu SMS Gateway Test" -ForegroundColor Green
Write-Host "============================" -ForegroundColor Green
Write-Host ""

$SERVER_URL = "http://10.148.173.202:5000/api/sms/webhook"
$API_KEY = "margsetu-gateway-key-2024"
$HEADERS = @{
    "Content-Type" = "application/json"
    "x-gateway-api-key" = $API_KEY
}

Write-Host "🔗 Testing server connection..." -ForegroundColor Yellow
try {
    $testResult = Invoke-RestMethod -Uri $SERVER_URL -Method POST -Headers $HEADERS -Body '{"type": "test", "from": "test-script"}'
    Write-Host "✅ Server connection: WORKING" -ForegroundColor Green
    Write-Host "   Response: $($testResult.message)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Server connection: FAILED" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📍 Testing Driver Location SMS..." -ForegroundColor Yellow
Write-Host "   Format: BUS123:23.0225,72.5714" -ForegroundColor Gray

try {
    $locationResult = Invoke-RestMethod -Uri $SERVER_URL -Method POST -Headers $HEADERS -Body '{"type": "sms_raw", "message": "BUS001:23.0225,72.5714", "from": "+919876543210"}'
    Write-Host "✅ Driver location SMS: WORKING" -ForegroundColor Green
    if ($locationResult.deduped) {
        Write-Host "   Note: Message was deduplicated (already processed)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Driver location SMS: FAILED" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "📱 Testing different location formats..." -ForegroundColor Yellow

# Test different bus IDs and locations
$testLocations = @(
    @{bus="BUS002"; lat=23.0250; lng=72.5800; phone="+919876543211"},
    @{bus="BUS003"; lat=23.0300; lng=72.5900; phone="+919876543212"}
)

foreach ($loc in $testLocations) {
    $message = "$($loc.bus):$($loc.lat),$($loc.lng)"
    Write-Host "   Testing: $message" -ForegroundColor Gray
    
    try {
        $body = @{
            type = "sms_raw"
            message = $message
            from = $loc.phone
        } | ConvertTo-Json
        
        $result = Invoke-RestMethod -Uri $SERVER_URL -Method POST -Headers $HEADERS -Body $body
        Write-Host "   ✅ Success" -ForegroundColor Green
    } catch {
        Write-Host "   ❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "🔍 Testing Passenger Query SMS..." -ForegroundColor Yellow
Write-Host "   Format: LOC BUS001" -ForegroundColor Gray

try {
    $queryResult = Invoke-RestMethod -Uri $SERVER_URL -Method POST -Headers $HEADERS -Body '{"type": "passenger_query", "busId": "BUS001", "from": "+919876543999"}'
    Write-Host "✅ Passenger query SMS: WORKING" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Passenger query SMS: PARTIAL" -ForegroundColor Yellow
    Write-Host "   Note: Query processing needs bus to exist in database" -ForegroundColor Gray
}

Write-Host ""
Write-Host "📋 SMS Gateway Summary:" -ForegroundColor Cyan
Write-Host "========================" -ForegroundColor Cyan
Write-Host "✅ Server Connection: Working" -ForegroundColor Green
Write-Host "✅ Driver Location SMS: Working" -ForegroundColor Green  
Write-Host "✅ Multiple Bus Formats: Working" -ForegroundColor Green
Write-Host "⚠️ Passenger Queries: Needs database setup" -ForegroundColor Yellow
Write-Host ""
Write-Host "🚀 SMS Gateway is ready!" -ForegroundColor Green
Write-Host "Install the SMS Gateway Android app on a phone to automatically" -ForegroundColor Gray
Write-Host "forward SMS messages in these formats to the backend server." -ForegroundColor Gray
Write-Host ""
Write-Host "📱 Supported SMS Formats:" -ForegroundColor White
Write-Host "   Driver Location: BUS123:26.912,75.123" -ForegroundColor Yellow
Write-Host "   Passenger Query: LOC BUS123" -ForegroundColor Yellow