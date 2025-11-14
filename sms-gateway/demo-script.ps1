# MargSetu SMS Gateway - PowerShell Demo Script
# This script demonstrates the SMS gateway functionality on Windows PowerShell

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "MargSetu SMS Gateway - Demo Script" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$BACKEND_URL = "http://10.148.173.6:5000/api/sms/webhook"
$API_KEY = "margsetu-gateway-key-2024"

# Helper functions
function Write-Success {
    param($Message)
    Write-Host "✓ $Message" -ForegroundColor Green
}

function Write-Error {
    param($Message)
    Write-Host "✗ $Message" -ForegroundColor Red
}

function Write-Warning {
    param($Message)
    Write-Host "! $Message" -ForegroundColor Yellow
}

function Write-Info {
    param($Message)
    Write-Host "ℹ $Message" -ForegroundColor Blue
}

# Function to test backend connectivity
function Test-Backend {
    Write-Info "Testing backend connectivity..."
    
    try {
        $headers = @{
            'Content-Type' = 'application/json'
            'x-gateway-api-key' = $API_KEY
        }
        
        $body = @{
            type = "test"
            timestamp = [DateTimeOffset]::Now.ToUnixTimeMilliseconds()
            message = "PowerShell connection test"
        } | ConvertTo-Json
        
        $response = Invoke-RestMethod -Uri $BACKEND_URL -Method Post -Headers $headers -Body $body -TimeoutSec 10
        Write-Success "Backend server is reachable and responding"
        Write-Host "Response: $response" -ForegroundColor Gray
        return $true
    }
    catch {
        Write-Error "Backend server test failed: $($_.Exception.Message)"
        return $false
    }
}

# Function to send SMS via ADB
function Send-TestSMS {
    param($Message, $Description)
    
    Write-Info "Sending SMS: $Description"
    Write-Host "Message: $Message" -ForegroundColor Gray
    
    try {
        $adbCheck = Get-Command adb -ErrorAction SilentlyContinue
        if (-not $adbCheck) {
            Write-Warning "ADB not found. Please install Android SDK Platform Tools."
            return $false
        }
        
        # Check for connected devices
        $devices = & adb devices
        if (-not ($devices -match "device$")) {
            Write-Warning "No Android device/emulator detected. Please start an emulator or connect a device."
            return $false
        }
        
        # Send SMS
        & adb emu sms send "+919876543210" "$Message"
        Write-Success "SMS sent successfully"
        Start-Sleep -Seconds 2
        return $true
    }
    catch {
        Write-Error "Failed to send SMS: $($_.Exception.Message)"
        return $false
    }
}

# Function to test webhook directly
function Test-Webhook {
    param($Payload, $Description)
    
    Write-Info "Testing webhook: $Description"
    
    try {
        $headers = @{
            'Content-Type' = 'application/json'
            'x-gateway-api-key' = $API_KEY
        }
        
        $response = Invoke-RestMethod -Uri $BACKEND_URL -Method Post -Headers $headers -Body ($Payload | ConvertTo-Json -Depth 10) -TimeoutSec 10
        Write-Success "Webhook test successful"
        Write-Host "Response: $response" -ForegroundColor Gray
    }
    catch {
        Write-Error "Webhook test failed: $($_.Exception.Message)"
    }
    Write-Host ""
}

