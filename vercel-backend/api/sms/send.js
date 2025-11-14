// Send SMS responses via Twilio API
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { to, busId, queryType } = req.body;
    
    if (!to) {
      return res.status(400).json({ error: 'Missing recipient phone number' });
    }
    
    console.log('📤 Sending SMS response:', { to, busId, queryType });
    
    // Get bus details for the requested busId
    let responseMessage = '';
    
    if (busId) {
      // Fetch bus details from our passenger API
      const busDetails = await getBusDetailsForSMS(busId);
      
      if (busDetails) {
        responseMessage = formatBusDetailsForSMS(busDetails);
      } else {
        responseMessage = `Bus ${busId} not found. Available buses: BUS001-BUS008 on Mumbai-Pune route.`;
      }
    } else {
      responseMessage = 'Please specify a bus ID. Format: BUS001, BUS002, etc. Available: BUS001-BUS008 on Mumbai-Pune route.';
    }
    
    // Send SMS via Twilio or mock
    const twilioResponse = await sendTwilioSMS(to, responseMessage);
    
    // Also log to mock SMS gateway for visibility
    if (twilioResponse.mock) {
      try {
        await fetch(`${req.headers.host ? `https://${req.headers.host}` : 'https://vercel-backend-vert-psi.vercel.app'}/api/sms/mock`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: to,
            from: twilioResponse.from,
            body: responseMessage,
            action: 'send_passenger_response'
          })
        });
      } catch (e) {
        console.log('Note: Mock SMS logging failed, but message was processed');
      }
    }
    
    console.log('✅ SMS sent successfully:', {
      to: to,
      busId: busId,
      messageLength: responseMessage.length,
      twilioSid: twilioResponse.sid,
      isMock: !!twilioResponse.mock
    });
    
    return res.status(200).json({
      success: true,
      message: twilioResponse.mock ? 'Mock SMS sent (Twilio not configured)' : 'SMS sent successfully',
      to: to,
      busId: busId,
      twilioSid: twilioResponse.sid,
      isMock: !!twilioResponse.mock,
      mockNote: twilioResponse.mock ? 'Real SMS will be sent when Twilio credentials are configured' : undefined
    });
    
  } catch (error) {
    console.error('SMS send error:', error);
    return res.status(500).json({ 
      error: 'Failed to send SMS',
      details: error.message 
    });
  }
}

// Get bus details for SMS response
async function getBusDetailsForSMS(busId) {
  try {
    // Use our existing passenger API internally
    // Simulate the passenger API call
    const busLocations = {
      "BUS001": { lat: 19.0760, lng: 72.8777, address: "Mumbai Central Station" },
      "BUS002": { lat: 19.0400, lng: 72.9200, address: "Thane Junction" },
      "BUS003": { lat: 18.9900, lng: 73.1200, address: "Kalyan" },
      "BUS004": { lat: 18.8500, lng: 73.3000, address: "Lonavala" },
      "BUS005": { lat: 18.7500, lng: 73.4500, address: "Khandala Hills" },
      "BUS006": { lat: 18.6500, lng: 73.6000, address: "Talegaon" },
      "BUS007": { lat: 18.5800, lng: 73.7200, address: "Pimpri-Chinchwad" },
      "BUS008": { lat: 18.5204, lng: 73.8567, address: "Pune Station" }
    };
    
    const location = busLocations[busId];
    if (!location) return null;
    
    return {
      busId: busId,
      busNumber: `MH-${busId.slice(-2)}-${Math.floor(Math.random() * 9000) + 1000}`,
      route: "Mumbai - Pune",
      currentLocation: location.address,
      estimatedArrival: `${Math.floor(Math.random() * 45) + 15} minutes`,
      seatsAvailable: Math.floor(Math.random() * 30) + 5,
      totalSeats: 40,
      status: "ACTIVE"
    };
    
  } catch (error) {
    console.error('Error getting bus details:', error);
    return null;
  }
}

// Format bus details for SMS (using simple text - no emojis for better delivery)
function formatBusDetailsForSMS(bus) {
  return `BUS ${bus.busNumber} (${bus.busId})
Route: ${bus.route}
Current Location: ${bus.currentLocation}
ETA: ${bus.estimatedArrival}
Seats Available: ${bus.seatsAvailable}/${bus.totalSeats}
Status: ${bus.status}

For live tracking visit: https://your-app-link.com/bus/${bus.busId}`;
}

// Send SMS via Twilio API or mock for testing
async function sendTwilioSMS(to, message) {
  // Twilio configuration - trim to remove any whitespace/newlines
  const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID?.trim();
  const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN?.trim();
  const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER?.trim();
  
  // Check if Twilio is configured
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER ||
      TWILIO_ACCOUNT_SID === 'your_account_sid' || TWILIO_AUTH_TOKEN === 'your_auth_token') {
    
    console.log('⚠️ Twilio not configured, using mock SMS response:', {
      to: to,
      messageLength: message.length,
      message: message.substring(0, 100) + '...'
    });
    
    // Return mock successful response
    return {
      sid: `mock_${Date.now()}`,
      status: 'mock_sent',
      to: to,
      from: '+1234567890',
      body: message,
      date_created: new Date().toISOString(),
      mock: true
    };
  }
  
  // Real Twilio API call
  const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
  
  // Prepare form data for Twilio API
  const formData = new URLSearchParams();
  formData.append('To', to);
  formData.append('From', TWILIO_PHONE_NUMBER);
  formData.append('Body', message);
  
  // Basic Auth header for Twilio
  const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');
  
  console.log('📞 Calling Twilio API:', {
    to: to,
    from: TWILIO_PHONE_NUMBER,
    messageLength: message.length
  });
  
  const response = await fetch(twilioUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: formData.toString()
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Twilio API error: ${response.status} - ${errorText}`);
  }
  
  const result = await response.json();
  console.log('✅ Twilio response:', result);
  
  return result;
}