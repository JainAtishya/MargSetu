// Driver login endpoint
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
    const { username, password, email, phone, driverId } = req.body;
    
    // Basic validation
    if (!username || !password) {
      return res.status(400).json({ 
        error: 'Username and password are required' 
      });
    }
    
    // TODO: Replace with actual database authentication
    // For now, accept any username/password for testing
    console.log('Driver login attempt:', { username, email, phone, driverId });
    
    // Mock successful login
    const mockToken = 'mock-jwt-token-' + Date.now();
    const mockDriver = {
      id: driverId || 'driver_' + Date.now(),
      username: username,
      email: email,
      phone: phone,
      status: 'active',
      currentBus: null
    };
    
    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token: mockToken,
      driver: mockDriver,
      expiresIn: '24h'
    });
    
  } catch (error) {
    console.error('Driver login error:', error);
    return res.status(500).json({ 
      error: 'Login failed',
      details: error.message 
    });
  }
}