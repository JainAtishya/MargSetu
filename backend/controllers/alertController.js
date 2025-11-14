const { Alert, Bus, Driver, Location } = require('../models');
const { generateAlertId, formatEmergencyContact, getISTTime } = require('../utils/helpers');

// Manual SOS Alert - triggered by driver panic button
const createSOSAlert = async (req, res) => {
  try {
    const {
      busId,
      latitude,
      longitude,
      description = 'Emergency SOS Alert - Immediate assistance required',
      tripId,
      passengers = 0,
      deviceInfo = {}
    } = req.body;

    const driver = req.user;

    // Verify driver is authorized for this bus
    const bus = await Bus.findOne({ busId }).populate('route', 'name');

    if (!bus) {
      return res.status(404).json({
        success: false,
        message: 'Bus not found'
      });
    }

    // For SOS alerts, be more lenient with bus assignment validation
    // In emergency situations, allow SOS even if bus assignment might be outdated
    if (!driver.currentBus || driver.currentBus.toString() !== bus._id.toString()) {
      console.log(`⚠️ [SOS] Driver ${driver.driverId} sending SOS for bus ${busId} but assigned to ${driver.currentBus} - allowing for emergency`);
    }

    // Create SOS alert
    const alert = new Alert({
      type: 'sos',
      severity: 'critical',
      title: `🚨 EMERGENCY SOS - Bus ${busId}`,
      description: `${description}\n\nDriver: ${driver.name} (${driver.driverId})\nPhone: ${driver.phone}\nBus: ${bus.busId} (${bus.registrationNumber})\nRoute: ${bus.route?.name || 'Unknown'}\nPassengers: ${passengers}`,
      bus: bus._id,
      driver: driver._id,
      route: bus.route?._id,
      location: {
        coordinates: {
          type: 'Point',
          coordinates: [longitude, latitude]
        }
      },
      priority: 10, // Maximum priority
      metadata: {
        tripId,
        passengers,
        deviceInfo: {
          batteryLevel: deviceInfo.batteryLevel,
          networkStrength: deviceInfo.networkStrength,
          appVersion: deviceInfo.appVersion
        }
      },
      tags: ['emergency', 'sos', 'critical']
    });

    await alert.save();

    // Update bus location with SOS flag
    await bus.updateLocation(latitude, longitude, 0, 0);

    // Record location with SOS flag
    const locationRecord = new Location({
      bus: bus._id,
      driver: driver._id,
      tripId: tripId || `SOS_${Date.now()}`,
      coordinates: {
        type: 'Point',
        coordinates: [longitude, latitude]
      },
      speed: 0,
      accuracy: deviceInfo.accuracy || 10,
      passengers: { onboard: passengers },
      deviceInfo,
      source: 'manual', // Changed from 'sos' to 'manual' for enum compliance
      isManual: true
    });

    await locationRecord.save();

    // Send real-time notifications via Socket.IO
    const io = req.app.get('io');

    // Critical alert to all authorities
    io.to('authority-dashboard').emit('criticalAlert', {
      alertId: alert.alertId,
      type: 'sos',
      severity: 'critical',
      busId,
      driverId: driver.driverId,
      driverName: driver.name,
      driverPhone: driver.phone,
      location: {
        latitude,
        longitude
      },
      passengers,
      timestamp: alert.createdAt,
      emergencyContact: driver.emergencyContact ?
        formatEmergencyContact(driver.emergencyContact) : null,
      message: 'IMMEDIATE RESPONSE REQUIRED'
    });

    // Send to specific bus passengers (if any are connected)
    io.to(`bus-${busId}`).emit('emergencyAlert', {
      type: 'sos',
      message: 'Emergency alert activated. Help is on the way.',
      timestamp: alert.createdAt
    });

    // Initiate automated response sequence
    await initiateEmergencyResponse(alert, driver, bus);

    res.status(201).json({
      success: true,
      message: 'SOS Alert created successfully. Emergency response initiated.',
      data: {
        alertId: alert.alertId,
        timestamp: alert.createdAt,
        location: { latitude, longitude },
        emergencyContacts: {
          driver: driver.phone,
          emergency: driver.emergencyContact?.phone || 'Not available'
        },
        responseTime: 'Authorities notified immediately'
      }
    });

  } catch (error) {
    console.error('Create SOS alert error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating SOS alert'
    });
  }
};

