const express = require('express');
const router = express.Router();
const locationController = require('../controllers/locationController');
const enhancedLocationController = require('../controllers/enhancedLocationController');
const { authenticate, authenticateDriver, authenticateAuthority } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

// Rate limiting for location updates
const locationUpdateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // limit each driver to 100 location updates per minute
  keyGenerator: (req, res) => {
    // Use driver ID if available, otherwise fall back to IP
    return req.user?.driverId || req.ip;
  },
  message: {
    success: false,
    message: 'Too many location updates. Please reduce update frequency.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Legacy routes (backward compatibility)
router.post('/update', authenticateDriver, locationController.updateLocation);
router.get('/bus/:busId', locationController.getBusLocation);
router.get('/nearby', locationController.getNearbyBuses);

// Enhanced location routes (v2)
router.post('/v2/update',
  authenticateDriver,
  locationUpdateLimiter,
  enhancedLocationController.updateLocationAdvanced
);

router.get('/v2/bus/:busId', enhancedLocationController.getBusLocationAdvanced);
router.get('/v2/nearby', enhancedLocationController.getNearbyBusesAdvanced);

// Route optimization endpoints
router.get('/v2/route/:routeId/optimization', authenticate, async (req, res) => {
  try {
    const { routeId } = req.params;
    const { timeWindow = 24 } = req.query; // hours

    const Route = require('../models/Route');
    const Location = require('../models/Location');

    const route = await Route.findOne({ routeId }).populate('buses');
    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Route not found'
      });
    }

    // Get location data for route analysis
    const since = new Date(Date.now() - timeWindow * 60 * 60 * 1000);

    const routeAnalytics = await Location.aggregate([
      {
        $match: {
          createdAt: { $gte: since },
          'routeAnalysis.isOnRoute': true
        }
      },
      {
        $lookup: {
          from: 'buses',
          localField: 'bus',
          foreignField: '_id',
          as: 'busDetails'
        }
      },
      {
        $unwind: '$busDetails'
      },
      {
        $match: {
          'busDetails.route': route._id
        }
      },
      {
        $group: {
          _id: '$busDetails.busId',
          avgSpeed: { $avg: '$speed' },
          totalDistance: { $sum: '$locationAnalysis.distanceTraveled' },
          routeAdherence: {
            $avg: { $cond: ['$routeAnalysis.isOnRoute', 1, 0] }
          },
          passengerCount: { $avg: '$passengers.onboard' },
          updateCount: { $sum: 1 }
        }
      }
    ]);

    // Analyze stop efficiency
    const stopAnalytics = await Location.aggregate([
      {
        $match: {
          createdAt: { $gte: since },
          'geofenceEvents.0': { $exists: true }
        }
      },
      {
        $unwind: '$geofenceEvents'
      },
      {
        $group: {
          _id: '$geofenceEvents.stopId',
          visits: { $sum: 1 },
          avgDwellTime: { $avg: '$geofenceEvents.dwellTime' },
          totalPassengerActivity: {
            $sum: { $add: ['$passengers.boarded', '$passengers.alighted'] }
          }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        routeId,
        analysisWindow: `${timeWindow} hours`,
        performance: {
          busPerformance: routeAnalytics,
          stopEfficiency: stopAnalytics,
          recommendations: generateRouteRecommendations(routeAnalytics, stopAnalytics)
        }
      }
    });

  } catch (error) {
    console.error('Route optimization error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error analyzing route'
    });
  }
});

// Real-time tracking endpoints
router.get('/v2/tracking/:busId/stream', authenticate, async (req, res) => {
  try {
    const { busId } = req.params;

    // Set up Server-Sent Events for real-time tracking
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // Join tracking room for this bus
    const io = req.app.get('io');

    // Send initial bus location
    const bus = await require('../models/Bus').findOne({ busId });
    if (bus) {
      const latestLocation = await require('../models/Location')
        .findOne({ bus: bus._id })
        .sort({ createdAt: -1 });

      if (latestLocation) {
        res.write(`data: ${JSON.stringify({
          type: 'location',
          busId,
          location: {
            latitude: latestLocation.coordinates.coordinates[1],
            longitude: latestLocation.coordinates.coordinates[0],
            speed: latestLocation.speed,
            timestamp: latestLocation.createdAt
          }
        })}\n\n`);
      }
    }

    // Keep connection alive with heartbeat
    const heartbeat = setInterval(() => {
      res.write(`data: ${JSON.stringify({ type: 'heartbeat', timestamp: new Date() })}\n\n`);
    }, 30000);

    // Clean up on client disconnect
    req.on('close', () => {
      clearInterval(heartbeat);
      res.end();
    });

  } catch (error) {
    console.error('Tracking stream error:', error);
    res.status(500).json({
      success: false,
      message: 'Error setting up tracking stream'
    });
  }
});

