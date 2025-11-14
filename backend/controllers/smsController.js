const { smsService } = require('../services/smsService');
const mongoose = require('mongoose');
// Ensure models are registered before using mongoose.model(...)
const BusModel = require('../models/Bus');
const SMSLogModel = require('../models/SMSLog');

class SMSController {
  constructor() {
    // Bind handlers so `this` is preserved when used as Express callbacks
    this.handleIncomingSMS = this.handleIncomingSMS.bind(this);
    this.sendBulkNotifications = this.sendBulkNotifications.bind(this);
    this.sendDriverInstructions = this.sendDriverInstructions.bind(this);
    this.healthCheck = this.healthCheck.bind(this);
    this.getSMSAnalytics = this.getSMSAnalytics.bind(this);
    this.testSMS = this.testSMS.bind(this);
  }
  // Webhook endpoint for Twilio incoming SMS
  async handleIncomingSMS(req, res) {
    try {
      console.log('\n📱 Incoming SMS webhook triggered');
      const source = req.headers['user-agent']?.includes('Twilio') ? 'twilio' : (req.headers['x-gateway-api-key'] ? 'android-gateway' : 'unknown');
      console.log(`🔎 Detected source: ${source}`);
      console.log('🌐 IP:', req.ip);
      console.log('🧾 Headers (filtered):', {
        'content-type': req.headers['content-type'],
        'user-agent': req.headers['user-agent'],
        'x-gateway-api-key': req.headers['x-gateway-api-key'] ? '[present]' : '[absent]'
      });
      console.log('📦 Body:', req.body);

      // Android Gateway JSON path (preferred for offline driver GPS)
      const gatewayKey = req.headers['x-gateway-api-key'];
      if (gatewayKey) {
        if (!process.env.SMS_GATEWAY_API_KEY || gatewayKey !== process.env.SMS_GATEWAY_API_KEY) {
          console.log('❌ Invalid or missing SMS_GATEWAY_API_KEY');
          return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        // Normalize multiple possible field names from different gateway builds
        const body = req.body || {};
        const bodyType = typeof body.type === 'string' ? String(body.type).toLowerCase() : undefined;
        // Normalize sender early for use in all branches
        let from = body.from || body.sender || body.phone || body.msisdn || 'android-gateway';
        // Simple connectivity test from gateway app
        if (bodyType === 'test') {
          console.log('🔌 [Gateway] Test connection payload received');
          await this.logSMSMessage({
            from,
            type: 'notification',
            messageSid: `gateway-test-${Date.now()}`,
            status: 'processed',
            query: 'gateway test'
          });
          return res.status(200).json({ success: true, message: 'Gateway test OK' });
        }
        let busId = body.busId || body.bus_id || body.bus || body.id;
        let latitude = (body.latitude !== undefined ? body.latitude : body.lat);
        let longitude = (body.longitude !== undefined ? body.longitude : (body.lng !== undefined ? body.lng : body.long));
        let speed = body.speed !== undefined ? body.speed : (body.velocity !== undefined ? body.velocity : 0);
        let heading = body.heading !== undefined ? body.heading : (body.bearing !== undefined ? body.bearing : 0);
        let timestamp = body.timestamp || body.time || body.ts;

        // If busId/coords missing, try parsing simple message shapes like 'GPS:...' or 'BUS123:lat,lng'
        const inlineMessage = typeof body.message === 'string' ? body.message : (typeof body.originalMessage === 'string' ? body.originalMessage : undefined);

        if (inlineMessage) {
          console.log(`📋 [Gateway] Processing SMS message: "${inlineMessage}" from ${from}`);
        }

        // Explicit passenger query path from gateway (no lat/lng expected)
        if (bodyType === 'passenger_query' && busId) {
          try {
            const q = { type: 'bus_location', busId: String(busId).toUpperCase(), passengerPhone: from || 'android-gateway' };
            await smsService.processPassengerQuery(q);
            await this.logSMSMessage({
              from: q.passengerPhone,
              type: 'passenger_query',
              queryType: q.type,
              messageSid: `gateway-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
              status: 'responded',
              query: inlineMessage || `LOC ${q.busId}`
            });
            return res.status(200).json({ success: true, message: 'Passenger query processed' });
          } catch (e) {
            console.log('❌ [Gateway] Passenger query handling failed:', e.message);
            return res.status(500).json({ success: false, message: 'Failed to process passenger query' });
          }
        }

        // Raw SMS from gateway: try passenger parser
        if (bodyType === 'sms_raw' && typeof inlineMessage === 'string') {
          const parsed = smsService.parsePassengerQuery(inlineMessage, from || 'android-gateway');
          if (parsed) {
            try {
              await smsService.processPassengerQuery(parsed);
              await this.logSMSMessage({
                from: parsed.passengerPhone,
                type: 'passenger_query',
                queryType: parsed.type,
                messageSid: `gateway-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
                status: 'responded',
                query: inlineMessage
              });
              return res.status(200).json({ success: true, message: 'Raw SMS parsed and processed' });
            } catch (e) {
              console.log('❌ [Gateway] Raw SMS passenger query failed:', e.message);
              return res.status(500).json({ success: false, message: 'Failed to process raw SMS' });
            }
          }
        }

        // Check for passenger queries first, before GPS validation
        if (typeof inlineMessage === 'string' && inlineMessage.trim()) {
          const parsed = smsService.parsePassengerQuery(inlineMessage, from || 'android-gateway');
          if (parsed) {
            try {
              console.log('📱 [Gateway] Processing passenger query:', inlineMessage, 'from:', from);
              await smsService.processPassengerQuery(parsed);
              await this.logSMSMessage({
                from: parsed.passengerPhone,
                type: 'passenger_query',
                queryType: parsed.type,
                messageSid: `gateway-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
                status: 'responded',
                query: inlineMessage
              });
              return res.status(200).json({ success: true, message: 'Passenger query processed successfully' });
            } catch (e) {
              console.log('❌ [Gateway] Passenger query processing failed:', e.message);
              return res.status(500).json({ success: false, message: 'Failed to process passenger query' });
            }
          }
        }
        if ((!busId || latitude === undefined || longitude === undefined) && typeof inlineMessage === 'string') {
          const msg = inlineMessage.trim();
          if (msg.startsWith('GPS:')) {
            const gpsData = smsService.parseDriverGPSSMS(msg, from || 'android-gateway');
            if (gpsData) {
              busId = gpsData.busId;
              latitude = gpsData.location?.latitude;
              longitude = gpsData.location?.longitude;
              speed = gpsData.speed ?? speed;
              heading = gpsData.heading ?? heading;
              timestamp = gpsData.timestamp?.toISOString() || timestamp;
            }
          } else if (msg.startsWith('MARGSETU:')) {
            // Parse MARGSETU format: MARGSETU:BUS001:DRV1001:lat:lng:accuracy:timestamp
            const margsetuParts = msg.split(':');
            if (margsetuParts.length >= 6) {
              busId = busId || margsetuParts[1];
              const driverId = margsetuParts[2];
              latitude = latitude !== undefined ? latitude : parseFloat(margsetuParts[3]);
              longitude = longitude !== undefined ? longitude : parseFloat(margsetuParts[4]);
              const accuracy = parseFloat(margsetuParts[5]);
              if (margsetuParts[6]) {
                // Convert "2025-09-22 13:14:41" to proper ISO format
                const timestampStr = margsetuParts.slice(6).join(':'); // Join back in case time has colons
                try {
                  const parsedDate = new Date(timestampStr);
                  if (!isNaN(parsedDate.getTime())) {
                    timestamp = parsedDate.toISOString();
                  }
                } catch (e) {
                  console.log(`⚠️ [Gateway] Failed to parse timestamp "${timestampStr}":`, e.message);
                }
              }
              console.log(`📍 [Gateway] Parsed MARGSETU SMS: bus=${busId} driver=${driverId} lat=${latitude} lng=${longitude} accuracy=${accuracy} timestamp=${timestamp}`);
            }
          } else {
            // Match '<token>:lat,lng' where token can be BUS123, 24-hex ObjectId, etc. (with optional spaces)
            const m = msg.match(/^([A-Za-z0-9_-]+):\s*([-\d\.]+)\s*,\s*([-\d\.]+)/);
            if (m) {
              busId = busId || m[1];
              latitude = latitude !== undefined ? latitude : parseFloat(m[2]);
              longitude = longitude !== undefined ? longitude : parseFloat(m[3]);
            } else {
              // Not a GPS update; treat as passenger query and process via service
              const q = smsService.parsePassengerQuery(msg, from || 'android-gateway');
              if (q) {
                try {
                  await smsService.processPassengerQuery(q);
                  await this.logSMSMessage({
                    from: q.passengerPhone,
                    type: 'passenger_query',
                    queryType: q.type,
                    messageSid: `gateway-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
                    status: 'responded',
                    query: msg
                  });
                  return res.status(200).json({ success: true, message: 'Passenger query processed' });
                } catch (e) {
                  console.log('❌ [Gateway] Passenger query handling failed:', e.message);
                  return res.status(500).json({ success: false, message: 'Failed to process passenger query' });
                }
              }
            }
          }
        }

        if (!busId || latitude === undefined || longitude === undefined) {
          console.log('❌ Missing required fields for gateway payload (after normalization)', { inlineMessage });
          return res.status(400).json({ success: false, message: 'busId, latitude, longitude are required' });
        }

        // Ensure timestamp is a valid Date object
        let ts;
        try {
          if (timestamp) {
            ts = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
            if (isNaN(ts.getTime())) {
              console.log(`⚠️ [Gateway] Invalid timestamp "${timestamp}", using current time`);
              ts = new Date();
            }
          } else {
            ts = new Date();
          }
        } catch (e) {
          console.log(`⚠️ [Gateway] Timestamp parsing error: ${e.message}, using current time`);
          ts = new Date();
        }

        // Prominent single-line terminal log for driver GPS via NET (SMS Gateway)
        try {
          const oneLine = `🛰️  [Driver GPS via NET] bus=${String(busId).toUpperCase()} lat=${Number(latitude)} lng=${Number(longitude)} speed=${Number(speed) || 0} heading=${Number(heading) || 0} ts=${ts.toISOString()} from=${from}`;
          console.log(oneLine);
        } catch (e) { /* ignore logging errors */ }
        const result = await this.processGatewayDriverLocation({ busId, latitude, longitude, speed, heading, timestamp: ts, from }, req);
        return res.status(result.success ? 200 : 400).json(result);
      }