// Get all alerts for authorities
const getAllAlerts = async (req, res) => {
  try {
    const {
      type,
      severity,
      status = 'active,acknowledged,in_progress',
      page = 1,
      limit = 20,
      busId,
      driverId
    } = req.query;

    const skip = (page - 1) * limit;
    const statusArray = status.split(',');

    // Build filter
    const filter = { status: { $in: statusArray } };
    if (type) filter.type = type;
    if (severity) filter.severity = severity;
    if (busId) {
      const bus = await Bus.findOne({ busId });
      if (bus) filter.bus = bus._id;
    }
    if (driverId) {
      const driver = await Driver.findOne({ driverId });
      if (driver) filter.driver = driver._id;
    }

    const alerts = await Alert.find(filter)
      .populate('bus', 'busId registrationNumber')
      .populate('driver', 'driverId name phone')
      .populate('route', 'routeId name')
      .populate('acknowledgedBy.authority', 'name username')
      .populate('resolvedBy.authority', 'name username')
      .sort({ priority: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Alert.countDocuments(filter);

    // Add calculated fields
    const enrichedAlerts = alerts.map(alert => ({
      ...alert.toObject(),
      ageMinutes: alert.ageInMinutes,
      responseTime: alert.responseTimeInMinutes,
      resolutionTime: alert.resolutionTimeInMinutes
    }));

    res.json({
      success: true,
      data: {
        alerts: enrichedAlerts,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(total / limit),
          hasNext: skip + alerts.length < total,
          hasPrev: page > 1
        },
        summary: {
          total,
          critical: await Alert.countDocuments({ ...filter, severity: 'critical' }),
          active: await Alert.countDocuments({ ...filter, status: 'active' }),
          acknowledged: await Alert.countDocuments({ ...filter, status: 'acknowledged' }),
          resolved: await Alert.countDocuments({ ...filter, status: 'resolved' })
        }
      }
    });

  } catch (error) {
    console.error('Get all alerts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving alerts'
    });
  }
};

// Acknowledge alert - for authorities
const acknowledgeAlert = async (req, res) => {
  try {
    const { alertId } = req.params;
    const { notes = '' } = req.body;
    const authority = req.user;

    const alert = await Alert.findOne({ alertId })
      .populate('bus', 'busId registrationNumber')
      .populate('driver', 'driverId name phone');

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    if (alert.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Alert has already been acknowledged or resolved'
      });
    }

    // Acknowledge the alert
    await alert.acknowledge(authority._id, notes);

    // Send real-time update
    const io = req.app.get('io');
    io.to('authority-dashboard').emit('alertAcknowledged', {
      alertId: alert.alertId,
      acknowledgedBy: authority.name,
      acknowledgedAt: new Date(),
      notes
    });

    // Notify driver if it's an SOS alert
    if (alert.type === 'sos') {
      io.to(`bus-${alert.bus.busId}`).emit('sosAcknowledged', {
        message: `Your emergency alert has been acknowledged by ${authority.name}. Help is on the way.`,
        acknowledgedBy: authority.name,
        timestamp: new Date()
      });
    }

    res.json({
      success: true,
      message: 'Alert acknowledged successfully',
      data: {
        alertId: alert.alertId,
        acknowledgedBy: authority.name,
        acknowledgedAt: alert.acknowledgedBy.acknowledgedAt,
        responseTime: alert.responseTimeInMinutes
      }
    });

  } catch (error) {
    console.error('Acknowledge alert error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error acknowledging alert'
    });
  }
};

