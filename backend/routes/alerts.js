const express = require('express');
const router = express.Router();
const {
  authenticate,
  authenticateAuthority,
  authenticateDriver
} = require('../middleware/auth');
const {
  createSOSAlert,
  getAlerts,
  acknowledgeAlert,
  resolveAlert,
  dismissAlert,
  getAlertById,
  getAlertStats,
  triggerManualIdleCheck,
  getAlertHistory
} = require('../controllers/alertController');
const alertScheduler = require('../services/alertScheduler');

// @route   POST /api/alerts/sos
// @desc    Create SOS emergency alert (driver only)
// @access  Protected - Driver
router.post('/sos', authenticateDriver, createSOSAlert);

// @route   POST /api/alerts/idle-check
// @desc    Trigger manual idle bus check (authority only)
// @access  Protected - Authority
router.post('/idle-check', authenticateAuthority, triggerManualIdleCheck);

// @route   GET /api/alerts
// @desc    Get alerts with filtering and pagination
// @access  Protected - Authority (all alerts), Driver (own alerts only)
router.get('/', authenticate, getAlerts);

// @route   GET /api/alerts/stats
// @desc    Get alert statistics and dashboard data
// @access  Protected - Authority
router.get('/stats', authenticateAuthority, getAlertStats);

// @route   GET /api/alerts/history
// @desc    Get historical alert data for analysis
// @access  Protected - Authority
router.get('/history', authenticateAuthority, getAlertHistory);

// @route   GET /api/alerts/:alertId
// @desc    Get specific alert details
// @access  Protected
router.get('/:alertId', authenticate, getAlertById);

// @route   PUT /api/alerts/:alertId/acknowledge
// @desc    Acknowledge an alert (authority only)
// @access  Protected - Authority
router.put('/:alertId/acknowledge', authenticateAuthority, acknowledgeAlert);

// @route   PUT /api/alerts/:alertId/resolve
// @desc    Resolve an alert (authority only)
// @access  Protected - Authority
router.put('/:alertId/resolve', authenticateAuthority, resolveAlert);

// @route   PUT /api/alerts/:alertId/dismiss
// @desc    Dismiss an alert (authority only)
// @access  Protected - Authority
router.put('/:alertId/dismiss', authenticateAuthority, dismissAlert);

// @route   GET /api/alerts/scheduler/status
// @desc    Get alert scheduler status
// @access  Protected - Authority
router.get('/scheduler/status', authenticateAuthority, (req, res) => {
  try {
    const status = alertScheduler.getStatus();
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error getting scheduler status',
      error: error.message
    });
  }
});

// @route   POST /api/alerts/scheduler/trigger
// @desc    Manually trigger scheduler checks
// @access  Protected - Authority
router.post('/scheduler/trigger', authenticateAuthority, async (req, res) => {
  try {
    const { checkType = 'all' } = req.body;

    await alertScheduler.triggerManualCheck(checkType);

    res.json({
      success: true,
      message: `Manual trigger completed: ${checkType}`,
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error triggering manual check',
      error: error.message
    });
  }
});

// @route   POST /api/alerts/scheduler/start
// @desc    Start alert scheduler
// @access  Protected - Authority
router.post('/scheduler/start', authenticateAuthority, (req, res) => {
  try {
    alertScheduler.start();
    res.json({
      success: true,
      message: 'Alert scheduler started successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error starting scheduler',
      error: error.message
    });
  }
});

// @route   POST /api/alerts/scheduler/stop
// @desc    Stop alert scheduler
// @access  Protected - Authority
router.post('/scheduler/stop', authenticateAuthority, (req, res) => {
  try {
    alertScheduler.stop();
    res.json({
      success: true,
      message: 'Alert scheduler stopped successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error stopping scheduler',
      error: error.message
    });
  }
});

module.exports = router;