# Main demo function
function Start-Demo {
    Write-Host "Starting SMS Gateway demonstration..." -ForegroundColor Cyan
    Write-Host ""
    
    # Test 1: Backend connectivity
    Write-Host "=== Test 1: Backend Connectivity ===" -ForegroundColor Yellow
    $backendOk = Test-Backend
    if (-not $backendOk) {
        Write-Error "Backend is not accessible. Please check:"
        Write-Host "  - Backend server is running on 10.148.173.6:5000" -ForegroundColor Gray
        Write-Host "  - Network connectivity from this device" -ForegroundColor Gray
        Write-Host "  - Firewall settings" -ForegroundColor Gray
        Write-Host ""
        $continue = Read-Host "Continue with other tests? (y/n)"
        if ($continue -notmatch "^[Yy]$") {
            return
        }
    }
    Write-Host ""
    
    # Test 2: Driver Location SMS
    Write-Host "=== Test 2: Driver Location SMS ===" -ForegroundColor Yellow
    Send-TestSMS "BUS123:26.912345,75.123456" "Driver location update"
    Write-Host ""
    
    # Test 3: Passenger Query SMS
    Write-Host "=== Test 3: Passenger Query SMS ===" -ForegroundColor Yellow
    Send-TestSMS "LOC BUS123" "Passenger location request"
    Write-Host ""
    
    # Test 4: Multiple bus locations
    Write-Host "=== Test 4: Multiple Bus Locations ===" -ForegroundColor Yellow
    Send-TestSMS "BUS456:28.123456,77.654321" "Bus 456 location"
    Send-TestSMS "BUS789:19.876543,72.987654" "Bus 789 location"
    Write-Host ""
    
    # Test 5: Multiple passenger queries
    Write-Host "=== Test 5: Multiple Passenger Queries ===" -ForegroundColor Yellow
    Send-TestSMS "LOC BUS456" "Query for Bus 456"
    Send-TestSMS "LOC BUS789" "Query for Bus 789"
    Write-Host ""
    
    # Test 6: Invalid format SMS (should be ignored)
    Write-Host "=== Test 6: Invalid Format SMS ===" -ForegroundColor Yellow
    Send-TestSMS "Hello, how are you?" "Invalid format (should be ignored)"
    Send-TestSMS "BUS123" "Incomplete format (should be ignored)"
    Write-Host ""
    
    # Test 7: Direct webhook testing
    Write-Host "=== Test 7: Direct Webhook Testing ===" -ForegroundColor Yellow
    
    # Driver location webhook
    $driverPayload = @{
        type = "driver_location"
        busId = "BUS999"
        latitude = 25.123456
        longitude = 76.654321
        sender = "+919999999999"
        timestamp = [DateTimeOffset]::Now.ToUnixTimeMilliseconds()
        originalMessage = "BUS999:25.123456,76.654321"
        receivedAt = [DateTimeOffset]::Now.ToUnixTimeMilliseconds()
    }
    Test-Webhook $driverPayload "Driver location via webhook"
    
    # Passenger query webhook
    $passengerPayload = @{
        type = "passenger_query"
        busId = "BUS999"
        sender = "+919999999999"
        timestamp = [DateTimeOffset]::Now.ToUnixTimeMilliseconds()
        originalMessage = "LOC BUS999"
        receivedAt = [DateTimeOffset]::Now.ToUnixTimeMilliseconds()
    }
    Test-Webhook $passengerPayload "Passenger query via webhook"
    
    # Test connection webhook
    $testPayload = @{
        type = "test"
        timestamp = [DateTimeOffset]::Now.ToUnixTimeMilliseconds()
        message = "PowerShell demo script test"
    }
    Test-Webhook $testPayload "Connection test via webhook"
    
    # Summary
    Write-Host "=========================================" -ForegroundColor Cyan
    Write-Host "Demo completed!" -ForegroundColor Green
    Write-Host ""
    Write-Info "What to check now:"
    Write-Host "1. Open SMS Gateway app and check logs" -ForegroundColor Gray
    Write-Host "2. Verify backend received webhook calls" -ForegroundColor Gray
    Write-Host "3. Check database for new entries" -ForegroundColor Gray
    Write-Host "4. Monitor app status indicator" -ForegroundColor Gray
    Write-Host ""
    Write-Info "Expected behavior:"
    Write-Host "✓ Valid SMS formats processed and forwarded" -ForegroundColor Gray
    Write-Host "✓ Invalid SMS formats ignored" -ForegroundColor Gray
    Write-Host "✓ Webhook endpoints responding correctly" -ForegroundColor Gray
    Write-Host "✓ App logs showing SMS activity" -ForegroundColor Gray
    Write-Host "✓ Backend logs showing incoming requests" -ForegroundColor Gray
    Write-Host ""
    Write-Host "=========================================" -ForegroundColor Cyan
}

# Run the demo
Start-Demo

# Keep window open
Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")