// Resolve alert - for authorities
const resolveAlert = async (req, res) => {
  try {
    const { alertId } = req.params;
    const { resolution, actionTaken = '' } = req.body;
    const authority = req.user;

    if (!resolution) {
      return res.status(400).json({
        success: false,
        message: 'Resolution description is required'
      });
    }

    const alert = await Alert.findOne({ alertId })
      .populate('bus', 'busId registrationNumber')
      .populate('driver', 'driverId name phone');

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    if (alert.status === 'resolved') {
      return res.status(400).json({
        success: false,
        message: 'Alert has already been resolved'
      });
    }

    // Resolve the alert
    await alert.resolve(authority._id, resolution, actionTaken);

    // Send real-time update
    const io = req.app.get('io');
    io.to('authority-dashboard').emit('alertResolved', {
      alertId: alert.alertId,
      resolvedBy: authority.name,
      resolvedAt: new Date(),
      resolution
    });

    // Notify driver
    if (alert.type === 'sos') {
      io.to(`bus-${alert.bus.busId}`).emit('sosResolved', {
        message: `Your emergency alert has been resolved: ${resolution}`,
        resolvedBy: authority.name,
        timestamp: new Date()
      });
    }

    res.json({
      success: true,
      message: 'Alert resolved successfully',
      data: {
        alertId: alert.alertId,
        resolvedBy: authority.name,
        resolvedAt: alert.resolvedBy.resolvedAt,
        resolution,
        totalTime: alert.resolutionTimeInMinutes
      }
    });

  } catch (error) {
    console.error('Resolve alert error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error resolving alert'
    });
  }
};

// Get critical alerts - for authorities dashboard
const getCriticalAlerts = async (req, res) => {
  try {
    const criticalAlerts = await Alert.getCriticalAlerts();

    res.json({
      success: true,
      data: {
        alerts: criticalAlerts,
        count: criticalAlerts.length,
        requiresImmediateAttention: criticalAlerts.filter(alert =>
          alert.type === 'sos' && alert.ageInMinutes < 30
        ).length
      }
    });

  } catch (error) {
    console.error('Get critical alerts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving critical alerts'
    });
  }
};

// Check for idle buses and create alerts automatically
const checkIdleBuses = async () => {
  try {
    console.log('🔍 Checking for idle buses...');

    // Find all active buses that should be running
    const activeBuses = await Bus.find({
      isActive: true,
      status: 'active',
      operationalStatus: { $in: ['running', 'break'] },
      currentDriver: { $ne: null }
    }).populate('currentDriver', 'driverId name phone');

    const idleThresholdMinutes = 20;
    const currentTime = new Date();

    for (const bus of activeBuses) {
      // Get recent locations for this bus
      const recentLocations = await Location.find({
        bus: bus._id,
        createdAt: { $gte: new Date(currentTime - 30 * 60 * 1000) } // Last 30 minutes
      }).sort({ createdAt: -1 }).limit(10);

      if (recentLocations.length === 0) {
        // No location data in last 30 minutes
        await createIdleAlert(bus, 'No location data received for 30+ minutes', 'no_data');
        continue;
      }

      // Check if bus has been idle (speed < 2 km/h for 20+ minutes)
      const idleLocations = recentLocations.filter(loc =>
        loc.speed <= 2 && (currentTime - loc.createdAt) >= idleThresholdMinutes * 60 * 1000
      );

      if (idleLocations.length >= 3) { // Need at least 3 idle data points
        const latestLocation = recentLocations[0];
        const idleDuration = Math.floor((currentTime - latestLocation.createdAt) / (1000 * 60));

        // Check if we already have an active idle alert for this bus
        const existingIdleAlert = await Alert.findOne({
          bus: bus._id,
          type: 'idle',
          status: { $in: ['active', 'acknowledged'] },
          createdAt: { $gte: new Date(currentTime - 2 * 60 * 60 * 1000) } // Within last 2 hours
        });

        if (!existingIdleAlert && idleDuration >= idleThresholdMinutes) {
          await createIdleAlert(
            bus,
            `Bus has been idle for ${idleDuration} minutes. Last speed: ${latestLocation.speed} km/h`,
            'stationary',
            latestLocation
          );
        }
      }
    }

    console.log('✅ Idle bus check completed');

  } catch (error) {
    console.error('❌ Error checking idle buses:', error);
  }
};

