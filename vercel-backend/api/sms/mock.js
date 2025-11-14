// Mock SMS Gateway endpoint to simulate SMS sending for testing
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method === 'GET') {
    // Get recent mock SMS messages
    return res.status(200).json({
      success: true,
      message: 'Mock SMS Gateway - Recent Messages',
      info: 'This endpoint simulates SMS sending for testing without Twilio',
      recentMessages: mockSmsStore.slice(-10) // Last 10 messages
    });
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { to, from, body, action } = req.body;
    
    console.log('📱 Mock SMS Gateway received:', { to, from, body, action });
    
    if (action === 'send_passenger_response') {
      // Simulate sending SMS response to passenger
      const mockSms = {
        id: `mock_${Date.now()}`,
        to: to,
        from: from || '+1234567890',
        body: body,
        direction: 'outbound',
        status: 'mock_sent',
        timestamp: new Date().toISOString(),
        type: 'passenger_response'
      };
      
      // Store in mock SMS storage
      mockSmsStore.push(mockSms);
      
      console.log('✅ Mock SMS sent to passenger:', {
        to: to,
        messageLength: body.length,
        preview: body.substring(0, 100) + '...'
      });
      
      return res.status(200).json({
        success: true,
        message: 'Mock SMS sent successfully',
        sms: mockSms,
        note: 'This is a mock response. Real SMS would be sent via Twilio when configured.'
      });
    }
    
    // Handle incoming SMS simulation
    if (action === 'receive_passenger_query') {
      const mockSms = {
        id: `mock_${Date.now()}`,
        to: from || '+1234567890',
        from: to,
        body: body,
        direction: 'inbound',
        status: 'received',
        timestamp: new Date().toISOString(),
        type: 'passenger_query'
      };
      
      mockSmsStore.push(mockSms);
      
      console.log('📩 Mock SMS received from passenger:', {
        from: to,
        message: body
      });
      
      return res.status(200).json({
        success: true,
        message: 'Mock SMS received',
        sms: mockSms
      });
    }
    
    return res.status(400).json({
      error: 'Invalid action',
      supportedActions: ['send_passenger_response', 'receive_passenger_query']
    });
    
  } catch (error) {
    console.error('Mock SMS Gateway error:', error);
    return res.status(500).json({ 
      error: 'Mock SMS Gateway error',
      details: error.message 
    });
  }
}

// In-memory storage for mock SMS messages (in production, use database)
let mockSmsStore = [];