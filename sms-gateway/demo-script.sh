#!/bin/bash

# MargSetu SMS Gateway - Demo and Testing Script
# This script demonstrates the complete SMS gateway functionality

echo "========================================="
echo "MargSetu SMS Gateway - Demo Script"
echo "========================================="
echo ""

# Configuration
BACKEND_URL="http://10.148.173.6:5000/api/sms/webhook"
API_KEY="margsetu-gateway-key-2024"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

echo_error() {
    echo -e "${RED}✗ $1${NC}"
}

echo_warning() {
    echo -e "${YELLOW}! $1${NC}"
}

echo_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# Function to test backend connectivity
test_backend() {
    echo_info "Testing backend connectivity..."
    response=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BACKEND_URL" \
        -H "Content-Type: application/json" \
        -H "x-gateway-api-key: $API_KEY" \
        -d '{"type":"test","timestamp":'$(date +%s)'000,"message":"Connection test"}')
    
    if [ "$response" = "200" ]; then
        echo_success "Backend server is reachable and responding"
        return 0
    else
        echo_error "Backend server test failed (HTTP $response)"
        return 1
    fi
}

# Function to send test SMS via ADB
send_test_sms() {
    local message="$1"
    local description="$2"
    
    echo_info "Sending SMS: $description"
    echo "Message: $message"
    
    # Check if ADB is available
    if ! command -v adb &> /dev/null; then
        echo_warning "ADB not found. Please install Android SDK or use a real device."
        return 1
    fi
    
    # Check if emulator is running
    if ! adb devices | grep -q "emulator"; then
        echo_warning "No Android emulator detected. Please start an emulator or use a real device."
        return 1
    fi
    
    # Send SMS
    adb emu sms send +919876543210 "$message"
    echo_success "SMS sent successfully"
    sleep 2
}

# Function to test webhook directly
test_webhook() {
    local payload="$1"
    local description="$2"
    
    echo_info "Testing webhook: $description"
    
    response=$(curl -s -X POST "$BACKEND_URL" \
        -H "Content-Type: application/json" \
        -H "x-gateway-api-key: $API_KEY" \
        -d "$payload")
    
    if [ $? -eq 0 ]; then
        echo_success "Webhook test successful"
        echo "Response: $response"
    else
        echo_error "Webhook test failed"
    fi
    echo ""
}

# Main demo script
main() {
    echo "Starting SMS Gateway demonstration..."
    echo ""
    
    # Test 1: Backend connectivity
    echo "=== Test 1: Backend Connectivity ==="
    if ! test_backend; then
        echo_error "Backend is not accessible. Please check:"
        echo "  - Backend server is running on 10.148.173.6:5000"
        echo "  - Network connectivity from this device"
        echo "  - Firewall settings"
        echo ""
        read -p "Continue with other tests? (y/n): " continue_tests
        if [[ ! $continue_tests =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
    echo ""
    
    # Test 2: Driver Location SMS
    echo "=== Test 2: Driver Location SMS ==="
    send_test_sms "BUS123:26.912345,75.123456" "Driver location update"
    echo ""
    
    # Test 3: Passenger Query SMS
    echo "=== Test 3: Passenger Query SMS ==="
    send_test_sms "LOC BUS123" "Passenger location request"
    echo ""
    
    # Test 4: Multiple bus locations
    echo "=== Test 4: Multiple Bus Locations ==="
    send_test_sms "BUS456:28.123456,77.654321" "Bus 456 location"
    send_test_sms "BUS789:19.876543,72.987654" "Bus 789 location"
    echo ""
    
    # Test 5: Multiple passenger queries
    echo "=== Test 5: Multiple Passenger Queries ==="
    send_test_sms "LOC BUS456" "Query for Bus 456"
    send_test_sms "LOC BUS789" "Query for Bus 789"
    echo ""
    
    # Test 6: Invalid format SMS (should be ignored)
    echo "=== Test 6: Invalid Format SMS ==="
    send_test_sms "Hello, how are you?" "Invalid format (should be ignored)"
    send_test_sms "BUS123" "Incomplete format (should be ignored)"
    echo ""
    
    # Test 7: Direct webhook testing
    echo "=== Test 7: Direct Webhook Testing ==="
    
    # Driver location webhook
    driver_payload='{
        "type": "driver_location",
        "busId": "BUS999",
        "latitude": 25.123456,
        "longitude": 76.654321,
        "sender": "+919999999999",
        "timestamp": '$(date +%s)'000,
        "originalMessage": "BUS999:25.123456,76.654321",
        "receivedAt": '$(date +%s)'000
    }'
    test_webhook "$driver_payload" "Driver location via webhook"
    
    # Passenger query webhook
    passenger_payload='{
        "type": "passenger_query",
        "busId": "BUS999",
        "sender": "+919999999999",
        "timestamp": '$(date +%s)'000,
        "originalMessage": "LOC BUS999",
        "receivedAt": '$(date +%s)'000
    }'
    test_webhook "$passenger_payload" "Passenger query via webhook"
    
    # Test connection webhook
    test_payload='{
        "type": "test",
        "timestamp": '$(date +%s)'000,
        "message": "Demo script test"
    }'
    test_webhook "$test_payload" "Connection test via webhook"
    
    # Summary
    echo "========================================="
    echo "Demo completed!"
    echo ""
    echo_info "What to check now:"
    echo "1. Open SMS Gateway app and check logs"
    echo "2. Verify backend received webhook calls"
    echo "3. Check database for new entries"
    echo "4. Monitor app status indicator"
    echo ""
    echo_info "Expected behavior:"
    echo "✓ Valid SMS formats processed and forwarded"
    echo "✓ Invalid SMS formats ignored"
    echo "✓ Webhook endpoints responding correctly"
    echo "✓ App logs showing SMS activity"
    echo "✓ Backend logs showing incoming requests"
    echo ""
    echo "========================================="
}

# Run the demo
main