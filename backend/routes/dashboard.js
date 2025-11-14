const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');

// Apply authentication to all routes
router.use(authenticate);

// Get scheduler status
router.get('/scheduler/status', authorize(['authority']), (req, res) => {
  try {
    const alertScheduler = require('../services/alertScheduler');
    const status = alertScheduler.getStatus();
    
    res.status(200).json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Get scheduler status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get scheduler status',
      error: error.message
    });
  }
});

// Get dashboard overview
router.get('/', authorize(['authority']), (req, res) => {
  res.json({
    success: true,
    message: 'Dashboard routes endpoint - coming soon'
  });
});

module.exports = router;