// Helper function to create idle bus alert
const createIdleAlert = async (bus, description, subType, location = null) => {
  try {
    // Check if there's already a recent idle alert for this bus
    const existingAlert = await Alert.findOne({
      bus: bus._id,
      type: 'idle',
      status: { $in: ['active', 'acknowledged'] },
      createdAt: { $gte: new Date(Date.now() - 2 * 60 * 60 * 1000) } // Last 2 hours
    });

    if (existingAlert) {
      console.log(`⚠️ Idle alert already exists for bus ${bus.busId}`);
      return;
    }

    const alert = new Alert({
      type: 'idle',
      severity: 'medium',
      title: `🚌 Idle Bus Alert - ${bus.busId}`,
      description: `${description}\n\nBus: ${bus.busId} (${bus.registrationNumber})\nDriver: ${bus.currentDriver?.name} (${bus.currentDriver?.driverId})\nLast Status: ${bus.operationalStatus}`,
      bus: bus._id,
      driver: bus.currentDriver?._id,
      route: bus.route,
      location: location ? {
        coordinates: {
          type: 'Point',
          coordinates: [location.longitude, location.latitude]
        }
      } : {
        coordinates: bus.currentLocation.coordinates
      },
      priority: 6,
      metadata: {
        idleType: subType,
        lastSpeed: location?.speed || 0,
        operationalStatus: bus.operationalStatus
      },
      tags: ['idle', 'monitoring', 'automated']
    });

    await alert.save();

    // Send real-time notification to authorities
    const io = require('../server').io;
    if (io) {
      io.to('authority-dashboard').emit('idleAlert', {
        alertId: alert.alertId,
        type: 'idle',
        severity: 'medium',
        busId: bus.busId,
        driverId: bus.currentDriver?.driverId,
        driverName: bus.currentDriver?.name,
        description,
        location: location ? {
          latitude: location.latitude,
          longitude: location.longitude
        } : null,
        timestamp: alert.createdAt
      });
    }

    console.log(`🚨 Created idle alert for bus ${bus.busId}: ${alert.alertId}`);

  } catch (error) {
    console.error('Error creating idle alert:', error);
  }
};

// Helper function to initiate emergency response
const initiateEmergencyResponse = async (alert, driver, bus) => {
  try {
    // Log emergency response initiation
    console.log(`🚨 EMERGENCY RESPONSE INITIATED for Alert ${alert.alertId}`);

    // Here you would integrate with:
    // 1. SMS service to send alerts to emergency contacts
    // 2. Email notifications to supervisors
    // 3. Push notifications to mobile apps
    // 4. Integration with local emergency services (if configured)

    // Add emergency response tracking
    alert.metadata.emergencyResponseInitiated = true;
    alert.metadata.responseInitiatedAt = new Date();
    await alert.save();

    // Auto-escalate after 5 minutes if not acknowledged
    setTimeout(async () => {
      const updatedAlert = await Alert.findById(alert._id);
      if (updatedAlert && updatedAlert.status === 'active') {
        await updatedAlert.escalate();
        console.log(`🔄 Alert ${alert.alertId} escalated due to no response`);
      }
    }, 5 * 60 * 1000); // 5 minutes

  } catch (error) {
    console.error('Error initiating emergency response:', error);
  }
};

// Get alert statistics for dashboard
const getAlertStatistics = async (req, res) => {
  try {
    const { timeRange = '24h' } = req.query;

    let startDate;
    switch (timeRange) {
      case '1h':
        startDate = new Date(Date.now() - 60 * 60 * 1000);
        break;
      case '24h':
        startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    }

    const stats = await Alert.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          sos: { $sum: { $cond: [{ $eq: ['$type', 'sos'] }, 1, 0] } },
          idle: { $sum: { $cond: [{ $eq: ['$type', 'idle'] }, 1, 0] } },
          breakdown: { $sum: { $cond: [{ $eq: ['$type', 'breakdown'] }, 1, 0] } },
          critical: { $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] } },
          active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
          resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } }
        }
      }
    ]);

    const result = stats[0] || {
      total: 0, sos: 0, idle: 0, breakdown: 0,
      critical: 0, active: 0, resolved: 0
    };

    // Calculate average response time
    const acknowledgedAlerts = await Alert.find({
      createdAt: { $gte: startDate },
      'acknowledgedBy.acknowledgedAt': { $exists: true }
    });

    const avgResponseTime = acknowledgedAlerts.length > 0 ?
      acknowledgedAlerts.reduce((sum, alert) => sum + (alert.responseTimeInMinutes || 0), 0) / acknowledgedAlerts.length : 0;

    res.json({
      success: true,
      data: {
        timeRange,
        period: { start: startDate, end: new Date() },
        statistics: {
          ...result,
          averageResponseTime: Math.round(avgResponseTime * 100) / 100,
          responseRate: result.total > 0 ? Math.round((acknowledgedAlerts.length / result.total) * 100) : 0
        }
      }
    });

  } catch (error) {
    console.error('Get alert statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving alert statistics'
    });
  }
};