// Geofence management
router.post('/v2/geofences', authenticateAuthority, async (req, res) => {
  try {
    const { name, type, coordinates, radius, routeId, alertSettings } = req.body;

    const Geofence = require('../models/Geofence');

    const geofence = new Geofence({
      name,
      type, // 'bus_stop', 'depot', 'restricted_area', 'school_zone'
      geometry: {
        type: type === 'circular' ? 'Point' : 'Polygon',
        coordinates: type === 'circular' ? coordinates : [coordinates]
      },
      radius: type === 'circular' ? radius : undefined,
      routeId,
      alertSettings: {
        onEntry: alertSettings?.onEntry || false,
        onExit: alertSettings?.onExit || false,
        dwellTimeAlert: alertSettings?.dwellTimeAlert || false,
        maxDwellTime: alertSettings?.maxDwellTime || 300 // 5 minutes
      },
      isActive: true
    });

    await geofence.save();

    res.status(201).json({
      success: true,
      message: 'Geofence created successfully',
      data: geofence
    });

  } catch (error) {
    console.error('Geofence creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating geofence'
    });
  }
});

// Historical location data
router.get('/v2/history/:busId', authenticate, async (req, res) => {
  try {
    const { busId } = req.params;
    const {
      startDate,
      endDate,
      granularity = 'hour', // minute, hour, day
      includeAnalytics = 'true'
    } = req.query;

    const bus = await require('../models/Bus').findOne({ busId });
    if (!bus) {
      return res.status(404).json({
        success: false,
        message: 'Bus not found'
      });
    }

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    // Aggregate location data based on granularity
    let groupBy;
    switch (granularity) {
      case 'minute':
        groupBy = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' },
          hour: { $hour: '$createdAt' },
          minute: { $minute: '$createdAt' }
        };
        break;
      case 'day':
        groupBy = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' }
        };
        break;
      default: // hour
        groupBy = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' },
          hour: { $hour: '$createdAt' }
        };
    }

    const locationHistory = await require('../models/Location').aggregate([
      {
        $match: {
          bus: bus._id,
          createdAt: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: groupBy,
          locations: {
            $push: {
              latitude: { $arrayElemAt: ['$coordinates.coordinates', 1] },
              longitude: { $arrayElemAt: ['$coordinates.coordinates', 0] },
              speed: '$speed',
              heading: '$heading',
              passengers: '$passengers.onboard',
              timestamp: '$createdAt'
            }
          },
          avgSpeed: { $avg: '$speed' },
          maxSpeed: { $max: '$speed' },
          totalDistance: { $sum: '$locationAnalysis.distanceTraveled' },
          avgPassengers: { $avg: '$passengers.onboard' },
          routeAdherence: { $avg: { $cond: ['$routeAnalysis.isOnRoute', 1, 0] } },
          updateCount: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.hour': 1, '_id.minute': 1 }
      }
    ]);

    const response = {
      success: true,
      data: {
        busId,
        period: { start, end },
        granularity,
        history: locationHistory
      }
    };

    if (includeAnalytics === 'true') {
      const analytics = calculateHistoricalAnalytics(locationHistory);
      response.data.analytics = analytics;
    }

    res.json(response);

  } catch (error) {
    console.error('Location history error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching location history'
    });
  }
});

