// Location update endpoint for GPS tracking
const rateLimit = new Map();

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
    // Basic rate limiting (6 requests per minute per driver)
    const driverId = req.body.driverId || req.body.driver_id;
    if (driverId && !checkRateLimit(driverId)) {
      return res.status(429).json({ 
        error: 'Too many location updates. Wait 1 minute.',
        retryAfter: 60 
      });
    }
    
    // Handle both encrypted and plain location data
    let locationData;
    
    // Check for encrypted GPS data from Android app
    if (req.body.encryptedGPS) {
      console.log('📱 Received encrypted GPS data from Android app');
      
      try {
        // Import GPS encryption utility
        const gpsEncryption = await import('../../utils/gpsEncryption.js');
        
        // Decrypt the GPS data
        const decryptedGPS = gpsEncryption.default.decryptGPS(req.body.encryptedGPS);
        
        if (decryptedGPS) {
          console.log('🔓 Successfully decrypted GPS data for', decryptedGPS.busId);
          locationData = {
            latitude: decryptedGPS.latitude,
            longitude: decryptedGPS.longitude,
            driverId: driverId,
            busId: decryptedGPS.busId || req.body.busId || req.body.bus_id,
            timestamp: decryptedGPS.timestamp || Date.now(),
            accuracy: req.body.accuracy || 5.0,
            speed: decryptedGPS.speed || req.body.speed || 0,
            bearing: req.body.bearing || 0,
            source: decryptedGPS.source || 'DRIVER_APP_HTTP',
            encrypted: true
          };
        } else {
          console.error('❌ Failed to decrypt GPS data');
          return res.status(400).json({ error: 'Failed to decrypt GPS data' });
        }
      } catch (error) {
        console.error('❌ GPS decryption error:', error);
        return res.status(400).json({ error: 'GPS decryption failed', details: error.message });
      }
    } else if (req.body.encryptedData) {
      // Legacy encrypted data field
      console.log('Received legacy encrypted location data (decryption not implemented yet)');
      return res.status(400).json({ error: 'Legacy encryption not supported' });
    } else {
      // Handle plain location data
      locationData = {
        latitude: req.body.latitude || req.body.lat,
        longitude: req.body.longitude || req.body.lng,
        driverId: driverId,
        busId: req.body.busId || req.body.bus_id,
        timestamp: req.body.timestamp || Date.now(),
        accuracy: req.body.accuracy || 5.0,
        speed: req.body.speed || 0,
        bearing: req.body.bearing || 0,
        source: 'DRIVER_APP_HTTP',
        encrypted: false
      };
    }
    
    // Validate location data
    if (!isValidLocation(locationData)) {
      return res.status(400).json({ error: 'Invalid location data' });
    }
    
    // Log the location update (replace with database save later)
    console.log('📍 Location Update:', {
      driverId: locationData.driverId,
      busId: locationData.busId,
      lat: locationData.latitude,
      lng: locationData.longitude,
      encrypted: locationData.encrypted || false,
      source: locationData.source || 'unknown',
      time: new Date(locationData.timestamp).toISOString()
    });
    
    // TODO: Save to MongoDB Atlas
    // await saveLocationToDatabase(locationData);
    
    return res.status(200).json({
      success: true,
      message: locationData.encrypted ? 'Encrypted location updated successfully' : 'Location updated successfully',
      data: {
        driverId: locationData.driverId,
        busId: locationData.busId,
        timestamp: locationData.timestamp,
        encrypted: locationData.encrypted || false,
        source: locationData.source
      }
    });
    
  } catch (error) {
    console.error('Location update error:', error);
    return res.status(500).json({ 
      error: 'Failed to process location update',
      details: error.message 
    });
  }
}

// Simple rate limiting function
function checkRateLimit(driverId) {
  const now = Date.now();
  const key = `location_${driverId}`;
  const requests = rateLimit.get(key) || [];
  
  // Remove requests older than 1 minute
  const recentRequests = requests.filter(time => now - time < 60000);
  
  // Allow max 6 requests per minute
  if (recentRequests.length >= 6) {
    return false;
  }
  
  recentRequests.push(now);
  rateLimit.set(key, recentRequests);
  return true;
}

// Validate location data
function isValidLocation(data) {
  if (!data) return false;
  
  // Convert string numbers to actual numbers if needed
  const lat = typeof data.latitude === 'string' ? parseFloat(data.latitude) : data.latitude;
  const lng = typeof data.longitude === 'string' ? parseFloat(data.longitude) : data.longitude;
  
  // Update the data object with converted values
  if (typeof data.latitude === 'string') data.latitude = lat;
  if (typeof data.longitude === 'string') data.longitude = lng;
  
  // For encrypted data, coordinates should be valid GPS coordinates
  // For non-encrypted data, allow dummy coordinates (0.0, 0.0) if encryptedGPS was provided
  const validCoordinates = lat !== undefined && 
                          lng !== undefined && 
                          !isNaN(lat) && 
                          !isNaN(lng) &&
                          Math.abs(lat) <= 90 && 
                          Math.abs(lng) <= 180;
  
  // Must have either driverId or busId
  const hasIdentifier = data.driverId || data.busId;
  
  // If this is encrypted data, coordinates must be real (not 0,0)
  if (data.encrypted && (lat === 0.0 && lng === 0.0)) {
    console.log('⚠️ Encrypted data validation: coordinates should not be 0,0');
  }
  
  return validCoordinates && hasIdentifier;
}