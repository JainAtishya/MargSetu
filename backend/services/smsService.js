const twilio = require('twilio');
const mongoose = require('mongoose');
const { locationService } = require('./locationService');

class SMSService {
  constructor() {
    this.client = null;
    this.twilioNumber = process.env.TWILIO_PHONE_NUMBER;
    this.initializeTwilio();
  }

  initializeTwilio() {
    try {
      if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
        this.client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        console.log('✅ Twilio SMS service initialized');
      } else {
        console.log('⚠️  Twilio credentials not configured - SMS service disabled');
        // Fallback to console logging for development
        this.client = {
          messages: {
            create: async (options) => {
              console.log('\n📱 SMS would be sent via Twilio:');
              console.log('To:', options.to);
              console.log('From:', options.from);
              console.log('Message:', options.body);
              return { sid: 'dev-sms-' + Date.now(), status: 'sent' };
            }
          }
        };
      }
    } catch (error) {
      console.error('❌ Error initializing Twilio:', error.message);
    }
  }

  // Parse incoming GPS SMS from driver
  parseDriverGPSSMS(messageBody, from) {
    try {
      // Expected format: "GPS:BusID,Latitude,Longitude,Speed,Heading,Timestamp"
      // Example: "GPS:MH12AB1234,19.0760,72.8777,45,180,1694615425"

      if (!messageBody.startsWith('GPS:')) {
        return null;
      }

      const data = messageBody.substring(4).split(',');

      if (data.length < 6) {
        throw new Error('Invalid GPS SMS format');
      }

      const [busId, latitude, longitude, speed, heading, timestamp] = data;

      return {
        busId: busId.trim(),
        location: {
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude)
        },
        speed: parseFloat(speed),
        heading: parseFloat(heading),
        timestamp: new Date(parseInt(timestamp)), // Already in milliseconds, don't multiply by 1000
        driverPhone: from,
        source: 'sms_offline',
        receivedAt: new Date()
      };
    } catch (error) {
      console.error('Error parsing GPS SMS:', error.message);
      return null;
    }
  }

  // Parse passenger location query SMS
  parsePassengerQuery(messageBody, from) {
    try {
      // Expected formats:
      // "BUS MH12AB1234" - specific bus location
      // "STATUS MH12AB1234" - alias for bus location (compat with app)
      // "ROUTE 42" - buses on route 42
      // "ROUTE Pune TO Mumbai" - flexible route query (compat with app)
      // "SCHEDULE Pune-Mumbai" - map to route info (compat)
      // "NEAREST STOP Central Station" - nearest buses to a stop

      const raw = messageBody.trim();
      const query = raw.toUpperCase();

      if (query.startsWith('BUS ')) {
        return {
          type: 'bus_location',
          busId: query.substring(4).trim(),
          passengerPhone: from
        };
      } else if (query.startsWith('STATUS ') || query.startsWith('LOC ')) {
        // Compatibility: treat STATUS and LOC like BUS
        const busId = query.startsWith('STATUS ')
          ? query.substring(7).trim()
          : query.substring(4).trim();
        return {
          type: 'bus_location',
          busId: busId,
          passengerPhone: from
        };
      } else if (query.startsWith('ROUTE ')) {
        // Accept both "ROUTE 42" and "ROUTE Pune TO Mumbai"
        const after = raw.substring(6).trim();
        const toMatch = after.toUpperCase().match(/(.+?)\s+TO\s+(.+)/);
        if (toMatch) {
          // If FROM..TO pattern provided, we can respond with a helpful summary
          return {
            type: 'route_search',
            from: toMatch[1].trim(),
            to: toMatch[2].trim(),
            passengerPhone: from
          };
        }
        return {
          type: 'route_buses',
          routeId: after,
          passengerPhone: from
        };
      } else if (query.startsWith('SCHEDULE ')) {
        // Map to route info for now
        const routeName = raw.substring(9).trim();
        return {
          type: 'route_schedule',
          route: routeName,
          passengerPhone: from
        };
      } else if (query.startsWith('NEAREST ')) {
        return {
          type: 'nearest_buses',
          location: query.substring(8).trim(),
          passengerPhone: from
        };
      } else if (query === 'HELP' || query === 'INFO') {
        return {
          type: 'help',
          passengerPhone: from
        };
      }

      return null;
    } catch (error) {
      console.error('Error parsing passenger query:', error.message);
      return null;
    }
  }

  // Process incoming driver GPS SMS
  async processDriverGPS(gpsData) {
    try {
      const Bus = require('../models/Bus');
      // Find the bus
      const bus = await Bus.findOne({ busId: gpsData.busId });
      if (!bus) {
        console.log(`⚠️  Bus not found: ${gpsData.busId}`);
        return false;
      }

      // Update current location on Bus (Android app consumes this)
      await bus.updateLocation(
        Number(gpsData.location.latitude),
        Number(gpsData.location
          .longitude),
        Number(gpsData.speed) || 0,
        Number(gpsData.heading) || 0
      );

      // Try to set operational status
      if (bus.operationalStatus !== 'running') {
        bus.operationalStatus = 'running';
        await bus.save();
      }

      console.log(`✅ GPS updated on Bus for ${gpsData.busId} via SMS`);

      // Send confirmation SMS to driver
      await this.sendDriverConfirmation(gpsData.driverPhone, gpsData.busId);

      return true;
    } catch (error) {
      console.error('Error processing driver GPS:', error.message);
      return false;
    }
  }

  // Process passenger location query
  async processPassengerQuery(queryData) {
    try {
      let responseMessage = '';

      switch (queryData.type) {
        case 'bus_location':
          responseMessage = await this.getBusLocationResponse(queryData.busId);
          break;
        case 'route_buses':
          responseMessage = await this.getRouteBusesResponse(queryData.routeId);
          break;
        case 'route_search':
          responseMessage = await this.getRouteSearchResponse(queryData.from, queryData.to);
          break;
        case 'route_schedule':
          responseMessage = await this.getRouteScheduleResponse(queryData.route);
          break;
        case 'nearest_buses':
          responseMessage = await this.getNearestBusesResponse(queryData.location);
          break;
        case 'help':
          responseMessage = this.getHelpMessage();
          break;
        default:
          responseMessage = 'Invalid query. Send "HELP" for usage instructions.';
      }

      // Send response SMS to passenger
      await this.sendSMS(queryData.passengerPhone, responseMessage);

      console.log(`✅ Responded to passenger query: ${queryData.type}`);
      return true;
    } catch (error) {
      console.error('Error processing passenger query:', error.message);
      await this.sendSMS(queryData.passengerPhone, 'Sorry, unable to process your request. Please try again later.');
      return false;
    }
  }

  // Get bus location response for passenger
  async getBusLocationResponse(busId) {
    try {
      const Bus = mongoose.model('Bus');
      const Location = mongoose.model('Location');

      const bus = await Bus.findOne({ busId }).populate('route');
      if (!bus) {
        return `Bus ${busId} not found. Please check the bus ID and try again.`;
      }

      // Get latest location
      const latestLocation = await Location.findOne({ bus: bus._id })
        .sort({ createdAt: -1 });

      if (!latestLocation) {
        return `Bus ${busId} location not available. The bus may be offline.`;
      }

      const lastUpdate = Math.floor((Date.now() - latestLocation.createdAt.getTime()) / 60000);
      const lat = latestLocation.coordinates.coordinates[1];
      const lng = latestLocation.coordinates.coordinates[0];

      // Convert coordinates to real address
      const locationText = await locationService.formatLocationForSMS(lat, lng);

      return `🚌 Bus ${busId}
Route: ${bus.route?.name || 'Unknown'}
${locationText}
Speed: ${Math.round(latestLocation.speed || 0)} km/h
Last Update: ${lastUpdate} min ago
Status: ${bus.operationalStatus || 'Active'}

MargSetu - Smart Transport`;
    } catch (error) {
      console.error('Error getting bus location:', error.message);
      return 'Unable to retrieve bus location. Please try again later.';
    }
  }

  // Get route buses response
  async getRouteBusesResponse(routeId) {
    try {
      const Route = mongoose.model('Route');
      const Bus = mongoose.model('Bus');
      const Location = mongoose.model('Location');

      const route = await Route.findOne({ routeId });
      if (!route) {
        return `Route ${routeId} not found. Please check the route number.`;
      }

      const buses = await Bus.find({ route: route._id, isActive: true });
      if (buses.length === 0) {
        return `No active buses found on Route ${routeId}.`;
      }

      let response = `🚌 Route ${routeId} - ${route.name}\n`;

      for (const bus of buses.slice(0, 2)) { // Limit to 2 buses for SMS space
        const location = await Location.findOne({ bus: bus._id })
          .sort({ createdAt: -1 });

        const lastUpdate = location ?
          Math.floor((Date.now() - location.createdAt.getTime()) / 60000) : null;

        response += `\n🚌 Bus ${bus.busId}`;
        if (location) {
          const lat = location.coordinates.coordinates[1];
          const lng = location.coordinates.coordinates[0];
          const address = await locationService.coordinatesToAddress(lat, lng);
          response += `\n📍 ${address}`;
        }
        if (lastUpdate !== null) {
          response += `\n⏰ ${lastUpdate}min ago`;
        }
        response += '\n';
      }

      if (buses.length > 2) {
        response += `\n+${buses.length - 2} more buses active`;
      }

      response += `\n\nMargSetu - Smart Transport`;
      return response;
    } catch (error) {
      console.error('Error getting route buses:', error.message);
      return 'Unable to retrieve route information. Please try again later.';
    }
  }

  // Get route search response (FROM..TO compatibility)
  async getRouteSearchResponse(from, to) {
    try {
      // For now, provide a helpful summary and suggest installing app for details
      return `🛣️ Route search\nFrom: ${from}\nTo: ${to}\n\nFor detailed schedules and live tracking, download the MargSetu app.`;
    } catch (error) {
      return 'Unable to retrieve route information. Please try again later.';
    }
  }

  // Get route schedule response
  async getRouteScheduleResponse(route) {
    try {
      // Placeholder: could query DB for a timetable in future
      return `🗓️ Schedule for ${route}\n\nFor full timetable, download the MargSetu app or visit our website.`;
    } catch (error) {
      return 'Unable to retrieve schedule. Please try again later.';
    }
  }

  // Get nearest buses response
  async getNearestBusesResponse(locationQuery) {
    try {
      // For demo purposes, return a generic response
      // In production, you'd geocode the location and find nearest buses
      return `🚌 Nearest buses to ${locationQuery}:

Bus MH12AB1001 - Route 42
Distance: 0.5 km, ETA: 3 min

Bus MH12AB1002 - Route 15  
Distance: 0.8 km, ETA: 5 min

Bus MH12AB1003 - Route 8
Distance: 1.2 km, ETA: 7 min

MargSetu - Smart Transport`;
    } catch (error) {
      return 'Unable to find nearest buses. Please try again later.';
    }
  }

  // Get help message
  getHelpMessage() {
    return `📱 MargSetu SMS Commands:

🚌 Track Bus:
Send "BUS MH12AB1234"

🛣️ Route Info:
Send "ROUTE 42"

📍 Nearest Buses:
Send "NEAREST Central Station"

ℹ️ Help:
Send "HELP"

Example: BUS MH12AB1234

MargSetu - Smart Transport
Powered by SMS Technology`;
  }

  // Send SMS using Twilio
  async sendSMS(to, message) {
    try {
      if (!this.client) {
        throw new Error('Twilio client not initialized');
      }

      const result = await this.client.messages.create({
        from: this.twilioNumber,
        to: to,
        body: message
      });

      console.log(`✅ SMS sent to ${to}, SID: ${result.sid}`);
      return result;
    } catch (error) {
      console.error(`❌ Error sending SMS to ${to}:`, error.message);
      throw error;
    }
  }

  // Send confirmation to driver after GPS received
  async sendDriverConfirmation(driverPhone, busId) {
    try {
      const message = `✅ GPS received for Bus ${busId}
Time: ${new Date().toLocaleTimeString()}
Status: Location updated

Continue sending GPS when offline.
MargSetu Driver System`;

      await this.sendSMS(driverPhone, message);
    } catch (error) {
      console.error('Error sending driver confirmation:', error.message);
    }
  }

  // Send emergency alerts via SMS
  async sendEmergencyAlert(phoneNumbers, alertMessage, busId) {
    try {
      const message = `🚨 EMERGENCY ALERT 🚨

Bus: ${busId}
${alertMessage}

Time: ${new Date().toLocaleString()}
Action: Immediate response required

MargSetu Emergency System`;

      const results = [];
      for (const phone of phoneNumbers) {
        try {
          const result = await this.sendSMS(phone, message);
          results.push({ phone, success: true, sid: result.sid });
        } catch (error) {
          results.push({ phone, success: false, error: error.message });
        }
      }

      return results;
    } catch (error) {
      console.error('Error sending emergency alerts:', error.message);
      throw error;
    }
  }

  // Generate driver instruction SMS for offline GPS
  getDriverInstructions(busId, driverPhone) {
    return `📱 MargSetu Driver - Offline GPS Instructions

Bus: ${busId}
Driver: ${driverPhone}

📍 Send GPS Format:
GPS:${busId},Latitude,Longitude,Speed,Heading,Timestamp

📝 Example:
GPS:${busId},19.0760,72.8777,45,180,${Math.floor(Date.now() / 1000)}

⏰ Send every minute when offline
📶 Auto-resume when internet available

MargSetu Driver System`;
  }

  // Validate phone number format
  validatePhoneNumber(phone) {
    // Basic validation for Indian mobile numbers
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phone);
  }

  // Format phone number for Twilio
  formatPhoneNumber(phone) {
    // Ensure phone number has country code
    if (phone.startsWith('+')) {
      return phone;
    } else if (phone.startsWith('91') && phone.length === 12) {
      return '+' + phone;
    } else if (phone.length === 10) {
      return '+91' + phone; // Indian numbers
    }
    return phone;
  }

  // Health check for SMS service
  async healthCheck() {
    try {
      if (!this.client) {
        return { status: 'disabled', message: 'Twilio not configured' };
      }

      // Test Twilio connection by fetching account info
      const account = await this.client.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();

      return {
        status: 'active',
        message: 'SMS service operational',
        account: account.friendlyName,
        twilioNumber: this.twilioNumber
      };
    } catch (error) {
      return {
        status: 'error',
        message: error.message
      };
    }
  }
}

// Export singleton instance
const smsService = new SMSService();

module.exports = {
  SMSService,
  smsService
};