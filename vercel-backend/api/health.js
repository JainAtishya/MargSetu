// Health check endpoint for Vercel
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
      status: 'OK',
      message: 'MargSetu Vercel Backend is running',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    });
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}