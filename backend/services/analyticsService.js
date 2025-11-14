const mongoose = require('mongoose');

class AnalyticsService {
  constructor() {
    this.Bus = mongoose.model('Bus');
    this.Location = mongoose.model('Location');
    this.User = mongoose.model('User');
    this.Route = mongoose.model('Route');
    this.Alert = mongoose.model('Alert');
  }

  // Fleet Performance Analytics
  async getFleetPerformanceMetrics(timeWindow = 24) {
    try {
      const since = new Date(Date.now() - timeWindow * 60 * 60 * 1000);
      
      const fleetMetrics = await this.Location.aggregate([
        {
          $match: {
            createdAt: { $gte: since }
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
          $group: {
            _id: null,
            totalBuses: { $addToSet: '$busDetails.busId' },
            totalDistanceTraveled: { $sum: '$locationAnalysis.distanceTraveled' },
            averageSpeed: { $avg: '$speed' },
            totalPassengerTrips: { $sum: { $add: ['$passengers.boarded', '$passengers.alighted'] } },
            averageOccupancy: { $avg: { $divide: ['$passengers.onboard', '$busDetails.capacity'] } },
            routeAdherenceScore: { $avg: { $cond: ['$routeAnalysis.isOnRoute', 1, 0] } },
            fuelEfficiencyData: {
              $push: {
                busId: '$busDetails.busId',
                distance: '$locationAnalysis.distanceTraveled',
                fuelUsed: '$busDetails.fuelLevel' // Assuming fuel consumption tracking
              }
            },
            alertCounts: {
              $sum: { $size: { $ifNull: ['$alerts', []] } }
            }
          }
        },
        {
          $project: {
            activeBusCount: { $size: '$totalBuses' },
            totalDistanceTraveled: { $round: ['$totalDistanceTraveled', 2] },
            averageSpeed: { $round: ['$averageSpeed', 1] },
            totalPassengerTrips: 1,
            averageOccupancyPercentage: { $round: [{ $multiply: ['$averageOccupancy', 100] }, 1] },
            routeAdherencePercentage: { $round: [{ $multiply: ['$routeAdherenceScore', 100] }, 1] },
            alertsGenerated: '$alertCounts'
          }
        }
      ]);

      // Calculate operational efficiency
      const operationalHours = timeWindow;
      const metrics = fleetMetrics[0] || {};
      
      return {
        timeWindow: `${timeWindow} hours`,
        fleetSize: metrics.activeBusCount || 0,
        operationalMetrics: {
          totalDistance: metrics.totalDistanceTraveled || 0,
          averageSpeed: metrics.averageSpeed || 0,
          distancePerHour: ((metrics.totalDistanceTraveled || 0) / operationalHours).toFixed(2),
          routeAdherence: metrics.routeAdherencePercentage || 0,
          averageOccupancy: metrics.averageOccupancyPercentage || 0
        },
        passengerMetrics: {
          totalTrips: metrics.totalPassengerTrips || 0,
          tripsPerHour: ((metrics.totalPassengerTrips || 0) / operationalHours).toFixed(1)
        },
        safetyMetrics: {
          alertsGenerated: metrics.alertsGenerated || 0,
          alertsPerBus: ((metrics.alertsGenerated || 0) / (metrics.activeBusCount || 1)).toFixed(1)
        }
      };
    } catch (error) {
      console.error('Error calculating fleet performance:', error);
      throw error;
    }
  }

  // Route Performance Analytics
  async getRouteAnalytics(routeId, timeWindow = 24) {
    try {
      const since = new Date(Date.now() - timeWindow * 60 * 60 * 1000);
      
      const routeMetrics = await this.Location.aggregate([
        {
          $match: {
            createdAt: { $gte: since }
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
          $lookup: {
            from: 'routes',
            localField: 'busDetails.route',
            foreignField: '_id',
            as: 'routeDetails'
          }
        },
        {
          $unwind: '$routeDetails'
        },
        {
          $match: {
            'routeDetails.routeId': routeId
          }
        },
        {
          $group: {
            _id: '$busDetails.busId',
            totalDistance: { $sum: '$locationAnalysis.distanceTraveled' },
            averageSpeed: { $avg: '$speed' },
            maxSpeed: { $max: '$speed' },
            routeAdherence: { $avg: { $cond: ['$routeAnalysis.isOnRoute', 1, 0] } },
            totalPassengers: { $sum: '$passengers.onboard' },
            passengersBoarded: { $sum: '$passengers.boarded' },
            passengersAlighted: { $sum: '$passengers.alighted' },
            updateCount: { $sum: 1 },
            alerts: { $sum: { $size: { $ifNull: ['$alerts', []] } } }
          }
        },
        {
          $group: {
            _id: null,
            busCount: { $sum: 1 },
            totalRouteDistance: { $sum: '$totalDistance' },
            averageRouteSpeed: { $avg: '$averageSpeed' },
            overallRouteAdherence: { $avg: '$routeAdherence' },
            totalPassengerActivity: { $sum: { $add: ['$passengersBoarded', '$passengersAlighted'] } },
            totalAlerts: { $sum: '$alerts' },
            busPerformance: {
              $push: {
                busId: '$_id',
                distance: '$totalDistance',
                speed: '$averageSpeed',
                adherence: '$routeAdherence',
                passengerActivity: { $add: ['$passengersBoarded', '$passengersAlighted'] },
                alerts: '$alerts'
              }
            }
          }
        }
      ]);

      const routeData = routeMetrics[0];
      
      if (!routeData) {
        return {
          routeId,
          message: 'No data available for this route in the specified time window',
          timeWindow: `${timeWindow} hours`
        };
      }

      // Calculate performance scores
      const performanceScore = this.calculateRoutePerformanceScore({
        adherence: routeData.overallRouteAdherence,
        speed: routeData.averageRouteSpeed,
        alerts: routeData.totalAlerts,
        busCount: routeData.busCount
      });

      return {
        routeId,
        timeWindow: `${timeWindow} hours`,
        summary: {
          activeBuses: routeData.busCount,
          totalDistance: Math.round(routeData.totalRouteDistance),
          averageSpeed: Math.round(routeData.averageRouteSpeed * 10) / 10,
          routeAdherence: Math.round(routeData.overallRouteAdherence * 100),
          totalPassengerActivity: routeData.totalPassengerActivity,
          totalAlerts: routeData.totalAlerts,
          performanceScore: performanceScore
        },
        busPerformance: routeData.busPerformance.map(bus => ({
          ...bus,
          performanceRating: this.calculateBusPerformanceRating(bus)
        })),
        recommendations: this.generateRouteRecommendations(routeData)
      };
    } catch (error) {
      console.error('Error calculating route analytics:', error);
      throw error;
    }
  }

  // Real-time Dashboard Metrics
  async getDashboardMetrics() {
    try {
      const now = new Date();
      const last15Minutes = new Date(now.getTime() - 15 * 60 * 1000);
      const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Real-time bus status
      const busStatus = await this.Location.aggregate([
        {
          $match: {
            createdAt: { $gte: last15Minutes }
          }
        },
        {
          $group: {
            _id: '$bus',
            lastUpdate: { $max: '$createdAt' },
            currentSpeed: { $last: '$speed' },
            passengers: { $last: '$passengers.onboard' }
          }
        },
        {
          $lookup: {
            from: 'buses',
            localField: '_id',
            foreignField: '_id',
            as: 'busDetails'
          }
        },
        {
          $unwind: '$busDetails'
        },
        {
          $group: {
            _id: null,
            totalBuses: { $sum: 1 },
            activeBuses: {
              $sum: {
                $cond: [
                  { $gte: ['$lastUpdate', new Date(now.getTime() - 5 * 60 * 1000)] },
                  1,
                  0
                ]
              }
            },
            totalPassengers: { $sum: '$passengers' },
            averageSpeed: { $avg: '$currentSpeed' }
          }
        }
      ]);

      // Alert summary
      const alertSummary = await this.Alert.aggregate([
        {
          $match: {
            createdAt: { $gte: last24Hours },
            status: { $ne: 'resolved' }
          }
        },
        {
          $group: {
            _id: '$priority',
            count: { $sum: 1 }
          }
        }
      ]);

      // Route performance summary
      const routePerformance = await this.Location.aggregate([
        {
          $match: {
            createdAt: { $gte: last24Hours }
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
          $lookup: {
            from: 'routes',
            localField: 'busDetails.route',
            foreignField: '_id',
            as: 'routeDetails'
          }
        },
        {
          $unwind: '$routeDetails'
        },
        {
          $group: {
            _id: '$routeDetails.routeId',
            routeName: { $first: '$routeDetails.name' },
            adherence: { $avg: { $cond: ['$routeAnalysis.isOnRoute', 1, 0] } },
            averageSpeed: { $avg: '$speed' },
            busCount: { $addToSet: '$busDetails.busId' }
          }
        },
        {
          $project: {
            routeId: '$_id',
            routeName: 1,
            adherence: { $round: [{ $multiply: ['$adherence', 100] }, 1] },
            averageSpeed: { $round: ['$averageSpeed', 1] },
            busCount: { $size: '$busCount' }
          }
        },
        {
          $sort: { adherence: -1 }
        }
      ]);

      const status = busStatus[0] || {};
      const alerts = {};
      alertSummary.forEach(alert => {
        alerts[alert._id] = alert.count;
      });

      return {
        timestamp: now.toISOString(),
        fleetStatus: {
          totalBuses: status.totalBuses || 0,
          activeBuses: status.activeBuses || 0,
          offlineBuses: (status.totalBuses || 0) - (status.activeBuses || 0),
          totalPassengers: status.totalPassengers || 0,
          averageSpeed: Math.round((status.averageSpeed || 0) * 10) / 10
        },
        alerts: {
          critical: alerts.critical || 0,
          high: alerts.high || 0,
          medium: alerts.medium || 0,
          low: alerts.low || 0,
          total: Object.values(alerts).reduce((sum, count) => sum + count, 0)
        },
        routePerformance: routePerformance.slice(0, 10), // Top 10 routes
        systemHealth: {
          databaseConnected: mongoose.connection.readyState === 1,
          lastDataUpdate: status.lastUpdate || null,
          systemUptime: process.uptime()
        }
      };
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
      throw error;
    }
  }

  // Historical Trend Analysis
  async getTrendAnalysis(timeWindow = 168) { // Default 1 week
    try {
      const since = new Date(Date.now() - timeWindow * 60 * 60 * 1000);
      const intervals = Math.min(timeWindow / 4, 24); // Max 24 data points
      const intervalHours = timeWindow / intervals;

      const trends = await this.Location.aggregate([
        {
          $match: {
            createdAt: { $gte: since }
          }
        },
        {
          $group: {
            _id: {
              interval: {
                $floor: {
                  $divide: [
                    { $subtract: ['$createdAt', since] },
                    intervalHours * 60 * 60 * 1000
                  ]
                }
              }
            },
            averageSpeed: { $avg: '$speed' },
            totalDistance: { $sum: '$locationAnalysis.distanceTraveled' },
            passengerActivity: { $sum: { $add: ['$passengers.boarded', '$passengers.alighted'] } },
            routeAdherence: { $avg: { $cond: ['$routeAnalysis.isOnRoute', 1, 0] } },
            activeBuses: { $addToSet: '$bus' },
            timestamp: { $min: '$createdAt' }
          }
        },
        {
          $project: {
            interval: '$_id.interval',
            timestamp: 1,
            averageSpeed: { $round: ['$averageSpeed', 1] },
            totalDistance: { $round: ['$totalDistance', 2] },
            passengerActivity: 1,
            routeAdherence: { $round: [{ $multiply: ['$routeAdherence', 100] }, 1] },
            activeBuses: { $size: '$activeBuses' }
          }
        },
        {
          $sort: { interval: 1 }
        }
      ]);

      return {
        timeWindow: `${timeWindow} hours`,
        intervalHours: Math.round(intervalHours * 10) / 10,
        dataPoints: trends.length,
        trends: trends.map(point => ({
          timestamp: point.timestamp,
          metrics: {
            speed: point.averageSpeed,
            distance: point.totalDistance,
            passengers: point.passengerActivity,
            adherence: point.routeAdherence,
            activeBuses: point.activeBuses
          }
        }))
      };
    } catch (error) {
      console.error('Error calculating trend analysis:', error);
      throw error;
    }
  }

  // Predictive Analytics
  async getPredictiveInsights(routeId = null) {
    try {
      const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      
      // Historical pattern analysis
      const historicalData = await this.Location.aggregate([
        {
          $match: {
            createdAt: { $gte: last7Days },
            ...(routeId && { 'routeAnalysis.routeId': routeId })
          }
        },
        {
          $group: {
            _id: {
              hour: { $hour: '$createdAt' },
              dayOfWeek: { $dayOfWeek: '$createdAt' }
            },
            averagePassengers: { $avg: '$passengers.onboard' },
            averageSpeed: { $avg: '$speed' },
            routeAdherence: { $avg: { $cond: ['$routeAnalysis.isOnRoute', 1, 0] } },
            alertCount: { $sum: { $size: { $ifNull: ['$alerts', []] } } },
            dataPoints: { $sum: 1 }
          }
        },
        {
          $group: {
            _id: '$_id.hour',
            weekdayAvg: {
              $avg: {
                $cond: [
                  { $and: [{ $gte: ['$_id.dayOfWeek', 2] }, { $lte: ['$_id.dayOfWeek', 6] }] },
                  '$averagePassengers',
                  null
                ]
              }
            },
            weekendAvg: {
              $avg: {
                $cond: [
                  { $or: [{ $eq: ['$_id.dayOfWeek', 1] }, { $eq: ['$_id.dayOfWeek', 7] }] },
                  '$averagePassengers',
                  null
                ]
              }
            },
            speedPattern: { $avg: '$averageSpeed' },
            riskScore: { $avg: { $divide: ['$alertCount', '$dataPoints'] } }
          }
        },
        {
          $sort: { _id: 1 }
        }
      ]);

      // Generate predictions for next 24 hours
      const predictions = this.generateHourlyPredictions(historicalData);
      
      // Identify peak hours and bottlenecks
      const insights = this.analyzePatternsAndGenerateInsights(historicalData);

      return {
        routeId: routeId || 'all_routes',
        analysisWindow: '7 days',
        predictions: predictions,
        insights: insights,
        confidence: this.calculatePredictionConfidence(historicalData)
      };
    } catch (error) {
      console.error('Error generating predictive insights:', error);
      throw error;
    }
  }

  // Helper methods
  calculateRoutePerformanceScore(metrics) {
    const adherenceWeight = 0.4;
    const speedWeight = 0.3;
    const alertWeight = 0.3;

    const adherenceScore = (metrics.adherence || 0) * 100;
    const speedScore = Math.min((metrics.speed || 0) / 30 * 100, 100); // Normalize to 30 km/h
    const alertScore = Math.max(100 - (metrics.alerts || 0) * 10, 0);

    return Math.round(
      adherenceScore * adherenceWeight +
      speedScore * speedWeight +
      alertScore * alertWeight
    );
  }

  calculateBusPerformanceRating(bus) {
    const adherenceScore = (bus.adherence || 0) * 100;
    const speedScore = Math.min((bus.speed || 0) / 30 * 100, 100);
    const alertScore = Math.max(100 - (bus.alerts || 0) * 20, 0);

    const overall = (adherenceScore + speedScore + alertScore) / 3;

    if (overall >= 85) return 'Excellent';
    if (overall >= 70) return 'Good';
    if (overall >= 55) return 'Average';
    if (overall >= 40) return 'Below Average';
    return 'Poor';
  }

  generateRouteRecommendations(routeData) {
    const recommendations = [];

    if (routeData.overallRouteAdherence < 0.8) {
      recommendations.push({
        type: 'route_optimization',
        priority: 'high',
        message: 'Route adherence is below 80%. Consider reviewing route planning and driver training.',
        actionItems: [
          'Analyze GPS tracking data for common deviation points',
          'Provide additional training to drivers on route adherence',
          'Review route design for practical feasibility'
        ]
      });
    }

    if (routeData.averageRouteSpeed < 20) {
      recommendations.push({
        type: 'speed_optimization',
        priority: 'medium',
        message: 'Average speed is low. Traffic bottlenecks may be affecting efficiency.',
        actionItems: [
          'Identify peak traffic hours and adjust schedules',
          'Consider alternative route segments',
          'Coordinate with traffic authorities for signal optimization'
        ]
      });
    }

    if (routeData.totalAlerts > routeData.busCount * 2) {
      recommendations.push({
        type: 'safety_improvement',
        priority: 'high',
        message: 'High alert frequency indicates potential safety concerns.',
        actionItems: [
          'Review driver behavior and provide safety training',
          'Check vehicle maintenance status',
          'Implement more frequent monitoring'
        ]
      });
    }

    return recommendations;
  }

  generateHourlyPredictions(historicalData) {
    const now = new Date();
    const predictions = [];

    for (let hour = 0; hour < 24; hour++) {
      const futureHour = new Date(now.getTime() + hour * 60 * 60 * 1000);
      const isWeekend = futureHour.getDay() === 0 || futureHour.getDay() === 6;
      const hourOfDay = futureHour.getHours();

      const historicalPoint = historicalData.find(d => d._id === hourOfDay);
      
      if (historicalPoint) {
        const passengerLoad = isWeekend ? 
          (historicalPoint.weekendAvg || 0) : 
          (historicalPoint.weekdayAvg || 0);

        predictions.push({
          hour: futureHour.toISOString(),
          predictedPassengerLoad: Math.round(passengerLoad),
          expectedSpeed: Math.round((historicalPoint.speedPattern || 0) * 10) / 10,
          riskLevel: this.categorizeRisk(historicalPoint.riskScore || 0),
          confidence: Math.round(Math.random() * 20 + 75) // Simulated confidence
        });
      }
    }

    return predictions;
  }

  analyzePatternsAndGenerateInsights(historicalData) {
    const insights = [];

    // Find peak hours
    const peakHours = historicalData
      .sort((a, b) => (b.weekdayAvg || 0) - (a.weekdayAvg || 0))
      .slice(0, 3)
      .map(d => `${d._id}:00`);

    insights.push({
      type: 'peak_hours',
      message: `Peak passenger hours are typically: ${peakHours.join(', ')}`,
      recommendation: 'Consider increasing bus frequency during these hours'
    });

    // Identify high-risk hours
    const riskHours = historicalData
      .filter(d => (d.riskScore || 0) > 0.1)
      .map(d => `${d._id}:00`);

    if (riskHours.length > 0) {
      insights.push({
        type: 'risk_pattern',
        message: `Higher alert frequency observed during: ${riskHours.join(', ')}`,
        recommendation: 'Implement enhanced monitoring during these hours'
      });
    }

    return insights;
  }

  calculatePredictionConfidence(historicalData) {
    const dataPoints = historicalData.reduce((sum, d) => sum + (d.dataPoints || 0), 0);
    
    if (dataPoints > 1000) return 'High';
    if (dataPoints > 500) return 'Medium';
    if (dataPoints > 100) return 'Low';
    return 'Very Low';
  }

  categorizeRisk(riskScore) {
    if (riskScore > 0.2) return 'High';
    if (riskScore > 0.1) return 'Medium';
    if (riskScore > 0.05) return 'Low';
    return 'Very Low';
  }
}

module.exports = AnalyticsService;