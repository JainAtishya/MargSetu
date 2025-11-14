// Generate unique trip ID
const generateTripId = (busId) => {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const time = Date.now().toString().slice(-6);
  return `${busId}_${date}_${time}`;
};

// Calculate distance between two coordinates using Haversine formula
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in kilometers
};

// Generate alert ID
const generateAlertId = () => {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.random().toString(36).substr(2, 6).toUpperCase();
  return `ALT${date}${random}`;
};

// Format phone number for SMS
const formatPhoneForSMS = (phone) => {
  // Convert Indian phone number to international format
  if (phone.startsWith('91')) return `+${phone}`;
  if (phone.startsWith('+91')) return phone;
  if (phone.length === 10) return `+91${phone}`;
  return phone;
};

// Parse SMS query for bus information
const parseSMSQuery = (message) => {
  const text = message.trim().toUpperCase();
  
  // Pattern: BUS <busId>
  const busPattern = /^BUS\s+([A-Z0-9]+)$/;
  const busMatch = text.match(busPattern);
  
  if (busMatch) {
    return {
      type: 'bus_query',
      busId: busMatch[1],
      valid: true
    };
  }

  // Pattern: ROUTE <routeId>
  const routePattern = /^ROUTE\s+([A-Z0-9]+)$/;
  const routeMatch = text.match(routePattern);
  
  if (routeMatch) {
    return {
      type: 'route_query',
      routeId: routeMatch[1],
      valid: true
    };
  }

  // Pattern: HELP
  if (text === 'HELP') {
    return {
      type: 'help',
      valid: true
    };
  }

  return {
    type: 'unknown',
    valid: false,
    originalMessage: message
  };
};

// Generate SMS response for bus query
const generateBusStatusSMS = (bus, location, eta) => {
  if (!bus) {
    return "Bus not found. Send 'HELP' for commands.";
  }

  if (!location) {
    return `Bus ${bus.busId} (${bus.registrationNumber}) is currently offline. Please try again later.`;
  }

  const lastUpdateMinutes = Math.floor((Date.now() - location.createdAt) / (1000 * 60));
  const statusText = bus.operationalStatus === 'running' ? 'Running' : 
                    bus.operationalStatus === 'idle' ? 'At Stop' : 'Not Active';

  let response = `Bus ${bus.busId}: ${statusText}`;
  
  if (eta && eta.nextStop) {
    response += `\nNext: ${eta.nextStop.stopName} in ${eta.nextStop.estimatedMinutes} min`;
  }
  
  if (lastUpdateMinutes < 10) {
    response += `\nLast seen: ${lastUpdateMinutes} min ago`;
  } else {
    response += '\nLocation data may be outdated';
  }

  response += '\nSend BUS <ID> for other buses';
  
  return response;
};

// Generate help SMS
const generateHelpSMS = () => {
  return `MargSetu Bus Tracker Commands:
BUS <ID> - Get bus status (e.g., BUS001)
ROUTE <ID> - Get route info (e.g., R001)
HELP - Show this help

Example: Send "BUS BUS001" to get status of Bus BUS001`;
};

// Validate coordinates
const isValidCoordinate = (latitude, longitude) => {
  return !isNaN(latitude) && !isNaN(longitude) &&
         latitude >= -90 && latitude <= 90 &&
         longitude >= -180 && longitude <= 180;
};

// Convert speed from different units
const convertSpeed = (speed, fromUnit = 'kmh', toUnit = 'kmh') => {
  const conversions = {
    kmh: 1,
    mph: 1.609344,
    ms: 3.6
  };
  
  const baseSpeed = speed / conversions[fromUnit];
  return baseSpeed * conversions[toUnit];
};

// Check if bus is idle (not moving for a while)
const isBusIdle = (locations, timeThresholdMinutes = 10, speedThreshold = 2) => {
  if (!locations || locations.length === 0) return false;

  const now = new Date();
  const threshold = timeThresholdMinutes * 60 * 1000; // Convert to milliseconds

  // Check if bus hasn't moved for the threshold time
  const recentLocations = locations.filter(loc => 
    (now - loc.createdAt) <= threshold
  );

  if (recentLocations.length === 0) return true; // No recent data

  // Check if all recent locations show low/no speed
  const isIdle = recentLocations.every(loc => loc.speed <= speedThreshold);
  
  return isIdle && recentLocations.length >= 3; // Need at least 3 data points
};

// Generate bus assignment recommendations
const getBusAssignmentRecommendations = (drivers, buses, routes) => {
  // Simple algorithm to recommend bus assignments
  const recommendations = [];
  
  const availableDrivers = drivers.filter(d => d.isActive && !d.isOnDuty);
  const availableBuses = buses.filter(b => b.isActive && b.status === 'active' && !b.currentDriver);
  
  for (let i = 0; i < Math.min(availableDrivers.length, availableBuses.length); i++) {
    recommendations.push({
      driver: availableDrivers[i],
      bus: availableBuses[i],
      confidence: 0.8, // Simple confidence score
      reason: 'Available driver and bus match'
    });
  }
  
  return recommendations;
};

// Time zone utilities for Indian Standard Time
const getISTTime = (date = new Date()) => {
  return new Date(date.getTime() + (5.5 * 60 * 60 * 1000)); // IST is UTC+5:30
};

const formatTimeIST = (date) => {
  return getISTTime(date).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour12: true
  });
};

// Sanitize user input
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return input.trim().replace(/[<>\"']/g, '');
};

// Rate limiting helpers
const createRateLimitKey = (type, identifier) => {
  return `rate_limit:${type}:${identifier}`;
};

// Emergency contact formatting
const formatEmergencyContact = (contact) => {
  if (!contact || !contact.name || !contact.phone) {
    return 'No emergency contact available';
  }
  
  return `${contact.name} (${contact.relationship || 'Contact'}): ${contact.phone}`;
};

module.exports = {
  generateTripId,
  calculateDistance,
  generateAlertId,
  formatPhoneForSMS,
  parseSMSQuery,
  generateBusStatusSMS,
  generateHelpSMS,
  isValidCoordinate,
  convertSpeed,
  isBusIdle,
  getBusAssignmentRecommendations,
  getISTTime,
  formatTimeIST,
  sanitizeInput,
  createRateLimitKey,
  formatEmergencyContact
};