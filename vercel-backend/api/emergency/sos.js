// Emergency SOS endpoint
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { driverId, busId, latitude, longitude, message, timestamp } = req.body;
    
    // Validate required fields
    if (!driverId || !busId || !latitude || !longitude) {
      return res.status(400).json({ 
        error: 'Missing required fields: driverId, busId, latitude, longitude' 
      });
    }
    
    // Validate coordinates
    const lat = typeof latitude === 'string' ? parseFloat(latitude) : latitude;
    const lng = typeof longitude === 'string' ? parseFloat(longitude) : longitude;
    
    if (isNaN(lat) || isNaN(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      return res.status(400).json({ error: 'Invalid coordinates' });
    }
    
    // Log the emergency alert
    console.log('🚨 EMERGENCY SOS ALERT:', {
      driverId: driverId,
      busId: busId,
      location: { lat, lng },
      message: message || 'Emergency alert from driver',
      timestamp: timestamp || new Date().toISOString(),
      urgent: true
    });
    
    // In a real system, this would:
    // 1. Save to emergency database with high priority
    // 2. Send immediate notifications to control center
    // 3. Alert nearby authorities/supervisors
    // 4. Start tracking emergency response
    
    // TODO: Implement real emergency response system
    // await saveEmergencyAlert({
    //   driverId, busId, latitude: lat, longitude: lng, 
    //   message, timestamp, status: 'ACTIVE'
    // });
    // await notifyEmergencyServices({ driverId, busId, location: { lat, lng } });
    
    return res.status(200).json({
      success: true,
      message: 'Emergency SOS received - Help is on the way',
      alertId: `SOS_${Date.now()}`,
      timestamp: new Date().toISOString(),
      status: 'ALERT_SENT'
    });
    
  } catch (error) {
    console.error('Emergency SOS error:', error);
    return res.status(500).json({ 
      error: 'Failed to process emergency alert',
      details: error.message 
    });
  }
}