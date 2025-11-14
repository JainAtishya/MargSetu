// Test connection endpoint for SMS Gateway app
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-gateway-api-key, User-Agent');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    const method = req.method;
    const timestamp = new Date().toISOString();
    const userAgent = req.headers['user-agent'] || 'unknown';
    const apiKey = req.headers['x-gateway-api-key'] || 'none';
    
    console.log('🔧 Test connection request:', {
      method: method,
      timestamp: timestamp,
      userAgent: userAgent,
      hasApiKey: apiKey !== 'none'
    });
    
    if (method === 'GET') {
      return res.status(200).json({
        success: true,
        message: 'SMS Gateway connection test successful',
        server: 'MargSetu Vercel Backend',
        timestamp: timestamp,
        method: 'GET',
        endpoints: {
          webhook: '/api/sms/webhook',
          test: '/api/sms/test',
          health: '/api/health'
        }
      });
    }
    
    if (method === 'POST') {
      const body = req.body || {};
      
      return res.status(200).json({
        success: true,
        message: 'SMS Gateway POST test successful',
        server: 'MargSetu Vercel Backend', 
        timestamp: timestamp,
        method: 'POST',
        receivedData: {
          hasBody: Object.keys(body).length > 0,
          bodyKeys: Object.keys(body),
          apiKeyProvided: apiKey !== 'none'
        },
        nextStep: 'Configure SMS Gateway to use /api/sms/webhook for actual SMS forwarding'
      });
    }
    
    return res.status(405).json({ 
      error: 'Method not allowed',
      allowedMethods: ['GET', 'POST', 'OPTIONS']
    });
    
  } catch (error) {
    console.error('Test endpoint error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}