      // Twilio webhook path (form-urlencoded)
      const { From, To, Body, MessageSid, AccountSid } = req.body;

      if (!From || !Body) {
        console.log('❌ Invalid SMS webhook data');
        return res.status(400).send('Invalid webhook data');
      }

      // Log incoming message
      console.log(`📥 SMS from ${From}: ${Body}`);

      // Determine message type and process accordingly
      const messageBody = Body.trim();

      if (messageBody.startsWith('GPS:')) {
        // Driver GPS update
        await this.handleDriverGPS(From, messageBody, MessageSid);
      } else {
        // Passenger query
        await this.handlePassengerQuery(From, messageBody, MessageSid);
      }

      // Respond with TwiML (required by Twilio)
      res.set('Content-Type', 'text/xml');
      res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Message received and processed</Message>
</Response>`);

    } catch (error) {
      console.error('❌ Error handling incoming SMS:', error.message);
      res.status(500).send('Internal server error');
    }
  }

  // Handle driver GPS JSON from Android Gateway
  async processGatewayDriverLocation(payload, req) {
    const start = Date.now();
    const { busId, latitude, longitude, speed = 0, heading = 0, timestamp, from } = payload;
    try {
      // Compact summary log for quick scanning
      console.log(`📍 [Gateway] bus=${String(busId).toUpperCase()} lat=${Number(latitude)} lng=${Number(longitude)} speed=${Number(speed) || 0} heading=${Number(heading) || 0} ts=${(timestamp instanceof Date ? timestamp : new Date(timestamp)).toISOString()} src=sms_gateway from=${from || 'android-gateway'}`);
      // Detailed payload (kept for debugging)
      console.log('🛰️  [Gateway] Driver location payload:', { busId, latitude, longitude, speed, heading, timestamp });
      let bus = await BusModel.findOne({ busId: String(busId).toUpperCase() });
      // Fallback: if not found and busId looks like a Mongo ObjectId, try by _id
      if (!bus && /^[a-fA-F0-9]{24}$/.test(String(busId))) {
        try {
          bus = await BusModel.findById(busId);
        } catch (e) {
          // ignore cast errors
        }
      }
      if (!bus) {
        console.log(`❌ [Gateway] Bus not found: ${busId}`);
        return { success: false, message: `Bus ${busId} not found` };
      }

      // Dedupe by timestamp vs lastUpdated
      const last = bus.currentLocation?.lastUpdated ? new Date(bus.currentLocation.lastUpdated) : null;
      const incomingTs = timestamp instanceof Date ? timestamp : new Date(timestamp);
      if (last && incomingTs && incomingTs.getTime() <= last.getTime()) {
        console.log('⚠️  [Gateway] Stale/duplicate location ignored', { busId, incomingTs, last });
        return { success: true, message: 'Duplicate ignored', deduped: true };
      }

      // Update bus current location
      await bus.updateLocation(Number(latitude), Number(longitude), Number(speed) || 0, Number(heading) || 0);
      // Ensure operational status
      if (bus.operationalStatus !== 'running') {
        bus.operationalStatus = 'running';
        await bus.save();
      }

      // Emit via Socket.IO
      try {
        const { io } = require('../server');
        io.to(`bus-${bus.busId}`).emit('location-update', {
          busId: bus.busId,
          location: { lat: Number(latitude), lng: Number(longitude) },
          speed: Number(speed) || 0,
          heading: Number(heading) || 0,
          timestamp: (incomingTs || new Date()).toISOString(),
          source: 'sms_gateway'
        });
        console.log(`📡 [Gateway] Emitted socket location-update for bus ${bus.busId}`);
      } catch (e) {
        console.log('⚠️  [Gateway] Socket emit failed:', e.message);
      }

      // Log SMS-like message (generate synthetic messageSid)
      const syntheticSid = `gateway-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      await this.logSMSMessage({
        from: from || 'android-gateway',
        type: 'driver_gps',
        busId: bus.busId,
        messageSid: syntheticSid,
        status: 'processed',
        location: { latitude: Number(latitude), longitude: Number(longitude) }
      });

