// Test endpoint to check environment variables
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // Check environment variables
  const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
  const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
  const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;
  
  return res.status(200).json({
    hasAccountSid: !!TWILIO_ACCOUNT_SID,
    hasAuthToken: !!TWILIO_AUTH_TOKEN,
    hasPhoneNumber: !!TWILIO_PHONE_NUMBER,
    accountSidLength: TWILIO_ACCOUNT_SID ? TWILIO_ACCOUNT_SID.length : 0,
    authTokenLength: TWILIO_AUTH_TOKEN ? TWILIO_AUTH_TOKEN.length : 0,
    phoneNumberLength: TWILIO_PHONE_NUMBER ? TWILIO_PHONE_NUMBER.length : 0,
    accountSidPrefix: TWILIO_ACCOUNT_SID ? TWILIO_ACCOUNT_SID.substring(0, 5) + '...' : 'missing',
    phoneNumber: TWILIO_PHONE_NUMBER ? TWILIO_PHONE_NUMBER : 'missing',
    timestamp: new Date().toISOString()
  });
}