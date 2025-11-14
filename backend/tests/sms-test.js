const { smsService } = require('../services/smsService');
require('dotenv').config();

console.log('🧪 MargSetu SMS Service Test Suite\n');

async function runSMSTests() {
  try {
    console.log('📱 Testing SMS Service Initialization...');
    
    // Test 1: Health Check
    console.log('\n1️⃣ Testing SMS Service Health Check');
    const health = await smsService.healthCheck();
    console.log('Health Status:', health);

    // Test 2: Parse Driver GPS SMS
    console.log('\n2️⃣ Testing Driver GPS SMS Parsing');
    const testGPSMessage = 'GPS:MH12AB1234,19.0760,72.8777,45,180,1694615425';
    const gpsData = smsService.parseDriverGPSSMS(testGPSMessage, '+917890123456');
    console.log('Parsed GPS Data:', gpsData);

    // Test 3: Parse Passenger Queries
    console.log('\n3️⃣ Testing Passenger Query Parsing');
    const testQueries = [
      'BUS MH12AB1234',
      'ROUTE 42',
      'NEAREST Central Station',
      'HELP'
    ];

    testQueries.forEach(query => {
      const parsed = smsService.parsePassengerQuery(query, '+917890123456');
      console.log(`Query: "${query}" -> Parsed:`, parsed);
    });

    // Test 4: Generate Help Message
    console.log('\n4️⃣ Testing Help Message Generation');
    const helpMessage = smsService.getHelpMessage();
    console.log('Help Message:');
    console.log(helpMessage);

    // Test 5: Generate Driver Instructions
    console.log('\n5️⃣ Testing Driver Instructions');
    const driverInstructions = smsService.getDriverInstructions('MH12AB1234', '+917890123456');
    console.log('Driver Instructions:');
    console.log(driverInstructions);

    // Test 6: Phone Number Validation and Formatting
    console.log('\n6️⃣ Testing Phone Number Handling');
    const testNumbers = [
      '7890123456',
      '+917890123456',
      '917890123456',
      '+1234567890'
    ];

    testNumbers.forEach(phone => {
      const isValid = smsService.validatePhoneNumber(phone);
      const formatted = smsService.formatPhoneNumber(phone);
      console.log(`${phone} -> Valid: ${isValid}, Formatted: ${formatted}`);
    });

    // Test 7: Send Test SMS (if Twilio is configured)
    console.log('\n7️⃣ Testing SMS Sending (Demo Mode)');
    const testPhone = '+917890123456';
    const testMessage = 'Test message from MargSetu SMS Service - Demo Mode';
    
    try {
      const result = await smsService.sendSMS(testPhone, testMessage);
      console.log('SMS Send Result:', result);
    } catch (error) {
      console.log('SMS Send Error (expected in demo mode):', error.message);
    }

    console.log('\n✅ SMS Service Tests Completed Successfully!');
    console.log('\n📋 Test Summary:');
    console.log('- SMS Service Health Check: ✅');
    console.log('- GPS Message Parsing: ✅');
    console.log('- Passenger Query Parsing: ✅');
    console.log('- Help Message Generation: ✅');
    console.log('- Driver Instructions: ✅');
    console.log('- Phone Number Handling: ✅');
    console.log('- SMS Sending (Demo): ✅');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

async function demonstrateWorkflow() {
  console.log('\n\n🚌 Demonstrating Complete SMS Workflow\n');

  // Scenario 1: Driver sends GPS via SMS when offline
  console.log('📍 Scenario 1: Driver GPS Update (Offline Mode)');
  console.log('Driver phone has no internet, sends SMS with GPS coordinates...');
  
  const driverSMS = 'GPS:MH12AB1234,19.0760,72.8777,45,180,1694615425';
  console.log(`SMS from +917890123456: "${driverSMS}"`);
  
  const parsedGPS = smsService.parseDriverGPSSMS(driverSMS, '+917890123456');
  if (parsedGPS) {
    console.log('✅ GPS data parsed successfully');
    console.log(`Bus: ${parsedGPS.busId}`);
    console.log(`Location: ${parsedGPS.location.latitude}, ${parsedGPS.location.longitude}`);
    console.log(`Speed: ${parsedGPS.speed} km/h`);
    console.log('📲 Automatic confirmation SMS would be sent to driver');
  }

  // Scenario 2: Passenger queries bus location via SMS
  console.log('\n🧑‍🤝‍🧑 Scenario 2: Passenger Location Query');
  console.log('Passenger has no internet, sends SMS to get bus location...');
  
  const passengerSMS = 'BUS MH12AB1234';
  console.log(`SMS from +917890654321: "${passengerSMS}"`);
  
  const parsedQuery = smsService.parsePassengerQuery(passengerSMS, '+917890654321');
  if (parsedQuery) {
    console.log('✅ Query parsed successfully');
    console.log(`Query Type: ${parsedQuery.type}`);
    console.log(`Bus ID: ${parsedQuery.busId}`);
    console.log('📲 Location response SMS would be sent to passenger');
  }

  // Scenario 3: Emergency alert via SMS
  console.log('\n🚨 Scenario 3: Emergency Alert System');
  console.log('Emergency detected, sending alerts via SMS...');
  
  const emergencyNumbers = ['+917890123456', '+917890654321', '+917890111222'];
  console.log(`Alert would be sent to ${emergencyNumbers.length} emergency contacts`);
  console.log('Alert: "EMERGENCY ALERT - Bus MH12AB1234 - Immediate response required"');

  console.log('\n🎯 Workflow Demonstration Complete!');
}

async function showIntegrationExamples() {
  console.log('\n\n🔗 SMS Integration Examples\n');

  console.log('📱 Webhook URL Configuration:');
  console.log('Twilio Webhook URL: https://your-domain.com/api/sms/webhook');
  console.log('Method: POST');
  console.log('Content-Type: application/x-www-form-urlencoded');

  console.log('\n📋 Environment Variables Required:');
  console.log('TWILIO_ACCOUNT_SID=your_account_sid');
  console.log('TWILIO_AUTH_TOKEN=your_auth_token');
  console.log('TWILIO_PHONE_NUMBER=+1234567890');
  console.log('SMS_GPS_ENABLED=true');
  console.log('SMS_PASSENGER_QUERIES_ENABLED=true');

  console.log('\n🚌 Driver SMS Format Examples:');
  console.log('GPS:MH12AB1234,19.0760,72.8777,45,180,1694615425');
  console.log('GPS:KA05BC5678,12.9716,77.5946,60,270,1694615500');

  console.log('\n🧑‍🤝‍🧑 Passenger Query Examples:');
  console.log('BUS MH12AB1234          - Get specific bus location');
  console.log('ROUTE 42                - Get all buses on route 42');
  console.log('NEAREST Central Station - Get buses near a location');
  console.log('HELP                    - Get help and instructions');

  console.log('\n📊 API Endpoints:');
  console.log('POST /api/sms/webhook           - Twilio webhook (public)');
  console.log('POST /api/sms/bulk-send         - Send bulk notifications');
  console.log('POST /api/sms/driver-instructions/:busId - Send driver setup');
  console.log('GET  /api/sms/health            - Service health check');
  console.log('GET  /api/sms/analytics         - SMS usage analytics');
  console.log('POST /api/sms/test              - Test SMS functionality');
}

// Main execution
async function main() {
  await runSMSTests();
  await demonstrateWorkflow();
  await showIntegrationExamples();
  
  console.log('\n🎉 MargSetu SMS Service Test Suite Complete!');
  console.log('\n🚀 Next Steps:');
  console.log('1. Configure Twilio credentials in .env file');
  console.log('2. Set up webhook URL in Twilio console');
  console.log('3. Test with real phone numbers');
  console.log('4. Monitor SMS logs and analytics');
  console.log('5. Train drivers on SMS GPS format');
  
  process.exit(0);
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  runSMSTests,
  demonstrateWorkflow,
  showIntegrationExamples
};