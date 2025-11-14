const express = require('express');
const router = express.Router();

// SMSSync endpoint for receiving SMS messages
router.post('/', async (req, res) => {
  try {
    const { from, message, secret, device_id, sent_timestamp } = req.body;
    
    console.log('📱 SMS received from SMSSync:', {
      from,
      message,
      device_id,
      timestamp: sent_timestamp
    });

    // Validate secret key (if configured)
    const expectedSecret = process.env.SMSSYNC_SECRET;
    if (expectedSecret && secret !== expectedSecret) {
      return res.status(401).json({
        success: false,
        message: 'Invalid secret key'
      });
    }

    // Process the SMS message
    await processSMSMessage(from, message, device_id, sent_timestamp);

    // Respond with success
    res.json({
      success: true,
      message: 'SMS processed successfully'
    });

  } catch (error) {
    console.error('Error processing SMS:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process SMS'
    });
  }
});

// SMSSync task endpoint (for getting pending messages to send)
router.get('/task', async (req, res) => {
  try {
    // Check for pending outgoing messages
    const pendingMessages = await getPendingOutgoingMessages();
    
    if (pendingMessages.length > 0) {
      const message = pendingMessages[0];
      
      res.json({
        task: 'send',
        secret: process.env.SMSSYNC_SECRET || '',
        messages: [{
          to: message.to,
          message: message.text,
          uuid: message.uuid
        }]
      });
      
      // Mark message as sent
      await markMessageAsSent(message.uuid);
    } else {
      // No pending messages
      res.json({
        task: 'none'
      });
    }

  } catch (error) {
    console.error('Error getting SMS tasks:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get SMS tasks'
    });
  }
});

// SMSSync delivery report endpoint
router.post('/delivered', async (req, res) => {
  try {
    const { uuid, delivered_timestamp } = req.body;
    
    console.log('📱 SMS delivery report:', {
      uuid,
      delivered_timestamp
    });

    // Update message delivery status
    await updateDeliveryStatus(uuid, delivered_timestamp);

    res.json({
      success: true,
      message: 'Delivery report processed'
    });

  } catch (error) {
    console.error('Error processing delivery report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process delivery report'
    });
  }
});

// Function to process incoming SMS messages
async function processSMSMessage(from, message, deviceId, timestamp) {
  try {
    // Clean and normalize the message
    const cleanMessage = message.trim().toLowerCase();
    
    // Parse common bus tracking commands
    if (cleanMessage.startsWith('bus ') || cleanMessage.startsWith('track ')) {
      await handleBusTrackingRequest(from, cleanMessage);
    } else if (cleanMessage.includes('route') || cleanMessage.includes('schedule')) {
      await handleRouteInquiry(from, cleanMessage);
    } else if (cleanMessage.includes('help') || cleanMessage === '?') {
      await sendHelpMessage(from);
    } else {
      // Unknown command
      await sendUnknownCommandMessage(from);
    }

  } catch (error) {
    console.error('Error processing SMS message:', error);
    // Send error message to user
    await sendErrorMessage(from);
  }
}

// Handle bus tracking requests
async function handleBusTrackingRequest(phoneNumber, message) {
  try {
    // Extract bus number from message
    const busMatch = message.match(/bus\s+(\w+)|track\s+(\w+)/);
    const busNumber = busMatch ? (busMatch[1] || busMatch[2]) : null;

    if (!busNumber) {
      await queueSMSMessage(phoneNumber, 
        'Please specify a bus number. Example: "BUS PB01" or "TRACK 123"');
      return;
    }

    // Find bus information
    const Bus = require('../models/Bus');
    const bus = await Bus.findOne({ busNumber: new RegExp(busNumber, 'i') })
      .populate('route')
      .populate('driver');

    if (!bus) {
      await queueSMSMessage(phoneNumber, 
        `Bus ${busNumber.toUpperCase()} not found. Please check the bus number and try again.`);
      return;
    }

    // Format bus information
    let response = `🚌 Bus ${bus.busNumber}\n`;
    if (bus.route) {
      response += `Route: ${bus.route.name}\n`;
    }
    if (bus.currentLocation) {
      response += `Location: Available\n`;
    } else {
      response += `Location: Not available\n`;
    }
    if (bus.status) {
      response += `Status: ${bus.status}\n`;
    }
    response += `\nFor real-time tracking, download our app.`;

    await queueSMSMessage(phoneNumber, response);

  } catch (error) {
    console.error('Error handling bus tracking request:', error);
    await sendErrorMessage(phoneNumber);
  }
}

// Handle route inquiries
async function handleRouteInquiry(phoneNumber, message) {
  try {
    const Route = require('../models/Route');
    const routes = await Route.find().limit(5);

    let response = '🚍 Available Routes:\n\n';
    routes.forEach((route, index) => {
      response += `${index + 1}. ${route.name}\n`;
    });
    response += '\nFor detailed schedules, download our app or visit our website.';

    await queueSMSMessage(phoneNumber, response);

  } catch (error) {
    console.error('Error handling route inquiry:', error);
    await sendErrorMessage(phoneNumber);
  }
}

// Send help message
async function sendHelpMessage(phoneNumber) {
  const helpText = `🚌 MargSetu SMS Commands:

BUS [number] - Track a specific bus
ROUTE - View available routes
HELP - Show this help message

Example: "BUS PB01" or "TRACK 123"

For full features, download our mobile app.`;

  await queueSMSMessage(phoneNumber, helpText);
}

// Send unknown command message
async function sendUnknownCommandMessage(phoneNumber) {
  await queueSMSMessage(phoneNumber, 
    'Command not recognized. Reply with HELP for available commands.');
}

// Send error message
async function sendErrorMessage(phoneNumber) {
  await queueSMSMessage(phoneNumber, 
    'Sorry, there was an error processing your request. Please try again later.');
}

// Queue SMS message for sending
async function queueSMSMessage(to, text) {
  // In a real implementation, you would store this in a database
  // For now, we'll just log it
  console.log('📤 Queuing SMS:', { to, text });
  
  // You could store in a Message model:
  // const Message = require('../models/Message');
  // await Message.create({
  //   to,
  //   text,
  //   status: 'pending',
  //   uuid: generateUUID()
  // });
}

// Get pending outgoing messages
async function getPendingOutgoingMessages() {
  // In a real implementation, get from database
  // For now, return empty array
  return [];
}

// Mark message as sent
async function markMessageAsSent(uuid) {
  // In a real implementation, update database
  console.log('✅ Message marked as sent:', uuid);
}

// Update delivery status
async function updateDeliveryStatus(uuid, timestamp) {
  // In a real implementation, update database
  console.log('📬 Message delivered:', uuid, timestamp);
}

module.exports = router;