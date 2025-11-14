// SMS webhook endpoint to receive forwarded SMS from SMS Gateway app
import gpsEncryption from '../../utils/gpsEncryption.js';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-gateway-api-key, User-Agent');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Basic API key validation (optional)
    const apiKey = req.headers['x-gateway-api-key'];
    if (!apiKey) {
      console.log('⚠️ SMS webhook request without API key');
    }
    
    const { type, busId, latitude, longitude, sender, timestamp, originalMessage, message } = req.body;
    
    console.log('📱 SMS webhook received:', {
      type: type,
      busId: busId || 'N/A',
      location: latitude && longitude ? `${latitude},${longitude}` : 'N/A',
      sender: sender || 'Unknown',
      message: originalMessage || message || 'No message'
    });
    
    // Handle different SMS types
    switch (type) {
      case 'driver_location':
        if (!busId || !latitude || !longitude) {
          console.log('❌ Invalid driver location data:', req.body);
          return res.status(400).json({ error: 'Missing required location data' });
        }
        
        // Log the driver location from SMS - NO SMS SENDING!
        console.log('🚌 Driver Location via SMS (NO SMS RESPONSE):', {
          busId: busId,
          coordinates: `${latitude}, ${longitude}`,
          sender: sender,
          originalSMS: originalMessage,
          timestamp: new Date(timestamp).toISOString(),
          note: 'Driver location updates do NOT trigger SMS responses'
        });
        
        // TODO: Save to database
        // await saveLocationFromSMS({
        //   busId, latitude, longitude, sender, timestamp, source: 'SMS'
        // });
        
        return res.status(200).json({
          success: true,
          message: 'Driver location received via SMS - no SMS response sent',
          busId: busId,
          processed: true
        });
        
      case 'passenger_query':
        console.log('🔍 Passenger Query via SMS:', {
          busId: busId,
          sender: sender,
          originalSMS: originalMessage
        });
        
        // Process passenger query and send response SMS
        try {
          const smsResponse = await fetch(`${req.headers.host ? `https://${req.headers.host}` : 'https://vercel-backend-vert-psi.vercel.app'}/api/sms/send`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              to: sender,
              busId: busId,
              queryType: 'bus_details'
            })
          });
          
          if (smsResponse.ok) {
            console.log('✅ SMS response sent to passenger');
          } else {
            console.error('❌ Failed to send SMS response:', await smsResponse.text());
          }
        } catch (error) {
          console.error('❌ Error sending SMS response:', error);
        }
        
        return res.status(200).json({
          success: true,
          message: 'Passenger query processed and SMS response sent',
          busId: busId,
          processed: true
        });
        
      case 'sms_raw':
        // Minimal logging to avoid noisy output
        console.log('📩 Raw SMS received');
        
        // Try to parse as encrypted or plain GPS format
        const gpsData = gpsEncryption.parseEncryptedSMSMessage(message);
        if (gpsData) {
          // Compact success log
          console.log(`🚌 GPS via SMS: ${gpsData.busId} @ ${gpsData.latitude},${gpsData.longitude}`);
          
          // TODO: Save parsed GPS location to database
          // await saveLocationFromSMS({
          //   busId: gpsData.busId, 
          //   latitude: gpsData.latitude, 
          //   longitude: gpsData.longitude, 
          //   sender, 
          //   timestamp, 
          //   source: gpsData.source,
          //   encrypted: message.startsWith('GPS_ENC:')
          // });
          
          return res.status(200).json({
            success: true,
            message: 'GPS location extracted from raw SMS - no SMS response sent',
            busId: gpsData.busId,
            location: { 
              latitude: gpsData.latitude, 
              longitude: gpsData.longitude 
            },
            encrypted: message.startsWith('GPS_ENC:'),
            source: gpsData.source,
            processed: true
          });
        }
        
        // Check if it's a passenger query (contains BUS followed by number OR vehicle registration, but NOT a GPS message)
        // IMPORTANT: Exclude GPS messages to prevent sending SMS responses for driver location updates
        if (!message.startsWith('GPS:') && !message.startsWith('GPS_ENC:')) {
          // Try BUS format first: BUS001, BUS123, etc.
          let busQueryMatch = message.match(/BUS(\d+)/i);
          let queriedBusId = null;
          
          if (busQueryMatch) {
            queriedBusId = `BUS${busQueryMatch[1].padStart(3, '0')}`;
          } else {
            // Try vehicle registration format: MH12AB1234, DL01AB1234, etc.
            const vehicleMatch = message.match(/([A-Z]{2}\d{2}[A-Z]{1,2}\d{4})/i);
            if (vehicleMatch) {
              // For now, map vehicle registration to BUS001 (you can customize this mapping)
              queriedBusId = 'BUS001';
              console.log('🚌 Vehicle registration detected:', vehicleMatch[1], '→ mapped to', queriedBusId);
            } else {
              // Try any message containing "details", "location", "status", etc. with bus-like identifier
              // Support both "STATUS MH12AB1234" and "status MH12AB1234" formats
              const generalQueryMatch = message.match(/(details|location|status|info|query|where|loc)\s+([A-Z0-9]{4,})/i);
              if (generalQueryMatch) {
                const busIdentifier = generalQueryMatch[2];
                // If it looks like a vehicle registration, map to BUS001, otherwise use as-is
                if (busIdentifier.match(/^[A-Z]{2}\d{2}[A-Z]{1,2}\d{4}$/i)) {
                  queriedBusId = 'BUS001'; // Map vehicle registration to BUS001
                } else if (busIdentifier.startsWith('BUS')) {
                  queriedBusId = busIdentifier.toUpperCase();
                } else {
                  queriedBusId = 'BUS001'; // Default fallback
                }
                console.log('🔍 General bus query detected:', generalQueryMatch[0], '→ mapped to', queriedBusId);
              }
            }
          }
          
          if (queriedBusId) {
            
            console.log('🔍 Passenger query detected in raw SMS:', {
              queriedBusId: queriedBusId,
              sender: sender,
              originalSMS: message,
              note: 'GPS messages excluded from passenger queries'
            });
            
            // Send bus details response
            try {
              const smsResponse = await fetch(`${req.headers.host ? `https://${req.headers.host}` : 'https://vercel-backend-vert-psi.vercel.app'}/api/sms/send`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  to: sender,
                  busId: queriedBusId,
                  queryType: 'bus_details'
                })
              });
              
              if (smsResponse.ok) {
                console.log('✅ Bus details SMS sent to passenger');
              } else {
                console.error('❌ Failed to send bus details SMS:', await smsResponse.text());
              }
            } catch (error) {
              console.error('❌ Error sending bus details SMS:', error);
            }
            
            return res.status(200).json({
              success: true,
              message: 'Passenger bus query processed and SMS response sent',
              busId: queriedBusId,
              processed: true
            });
          }
        } else {
          // Quiet skip when message is GPS but not decodable (e.g., truncated)
        }
        
        // If not GPS format or bus query, just log it
        return res.status(200).json({
          success: true,
          message: 'Raw SMS received and logged',
          processed: true
        });
        
      case 'test':
        console.log('🧪 SMS Gateway connection test successful:', {
          from: req.body.from || 'SMS Gateway',
          message: req.body.message || 'Connection test',
          timestamp: new Date(timestamp || Date.now()).toISOString()
        });
        
        return res.status(200).json({
          success: true,
          message: 'SMS Gateway connection test successful',
          timestamp: new Date().toISOString(),
          webhook: 'active'
        });
        
      default:
        console.log('❓ Unknown SMS type:', type);
        return res.status(400).json({ 
          error: 'Unknown SMS type',
          receivedType: type
        });
    }
    
  } catch (error) {
    console.error('SMS webhook error:', error.message);
    return res.status(500).json({ 
      error: 'Failed to process SMS webhook',
      details: error.message 
    });
  }
}