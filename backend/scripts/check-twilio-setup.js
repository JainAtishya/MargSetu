const { smsService } = require('../services/smsService');
require('dotenv').config();

console.log('🔧 Twilio Configuration Checker\n');

async function checkTwilioSetup() {
  console.log('📋 Checking Environment Variables...');
  
  // Check if credentials are set
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const phoneNumber = process.env.TWILIO_PHONE_NUMBER;
  
  console.log(`Account SID: ${accountSid ? '✅ Set' : '❌ Not set'}`);
  console.log(`Auth Token: ${authToken ? '✅ Set' : '❌ Not set'}`);
  console.log(`Phone Number: ${phoneNumber ? '✅ Set' : '❌ Not set'}`);
  
  if (!accountSid || !authToken || !phoneNumber) {
    console.log('\n❌ Twilio credentials not configured!');
    console.log('\n📝 To configure:');
    console.log('1. Get credentials from https://console.twilio.com');
    console.log('2. Add to .env file:');
    console.log('   TWILIO_ACCOUNT_SID=AC...');
    console.log('   TWILIO_AUTH_TOKEN=...');
    console.log('   TWILIO_PHONE_NUMBER=+1234567890');
    console.log('\n📖 See docs/TWILIO_CREDENTIALS_GUIDE.md for detailed instructions');
    return false;
  }
  
  console.log('\n✅ All credentials configured!');
  return true;
}

async function testTwilioConnection() {
  console.log('\n🔌 Testing Twilio Connection...');
  
  try {
    const health = await smsService.healthCheck();
    
    if (health.status === 'active') {
      console.log('✅ Twilio connection successful!');
      console.log(`Account: ${health.account}`);
      console.log(`Phone: ${health.twilioNumber}`);
      return true;
    } else {
      console.log('❌ Twilio connection failed:');
      console.log(health.message);
      return false;
    }
  } catch (error) {
    console.log('❌ Error testing connection:', error.message);
    return false;
  }
}

async function testSMSParsing() {
  console.log('\n📱 Testing SMS Message Parsing...');
  
  // Test GPS parsing
  const gpsMessage = 'GPS:MH12AB1234,19.0760,72.8777,45,180,1694615425';
  const gpsData = smsService.parseDriverGPSSMS(gpsMessage, '+917890123456');
  
  if (gpsData) {
    console.log('✅ GPS message parsing works');
    console.log(`  Bus ID: ${gpsData.busId}`);
    console.log(`  Location: ${gpsData.location.latitude}, ${gpsData.location.longitude}`);
  } else {
    console.log('❌ GPS message parsing failed');
  }
  
  // Test passenger query parsing
  const queryMessage = 'BUS MH12AB1234';
  const queryData = smsService.parsePassengerQuery(queryMessage, '+917890654321');
  
  if (queryData) {
    console.log('✅ Passenger query parsing works');
    console.log(`  Type: ${queryData.type}`);
    console.log(`  Bus ID: ${queryData.busId}`);
  } else {
    console.log('❌ Passenger query parsing failed');
  }
}

async function showSampleMessages() {
  console.log('\n📋 Sample SMS Messages for Testing:\n');
  
  console.log('🚌 Driver GPS Messages (send to your Twilio number):');
  console.log('GPS:MH12AB1234,19.0760,72.8777,45,180,1694615425');
  console.log('GPS:KA05BC5678,12.9716,77.5946,60,270,1694615500');
  
  console.log('\n🧑‍🤝‍🧑 Passenger Query Messages:');
  console.log('BUS MH12AB1234          - Get specific bus location');
  console.log('ROUTE 42                - Get buses on route 42');
  console.log('NEAREST Central Station - Get nearby buses');
  console.log('HELP                    - Get help and instructions');
  
  console.log('\n📱 To test:');
  console.log('1. Send any of the above messages to your Twilio phone number');
  console.log('2. Check your server logs for webhook activity');
  console.log('3. You should receive an automatic response');
}

async function suggestNextSteps() {
  console.log('\n🚀 Next Steps:\n');
  
  console.log('1. 📝 Configure Webhook URL in Twilio Console:');
  console.log('   - Go to Phone Numbers → Manage → Active numbers');
  console.log('   - Click your phone number');
  console.log('   - Set webhook URL to: https://your-domain.com/api/sms/webhook');
  console.log('   - For local testing, use ngrok: https://abc123.ngrok.io/api/sms/webhook');
  
  console.log('\n2. 🧪 Test with Real SMS:');
  console.log('   - Start your server: node app.js');
  console.log('   - Send SMS to your Twilio number');
  console.log('   - Check console for webhook activity');
  
  console.log('\n3. 📊 Monitor Usage:');
  console.log('   - Check Twilio Console for SMS logs');
  console.log('   - Monitor API usage and costs');
  console.log('   - Use /api/sms/analytics endpoint for insights');
  
  console.log('\n4. 🔧 Production Setup:');
  console.log('   - Remove trial account limitations');
  console.log('   - Set up proper domain with HTTPS');
  console.log('   - Configure webhook authentication');
  console.log('   - Set up monitoring and alerts');
}

// Main execution
async function main() {
  console.log('Starting Twilio configuration check...\n');
  
  const credentialsOk = await checkTwilioSetup();
  
  if (credentialsOk) {
    const connectionOk = await testTwilioConnection();
    
    if (connectionOk) {
      console.log('\n🎉 Twilio is fully configured and working!');
    }
  }
  
  await testSMSParsing();
  await showSampleMessages();
  await suggestNextSteps();
  
  console.log('\n✅ Configuration check complete!');
  console.log('\n📖 For detailed setup instructions, see: docs/TWILIO_CREDENTIALS_GUIDE.md');
}

main().catch(console.error);