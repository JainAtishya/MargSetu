const express = require('express');
const router = express.Router();
const AnalyticsService = require('../services/analyticsService');
const { authenticate, authorize } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

// Rate limiting for analytics endpoints
const analyticsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each user to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many analytics requests, please try again later.'
  }
});

// Initialize analytics service
const analyticsService = new AnalyticsService();

// Fleet Performance Metrics
router.get('/fleet/performance', 
  authenticate, 
  authorize(['authority', 'admin']), 
  analyticsLimiter,
  async (req, res) => {
    try {
      const { timeWindow = 24 } = req.query;
      
      if (timeWindow < 1 || timeWindow > 168) {
        return res.status(400).json({
          success: false,
          message: 'Time window must be between 1 and 168 hours'
        });
      }

      const metrics = await analyticsService.getFleetPerformanceMetrics(parseInt(timeWindow));
      
      res.json({
        success: true,
        data: metrics
      });

    } catch (error) {
      console.error('Fleet performance analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching fleet performance metrics'
      });
    }
  }
);

// Route Analytics
router.get('/routes/:routeId/performance', 
  authenticate, 
  authorize(['authority', 'admin']),
  analyticsLimiter,
  async (req, res) => {
    try {
      const { routeId } = req.params;
      const { timeWindow = 24 } = req.query;

      if (timeWindow < 1 || timeWindow > 168) {
        return res.status(400).json({
          success: false,
          message: 'Time window must be between 1 and 168 hours'
        });
      }

      const analytics = await analyticsService.getRouteAnalytics(routeId, parseInt(timeWindow));
      
      res.json({
        success: true,
        data: analytics
      });

    } catch (error) {
      console.error('Route analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching route analytics'
      });
    }
  }
);

// Real-time Dashboard Metrics
router.get('/dashboard', 
  authenticate, 
  authorize(['authority', 'admin']),
  async (req, res) => {
    try {
      const metrics = await analyticsService.getDashboardMetrics();
      
      res.json({
        success: true,
        data: metrics
      });

    } catch (error) {
      console.error('Dashboard metrics error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching dashboard metrics'
      });
    }
  }
);

// Historical Trends
router.get('/trends', 
  authenticate, 
  authorize(['authority', 'admin']),
  analyticsLimiter,
  async (req, res) => {
    try {
      const { timeWindow = 168 } = req.query; // Default 1 week
      
      if (timeWindow < 24 || timeWindow > 720) { // Max 30 days
        return res.status(400).json({
          success: false,
          message: 'Time window must be between 24 and 720 hours (1-30 days)'
        });
      }

      const trends = await analyticsService.getTrendAnalysis(parseInt(timeWindow));
      
      res.json({
        success: true,
        data: trends
      });

    } catch (error) {
      console.error('Trend analysis error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching trend analysis'
      });
    }
  }
);

// Predictive Analytics
router.get('/predictions', 
  authenticate, 
  authorize(['authority', 'admin']),
  analyticsLimiter,
  async (req, res) => {
    try {
      const { routeId = null } = req.query;
      
      const predictions = await analyticsService.getPredictiveInsights(routeId);
      
      res.json({
        success: true,
        data: predictions
      });

    } catch (error) {
      console.error('Predictive analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Error generating predictions'
      });
    }
  }
);

// Route-specific predictions
router.get('/routes/:routeId/predictions', 
  authenticate, 
  authorize(['authority', 'admin']),
  analyticsLimiter,
  async (req, res) => {
    try {
      const { routeId } = req.params;
      
      const predictions = await analyticsService.getPredictiveInsights(routeId);
      
      res.json({
        success: true,
        data: predictions
      });

    } catch (error) {
      console.error('Route predictions error:', error);
      res.status(500).json({
        success: false,
        message: 'Error generating route predictions'
      });
    }
  }
);