      const elapsed = Date.now() - start;
      console.log(`✅ [Gateway] GPS processed for ${bus.busId} in ${elapsed}ms`);
      return { success: true, message: 'Location updated', elapsedMs: elapsed };
    } catch (error) {
      console.error('💥 [Gateway] Error processing driver location:', error.message);
      return { success: false, message: error.message };
    }
  }

  // Handle driver GPS SMS
  async handleDriverGPS(from, messageBody, messageSid) {
    try {
      console.log(`🚌 Processing driver GPS from ${from}`);

      // Parse GPS data
      const gpsData = smsService.parseDriverGPSSMS(messageBody, from);

      if (!gpsData) {
        console.log('❌ Invalid GPS format');
        await smsService.sendSMS(from,
          '❌ Invalid GPS format. Use: GPS:BusID,Lat,Lng,Speed,Heading,Timestamp');
        return;
      }

      console.log('📍 Parsed GPS data:', gpsData);

      // Validate bus existence and driver authorization
      const bus = await BusModel.findOne({ busId: gpsData.busId });

      if (!bus) {
        console.log(`❌ Bus not found: ${gpsData.busId}`);
        await smsService.sendSMS(from,
          `❌ Bus ${gpsData.busId} not found. Please check Bus ID.`);
        return;
      }

      // Check if driver is authorized for this bus
      if (bus.driverPhone && bus.driverPhone !== from) {
        console.log(`❌ Unauthorized driver for bus ${gpsData.busId}`);
        await smsService.sendSMS(from,
          `❌ Not authorized for Bus ${gpsData.busId}. Contact admin.`);
        return;
      }

      // Process GPS data
      const success = await smsService.processDriverGPS(gpsData);

      if (success) {
        console.log(`✅ GPS processed successfully for bus ${gpsData.busId}`);
        // Emit socket update
        try {
          const { io } = require('../server');
          io.to(`bus-${gpsData.busId}`).emit('location-update', {
            busId: gpsData.busId,
            location: { lat: gpsData.location.latitude, lng: gpsData.location.longitude },
            speed: gpsData.speed || 0,
            heading: gpsData.heading || 0,
            timestamp: (gpsData.timestamp || new Date()).toISOString(),
            source: 'sms_twilio'
          });
          console.log(`📡 [Twilio] Emitted socket location-update for bus ${gpsData.busId}`);
        } catch (e) {
          console.log('⚠️  [Twilio] Socket emit failed:', e.message);
        }

        // Log to SMS tracking
        await this.logSMSMessage({
          from,
          type: 'driver_gps',
          busId: gpsData.busId,
          messageSid,
          status: 'processed',
          location: gpsData.location
        });
      } else {
        await smsService.sendSMS(from,
          `❌ Failed to update location for Bus ${gpsData.busId}. Try again.`);
      }

    } catch (error) {
      console.error('Error handling driver GPS:', error.message);
      await smsService.sendSMS(from,
        '❌ System error. Please try again later.');
    }
  }

  // Handle passenger query SMS
  async handlePassengerQuery(from, messageBody, messageSid) {
    try {
      console.log(`👥 Processing passenger query from ${from}: ${messageBody}`);

      // Parse passenger query
      const queryData = smsService.parsePassengerQuery(messageBody, from);

      if (!queryData) {
        console.log('❌ Invalid query format');
        await smsService.sendSMS(from, smsService.getHelpMessage());
        return;
      }

      console.log('🔍 Parsed query:', queryData);

      // Process query
      const success = await smsService.processPassengerQuery(queryData);

      // Log query
      await this.logSMSMessage({
        from,
        type: 'passenger_query',
        queryType: queryData.type,
        messageSid,
        status: success ? 'responded' : 'failed',
        query: messageBody
      });

      console.log(`✅ Passenger query processed: ${queryData.type}`);

    } catch (error) {
      console.error('Error handling passenger query:', error.message);
      await smsService.sendSMS(from,
        '❌ Unable to process query. Send "HELP" for assistance.');
    }
  }

  // Log SMS messages for analytics
  async logSMSMessage(data) {
    try {
      const logEntry = new SMSLogModel({
        phoneNumber: data.from,
        messageType: data.type,
        messageSid: data.messageSid,
        status: data.status,
        busId: data.busId,
        queryType: data.queryType,
        location: data.location,
        query: data.query,
        processedAt: new Date(),
        metadata: {
          userAgent: 'twilio-webhook',
          source: 'sms'
        }
      });

      await logEntry.save();
      console.log('📊 SMS message logged');
    } catch (error) {
      console.error('Error logging SMS message:', error.message);
    }
  }

  // Send bulk notifications via SMS
  async sendBulkNotifications(req, res) {
    try {
      const { phoneNumbers, message, type = 'notification' } = req.body;

      if (!phoneNumbers || !Array.isArray(phoneNumbers) || !message) {
        return res.status(400).json({
          success: false,
          message: 'Phone numbers array and message are required'
        });
      }

      console.log(`📱 Sending bulk SMS to ${phoneNumbers.length} recipients`);

      const results = [];

      for (const phone of phoneNumbers) {
        try {
          const formattedPhone = smsService.formatPhoneNumber(phone);
          const result = await smsService.sendSMS(formattedPhone, message);
          results.push({
            phone,
            success: true,
            sid: result.sid
          });
        } catch (error) {
          results.push({
            phone,
            success: false,
            error: error.message
          });
        }
      }

      const successCount = results.filter(r => r.success).length;

      res.json({
        success: true,
        message: `Bulk SMS sent: ${successCount}/${phoneNumbers.length} successful`,
        results,
        summary: {
          total: phoneNumbers.length,
          successful: successCount,
          failed: phoneNumbers.length - successCount
        }
      });

    } catch (error) {
      console.error('Error sending bulk SMS:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to send bulk SMS',
        error: error.message
      });
    }
  }

  // Send driver instructions
  async sendDriverInstructions(req, res) {
    try {
      const { busId } = req.params;
      const { driverPhone } = req.body;

      if (!busId || !driverPhone) {
        return res.status(400).json({
          success: false,
          message: 'Bus ID and driver phone are required'
        });
      }

      // Verify bus exists
      const Bus = mongoose.model('Bus');
      const bus = await Bus.findOne({ busId });

      if (!bus) {
        return res.status(404).json({
          success: false,
          message: 'Bus not found'
        });
      }

      const formattedPhone = smsService.formatPhoneNumber(driverPhone);
      const instructions = smsService.getDriverInstructions(busId, formattedPhone);

      const result = await smsService.sendSMS(formattedPhone, instructions);

      // Update bus with driver phone
      bus.driverPhone = formattedPhone;
      await bus.save();

      res.json({
        success: true,
        message: 'Driver instructions sent successfully',
        sid: result.sid,
        busId,
        driverPhone: formattedPhone
      });

    } catch (error) {
      console.error('Error sending driver instructions:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to send driver instructions',
        error: error.message
      });
    }
  }

  // SMS service health check
  async healthCheck(req, res) {
    try {
      const health = await smsService.healthCheck();

      res.json({
        success: true,
        smsService: health,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'SMS service health check failed',
        error: error.message
      });
    }
  }

  // Get SMS analytics
  async getSMSAnalytics(req, res) {
    try {
      const { startDate, endDate, type } = req.query;

      const SMSLog = mongoose.model('SMSLog');

      let query = {};

      if (startDate && endDate) {
        query.processedAt = {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        };
      }

      if (type) {
        query.messageType = type;
      }

      const logs = await SMSLog.find(query).sort({ processedAt: -1 }).limit(100);

      const analytics = {
        totalMessages: logs.length,
        byType: {},
        byStatus: {},
        recentMessages: logs.slice(0, 10).map(log => ({
          phoneNumber: log.phoneNumber,
          type: log.messageType,
          status: log.status,
          busId: log.busId,
          processedAt: log.processedAt
        }))
      };

      // Group by type
      logs.forEach(log => {
        analytics.byType[log.messageType] = (analytics.byType[log.messageType] || 0) + 1;
        analytics.byStatus[log.status] = (analytics.byStatus[log.status] || 0) + 1;
      });

      res.json({
        success: true,
        analytics,
        timeRange: { startDate, endDate }
      });

    } catch (error) {
      console.error('Error getting SMS analytics:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to get SMS analytics',
        error: error.message
      });
    }
  }

  // Test SMS functionality
  async testSMS(req, res) {
    try {
      const { phoneNumber, message = 'Test message from MargSetu SMS service' } = req.body;

      if (!phoneNumber) {
        return res.status(400).json({
          success: false,
          message: 'Phone number is required'
        });
      }

      const formattedPhone = smsService.formatPhoneNumber(phoneNumber);
      const result = await smsService.sendSMS(formattedPhone, message);

      res.json({
        success: true,
        message: 'Test SMS sent successfully',
        sid: result.sid,
        to: formattedPhone
      });

    } catch (error) {
      console.error('Error sending test SMS:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to send test SMS',
        error: error.message
      });
    }
  }
}

module.exports = new SMSController();