module.exports = {
  createSOSAlert,
  getAlerts: getAllAlerts,
  acknowledgeAlert,
  resolveAlert,
  dismissAlert: async (req, res) => {
    try {
      const { alertId } = req.params;
      const { reason = 'No action required' } = req.body;
      const authority = req.user;

      const alert = await Alert.findOne({ alertId });
      if (!alert) {
        return res.status(404).json({
          success: false,
          message: 'Alert not found'
        });
      }

      if (alert.status === 'resolved') {
        return res.status(400).json({
          success: false,
          message: 'Alert has already been resolved'
        });
      }

      alert.status = 'dismissed';
      alert.resolvedBy = {
        authority: authority._id,
        resolvedAt: new Date(),
        resolution: reason,
        actionTaken: 'Alert dismissed'
      };

      await alert.save();

      const io = req.app.get('io');
      io.to('authority-dashboard').emit('alertDismissed', {
        alertId: alert.alertId,
        dismissedBy: authority.name,
        reason
      });

      res.json({
        success: true,
        message: 'Alert dismissed successfully',
        data: { alertId: alert.alertId, reason }
      });

    } catch (error) {
      console.error('Dismiss alert error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error dismissing alert'
      });
    }
  },
  getAlertById: async (req, res) => {
    try {
      const { alertId } = req.params;

      const alert = await Alert.findOne({ alertId })
        .populate('bus', 'busId registrationNumber currentLocation')
        .populate('driver', 'driverId name phone emergencyContact')
        .populate('route', 'routeId name startPoint endPoint')
        .populate('acknowledgedBy.authority', 'name username')
        .populate('resolvedBy.authority', 'name username');

      if (!alert) {
        return res.status(404).json({
          success: false,
          message: 'Alert not found'
        });
      }

      // Check if user has permission to view this alert
      if (req.user.role === 'driver' && alert.driver._id.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only view your own alerts.'
        });
      }

      res.json({
        success: true,
        data: {
          ...alert.toObject(),
          ageMinutes: alert.ageInMinutes,
          responseTime: alert.responseTimeInMinutes,
          resolutionTime: alert.resolutionTimeInMinutes
        }
      });

    } catch (error) {
      console.error('Get alert by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error retrieving alert'
      });
    }
  },
  getAlertStats: getAlertStatistics,
  triggerManualIdleCheck: async (req, res) => {
    try {
      console.log('🔧 Manual idle check triggered by authority:', req.user.username);
      await checkIdleBuses();

      res.json({
        success: true,
        message: 'Manual idle bus check completed successfully',
        timestamp: new Date()
      });

    } catch (error) {
      console.error('Manual idle check error:', error);
      res.status(500).json({
        success: false,
        message: 'Error performing manual idle check',
        error: error.message
      });
    }
  },
  getAlertHistory: async (req, res) => {
    try {
      const {
        days = 30,
        type,
        severity,
        busId,
        driverId,
        page = 1,
        limit = 50
      } = req.query;

      const skip = (page - 1) * limit;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));

      const filter = {
        createdAt: { $gte: startDate },
        status: { $in: ['resolved', 'dismissed'] }
      };

      if (type) filter.type = type;
      if (severity) filter.severity = severity;
      if (busId) {
        const bus = await Bus.findOne({ busId });
        if (bus) filter.bus = bus._id;
      }
      if (driverId) {
        const driver = await Driver.findOne({ driverId });
        if (driver) filter.driver = driver._id;
      }

      const alerts = await Alert.find(filter)
        .populate('bus', 'busId registrationNumber')
        .populate('driver', 'driverId name')
        .populate('route', 'routeId name')
        .populate('resolvedBy.authority', 'name username')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Alert.countDocuments(filter);

      res.json({
        success: true,
        data: {
          alerts: alerts.map(alert => ({
            ...alert.toObject(),
            responseTime: alert.responseTimeInMinutes,
            resolutionTime: alert.resolutionTimeInMinutes
          })),
          pagination: {
            current: parseInt(page),
            total: Math.ceil(total / limit),
            hasNext: skip + alerts.length < total,
            hasPrev: page > 1
          },
          summary: {
            total,
            timeRange: `${days} days`,
            period: { start: startDate, end: new Date() }
          }
        }
      });

    } catch (error) {
      console.error('Get alert history error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error retrieving alert history'
      });
    }
  },
  checkIdleBuses
};