// Bus-specific analytics
router.get('/buses/:busId/analytics', 
  authenticate, 
  authorize(['authority', 'admin', 'driver']),
  async (req, res) => {
    try {
      const { busId } = req.params;
      const { timeWindow = 24 } = req.query;

      const Bus = require('../models/Bus');
      const Location = require('../models/Location');

      const bus = await Bus.findOne({ busId });
      if (!bus) {
        return res.status(404).json({
          success: false,
          message: 'Bus not found'
        });
      }

      const since = new Date(Date.now() - timeWindow * 60 * 60 * 1000);

      const busAnalytics = await Location.aggregate([
        {
          $match: {
            bus: bus._id,
            createdAt: { $gte: since }
          }
        },
        {
          $group: {
            _id: null,
            totalDistance: { $sum: '$locationAnalysis.distanceTraveled' },
            averageSpeed: { $avg: '$speed' },
            maxSpeed: { $max: '$speed' },
            routeAdherence: { $avg: { $cond: ['$routeAnalysis.isOnRoute', 1, 0] } },
            totalPassengers: { $sum: '$passengers.onboard' },
            passengersBoarded: { $sum: '$passengers.boarded' },
            passengersAlighted: { $sum: '$passengers.alighted' },
            alertCount: { $sum: { $size: { $ifNull: ['$alerts', []] } } },
            updateCount: { $sum: 1 },
            firstUpdate: { $min: '$createdAt' },
            lastUpdate: { $max: '$createdAt' }
          }
        }
      ]);

      const analytics = busAnalytics[0];
      
      if (!analytics) {
        return res.json({
          success: true,
          data: {
            busId,
            message: 'No data available for this time period',
            timeWindow: `${timeWindow} hours`
          }
        });
      }

      // Calculate operational hours
      const operationalHours = analytics.firstUpdate && analytics.lastUpdate ?
        (analytics.lastUpdate - analytics.firstUpdate) / (1000 * 60 * 60) : 0;

      const result = {
        busId,
        timeWindow: `${timeWindow} hours`,
        summary: {
          operationalHours: Math.round(operationalHours * 10) / 10,
          totalDistance: Math.round(analytics.totalDistance * 10) / 10,
          averageSpeed: Math.round(analytics.averageSpeed * 10) / 10,
          maxSpeed: Math.round(analytics.maxSpeed * 10) / 10,
          routeAdherence: Math.round(analytics.routeAdherence * 100),
          fuelEfficiency: operationalHours > 0 ? 
            Math.round((analytics.totalDistance / operationalHours) * 10) / 10 : 0,
          dataQuality: Math.round((analytics.updateCount / (timeWindow * 60)) * 100) // Updates per minute
        },
        passengerMetrics: {
          totalBoarded: analytics.passengersBoarded,
          totalAlighted: analytics.passengersAlighted,
          netPassengerFlow: analytics.passengersBoarded - analytics.passengersAlighted,
          averageOccupancy: Math.round(analytics.totalPassengers / analytics.updateCount)
        },
        performance: {
          alertsGenerated: analytics.alertCount,
          alertsPerHour: operationalHours > 0 ? 
            Math.round((analytics.alertCount / operationalHours) * 10) / 10 : 0,
          dataUpdates: analytics.updateCount,
          reliability: analytics.updateCount > timeWindow * 2 ? 'High' : 
                      analytics.updateCount > timeWindow ? 'Medium' : 'Low'
        }
      };

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('Bus analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching bus analytics'
      });
    }
  }
);

// System health and performance
router.get('/system/health', 
  authenticate, 
  authorize(['admin']),
  async (req, res) => {
    try {
      const mongoose = require('mongoose');
      
      // Database health
      const dbHealth = {
        connected: mongoose.connection.readyState === 1,
        state: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState],
        host: mongoose.connection.host,
        name: mongoose.connection.name
      };

      // Collection statistics
      const collections = ['buses', 'locations', 'users', 'routes', 'alerts'];
      const collectionStats = {};

      for (const collection of collections) {
        try {
          const stats = await mongoose.connection.db.collection(collection).stats();
          collectionStats[collection] = {
            count: stats.count,
            size: Math.round(stats.size / 1024), // KB
            avgObjSize: Math.round(stats.avgObjSize)
          };
        } catch (error) {
          collectionStats[collection] = { error: 'Unable to fetch stats' };
        }
      }

      // System metrics
      const systemMetrics = {
        uptime: process.uptime(),
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024), // MB
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024), // MB
          external: Math.round(process.memoryUsage().external / 1024 / 1024) // MB
        },
        cpu: {
          platform: process.platform,
          arch: process.arch,
          nodeVersion: process.version
        }
      };

      // Recent activity
      const Location = require('../models/Location');
      const last5Minutes = new Date(Date.now() - 5 * 60 * 1000);
      
      const recentActivity = await Location.aggregate([
        {
          $match: {
            createdAt: { $gte: last5Minutes }
          }
        },
        {
          $group: {
            _id: null,
            locationUpdates: { $sum: 1 },
            uniqueBuses: { $addToSet: '$bus' },
            lastUpdate: { $max: '$createdAt' }
          }
        }
      ]);

      const activity = recentActivity[0] || {};

      res.json({
        success: true,
        data: {
          timestamp: new Date().toISOString(),
          database: dbHealth,
          collections: collectionStats,
          system: systemMetrics,
          activity: {
            recentLocationUpdates: activity.locationUpdates || 0,
            activeBuses: activity.uniqueBuses ? activity.uniqueBuses.length : 0,
            lastLocationUpdate: activity.lastUpdate || null
          }
        }
      });

    } catch (error) {
      console.error('System health check error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching system health metrics'
      });
    }
  }
);

