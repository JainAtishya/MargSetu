// Trip ID endpoint for driver journey management
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    if (req.method === 'GET') {
      // Get current trip ID for a driver
      const { driverId, busId } = req.query;
      
      if (!driverId && !busId) {
        return res.status(400).json({ 
          error: 'driverId or busId is required' 
        });
      }
      
      // For now, generate a mock trip ID
      // In real system, this would fetch from database
      const mockTripId = `TRIP_${Date.now()}_${driverId || busId}`;
      
      console.log('📋 Trip ID requested:', {
        driverId: driverId || 'N/A',
        busId: busId || 'N/A',
        tripId: mockTripId
      });
      
      return res.status(200).json({
        success: true,
        tripId: mockTripId,
        status: 'ACTIVE',
        startTime: new Date().toISOString(),
        message: 'Trip ID generated successfully'
      });
    }
    
    if (req.method === 'POST') {
      // Start or update a trip
      const { driverId, busId, action, tripId } = req.body;
      
      if (!driverId && !busId) {
        return res.status(400).json({ 
          error: 'driverId or busId is required' 
        });
      }
      
      const actionType = action || 'START';
      const currentTripId = tripId || `TRIP_${Date.now()}_${driverId || busId}`;
      
      console.log('📋 Trip action:', {
        action: actionType,
        driverId: driverId || 'N/A',
        busId: busId || 'N/A',
        tripId: currentTripId
      });
      
      // Handle different trip actions
      switch (actionType.toUpperCase()) {
        case 'START':
          return res.status(200).json({
            success: true,
            tripId: currentTripId,
            status: 'STARTED',
            message: 'Trip started successfully',
            startTime: new Date().toISOString()
          });
          
        case 'END':
        case 'STOP':
          return res.status(200).json({
            success: true,
            tripId: currentTripId,
            status: 'COMPLETED',
            message: 'Trip ended successfully',
            endTime: new Date().toISOString()
          });
          
        default:
          return res.status(200).json({
            success: true,
            tripId: currentTripId,
            status: 'UPDATED',
            message: 'Trip updated successfully'
          });
      }
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
    
  } catch (error) {
    console.error('Trip ID error:', error);
    return res.status(500).json({ 
      error: 'Failed to process trip request',
      details: error.message 
    });
  }
}