// Fleet overview
router.get('/v2/fleet/overview', authenticateAuthority, async (req, res) => {
  try {
    const { includeOffline = 'false' } = req.query;

    // Get all active buses with their latest locations
    const fleetOverview = await require('../models/Bus').aggregate([
      {
        $match: {
          isActive: true,
          ...(includeOffline === 'false' && { operationalStatus: 'active' })
        }
      },
      {
        $lookup: {
          from: 'locations',
          let: { busId: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$bus', '$$busId'] } } },
            { $sort: { createdAt: -1 } },
            { $limit: 1 }
          ],
          as: 'latestLocation'
        }
      },
      {
        $unwind: {
          path: '$latestLocation',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: 'drivers',
          localField: 'currentDriver',
          foreignField: '_id',
          as: 'driverDetails'
        }
      },
      {
        $lookup: {
          from: 'routes',
          localField: 'route',
          foreignField: '_id',
          as: 'routeDetails'
        }
      },
      {
        $project: {
          busId: 1,
          registrationNumber: 1,
          capacity: 1,
          operationalStatus: 1,
          location: {
            $cond: {
              if: '$latestLocation',
              then: {
                latitude: { $arrayElemAt: ['$latestLocation.coordinates.coordinates', 1] },
                longitude: { $arrayElemAt: ['$latestLocation.coordinates.coordinates', 0] },
                speed: '$latestLocation.speed',
                lastUpdated: '$latestLocation.createdAt',
                dataQuality: '$latestLocation.dataQuality'
              },
              else: null
            }
          },
          passengers: '$latestLocation.passengers.onboard',
          driver: { $arrayElemAt: ['$driverDetails', 0] },
          route: { $arrayElemAt: ['$routeDetails', 0] }
        }
      }
    ]);

    // Calculate fleet statistics
    const now = new Date();
    const stats = {
      totalBuses: fleetOverview.length,
      activeBuses: fleetOverview.filter(bus =>
        bus.location && (now - new Date(bus.location.lastUpdated)) < 10 * 60 * 1000
      ).length, // Active within 10 minutes
      totalPassengers: fleetOverview.reduce((sum, bus) => sum + (bus.passengers || 0), 0),
      avgOccupancy: fleetOverview.reduce((sum, bus) => {
        return sum + (bus.passengers && bus.capacity ? (bus.passengers / bus.capacity) * 100 : 0);
      }, 0) / fleetOverview.length
    };

    res.json({
      success: true,
      data: {
        statistics: stats,
        fleet: fleetOverview,
        lastUpdated: new Date()
      }
    });

  } catch (error) {
    console.error('Fleet overview error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching fleet overview'
    });
  }
});

// Helper functions
function generateRouteRecommendations(busPerformance, stopEfficiency) {
  const recommendations = [];

  // Analyze bus performance
  busPerformance.forEach(bus => {
    if (bus.routeAdherence < 0.8) {
      recommendations.push({
        type: 'route_adherence',
        busId: bus._id,
        message: `Bus ${bus._id} has low route adherence (${Math.round(bus.routeAdherence * 100)}%). Consider driver training.`,
        priority: 'high'
      });
    }

    if (bus.avgSpeed < 15) {
      recommendations.push({
        type: 'speed_optimization',
        busId: bus._id,
        message: `Bus ${bus._id} has low average speed (${Math.round(bus.avgSpeed)} km/h). Review route for bottlenecks.`,
        priority: 'medium'
      });
    }
  });

  // Analyze stop efficiency
  stopEfficiency.forEach(stop => {
    if (stop.avgDwellTime > 180) { // 3 minutes
      recommendations.push({
        type: 'stop_efficiency',
        stopId: stop._id,
        message: `Stop ${stop._id} has high dwell time (${Math.round(stop.avgDwellTime / 60)} min). Consider passenger flow optimization.`,
        priority: 'medium'
      });
    }
  });

  return recommendations;
}

function calculateHistoricalAnalytics(locationHistory) {
  const totalEntries = locationHistory.length;

  if (totalEntries === 0) return null;

  const overallStats = locationHistory.reduce((acc, entry) => {
    acc.totalDistance += entry.totalDistance || 0;
    acc.avgSpeed += entry.avgSpeed || 0;
    acc.maxSpeed = Math.max(acc.maxSpeed, entry.maxSpeed || 0);
    acc.avgPassengers += entry.avgPassengers || 0;
    acc.routeAdherence += entry.routeAdherence || 0;
    acc.totalUpdates += entry.updateCount || 0;
    return acc;
  }, {
    totalDistance: 0,
    avgSpeed: 0,
    maxSpeed: 0,
    avgPassengers: 0,
    routeAdherence: 0,
    totalUpdates: 0
  });

  return {
    totalDistance: Math.round(overallStats.totalDistance),
    avgSpeed: Math.round(overallStats.avgSpeed / totalEntries),
    maxSpeed: overallStats.maxSpeed,
    avgPassengers: Math.round(overallStats.avgPassengers / totalEntries),
    routeAdherence: Math.round((overallStats.routeAdherence / totalEntries) * 100),
    totalDataPoints: overallStats.totalUpdates,
    dataQualityScore: Math.round((overallStats.totalUpdates / totalEntries) * 100)
  };
}

// Health check for enhanced location services
router.get('/v2/health', (req, res) => {
  res.json({
    success: true,
    message: 'Enhanced GPS location services are running',
    features: [
      'Advanced GPS tracking with route adherence',
      'Real-time ETA calculations',
      'Geofencing for bus stops',
      'Location history and analytics',
      'Fleet overview and monitoring',
      'Route optimization recommendations',
      'Real-time tracking streams',
      'Enhanced data quality monitoring'
    ],
    timestamp: new Date().toISOString()
  });
});

module.exports = router;