// Export analytics data
router.get('/export', 
  authenticate, 
  authorize(['authority', 'admin']),
  analyticsLimiter,
  async (req, res) => {
    try {
      const { 
        type = 'fleet', 
        format = 'json', 
        timeWindow = 24,
        routeId = null 
      } = req.query;

      if (!['fleet', 'route', 'trends'].includes(type)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid export type. Use: fleet, route, or trends'
        });
      }

      if (!['json', 'csv'].includes(format)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid format. Use: json or csv'
        });
      }

      let data;
      switch (type) {
        case 'fleet':
          data = await analyticsService.getFleetPerformanceMetrics(parseInt(timeWindow));
          break;
        case 'route':
          if (!routeId) {
            return res.status(400).json({
              success: false,
              message: 'Route ID required for route export'
            });
          }
          data = await analyticsService.getRouteAnalytics(routeId, parseInt(timeWindow));
          break;
        case 'trends':
          data = await analyticsService.getTrendAnalysis(parseInt(timeWindow));
          break;
      }

      if (format === 'csv') {
        // Convert to CSV format
        const csv = convertToCSV(data, type);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="analytics_${type}_${Date.now()}.csv"`);
        res.send(csv);
      } else {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="analytics_${type}_${Date.now()}.json"`);
        res.json({
          success: true,
          exportedAt: new Date().toISOString(),
          type,
          data
        });
      }

    } catch (error) {
      console.error('Analytics export error:', error);
      res.status(500).json({
        success: false,
        message: 'Error exporting analytics data'
      });
    }
  }
);

// Helper function to convert data to CSV
function convertToCSV(data, type) {
  try {
    switch (type) {
      case 'fleet':
        const fleetHeaders = 'Metric,Value\n';
        const fleetRows = [
          `Fleet Size,${data.fleetSize}`,
          `Total Distance,${data.operationalMetrics.totalDistance}`,
          `Average Speed,${data.operationalMetrics.averageSpeed}`,
          `Route Adherence,${data.operationalMetrics.routeAdherence}%`,
          `Average Occupancy,${data.operationalMetrics.averageOccupancy}%`,
          `Total Passenger Trips,${data.passengerMetrics.totalTrips}`,
          `Alerts Generated,${data.safetyMetrics.alertsGenerated}`
        ].join('\n');
        return fleetHeaders + fleetRows;

      case 'route':
        const routeHeaders = 'Bus ID,Distance,Speed,Adherence,Passenger Activity,Alerts,Performance Rating\n';
        const routeRows = data.busPerformance.map(bus => 
          `${bus.busId},${bus.distance},${bus.speed},${Math.round(bus.adherence * 100)}%,${bus.passengerActivity},${bus.alerts},${bus.performanceRating}`
        ).join('\n');
        return routeHeaders + routeRows;

      case 'trends':
        const trendHeaders = 'Timestamp,Speed,Distance,Passengers,Adherence,Active Buses\n';
        const trendRows = data.trends.map(trend =>
          `${trend.timestamp},${trend.metrics.speed},${trend.metrics.distance},${trend.metrics.passengers},${trend.metrics.adherence}%,${trend.metrics.activeBuses}`
        ).join('\n');
        return trendHeaders + trendRows;

      default:
        return JSON.stringify(data, null, 2);
    }
  } catch (error) {
    console.error('CSV conversion error:', error);
    return JSON.stringify(data, null, 2);
  }
}

// Analytics health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Analytics service is running',
    features: [
      'Fleet performance metrics',
      'Route analytics and optimization',
      'Real-time dashboard metrics',
      'Historical trend analysis',
      'Predictive insights',
      'Bus-specific analytics',
      'System health monitoring',
      'Data export capabilities'
    ],
    timestamp: new Date().toISOString()
  });
});

module.exports = router;