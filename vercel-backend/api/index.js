// Main API index for documentation
export default function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method === 'GET') {
    return res.status(200).json({
      name: 'MargSetu Vercel Backend API',
      version: '1.0.0',
      status: 'active',
      endpoints: {
        health: '/api/health',
        auth: {
          driverLogin: '/api/auth/driver-login'
        },
        locations: {
          update: '/api/locations/update'
        }
      },
      documentation: 'https://github.com/your-repo/margsetu-backend',
      timestamp: new Date().toISOString()
    });
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}