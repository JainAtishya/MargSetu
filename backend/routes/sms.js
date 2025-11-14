const express = require('express');
const router = express.Router();
const smsController = require('../controllers/smsController');
const { authenticate } = require('../middleware/auth');

// Twilio/Android gateway webhook endpoint (no auth required)
router.post('/webhook', smsController.handleIncomingSMS.bind(smsController));

// Protected SMS endpoints
router.use(authenticate); // Apply authentication to all routes below

// Bulk SMS notifications
router.post('/bulk-send', smsController.sendBulkNotifications.bind(smsController));

// Send driver instructions for offline GPS
router.post('/driver-instructions/:busId', smsController.sendDriverInstructions.bind(smsController));

// SMS service health check
router.get('/health', smsController.healthCheck.bind(smsController));

// SMS analytics
router.get('/analytics', smsController.getSMSAnalytics.bind(smsController));

// Test SMS functionality
router.post('/test', smsController.testSMS.bind(smsController));

module.exports = router;