const { Bus, Driver, Location, Route } = require('../models');
const { generateTripId } = require('../utils/helpers');

// Advanced GPS utilities
const GpsUtils = {
  // Calculate distance between two coordinates using Haversine formula
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in km
  },

  toRadians(degrees) {
    return degrees * (Math.PI/180);
  },

  // Calculate bearing (direction) between two points
  calculateBearing(lat1, lon1, lat2, lon2) {
    const dLon = this.toRadians(lon2 - lon1);
    const lat1Rad = this.toRadians(lat1);
    const lat2Rad = this.toRadians(lat2);
    
    const y = Math.sin(dLon) * Math.cos(lat2Rad);
    const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - 
              Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
    
    let bearing = Math.atan2(y, x);
    bearing = bearing * (180/Math.PI);
    bearing = (bearing + 360) % 360; // Normalize to 0-360
    
    return bearing;
  },

  // Calculate ETA based on distance and average speed
  calculateETA(distanceKm, averageSpeedKmh = 30) {
    const timeHours = distanceKm / averageSpeedKmh;
    const timeMinutes = Math.round(timeHours * 60);
    return {
      hours: Math.floor(timeMinutes / 60),
      minutes: timeMinutes % 60,
      totalMinutes: timeMinutes
    };
  },

  // Check if point is within geofence (circular area)
  isWithinGeofence(lat, lon, centerLat, centerLon, radiusKm) {
    const distance = this.calculateDistance(lat, lon, centerLat, centerLon);
    return distance <= radiusKm;
  },

  // Validate GPS coordinates
  validateCoordinates(lat, lon) {
    return {
      isValid: lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180,
      latitude: parseFloat(lat),
      longitude: parseFloat(lon)
    };
  }
};

// Enhanced location update with advanced features
const updateLocationAdvanced = async (req, res) => {
  try {
    const {
      busId,
      latitude,
      longitude,
      speed = 0,
      heading = 0,
      accuracy = 10,
      altitude = 0,
      tripId,
      passengers = { onboard: 0, boarded: 0, alighted: 0 },
      deviceInfo = {}
    } = req.body;

    // Validate GPS coordinates
    const coordValidation = GpsUtils.validateCoordinates(latitude, longitude);
    if (!coordValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid GPS coordinates'
      });
    }

    // Verify driver is authorized for this bus
    const driver = req.user;
    const bus = await Bus.findOne({ busId })
      .populate('route')
      .populate('currentTrip');
    
    if (!bus) {
      return res.status(404).json({
        success: false,
        message: 'Bus not found'
      });
    }

    // Check if driver is assigned to this bus
    if (!driver.currentBus || driver.currentBus.toString() !== bus._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Driver not assigned to this bus'
      });
    }

    // Get previous location for analysis
    const previousLocation = await Location.findOne({
      bus: bus._id
    }).sort({ createdAt: -1 });

    let locationAnalysis = {};
    
    if (previousLocation) {
      // Calculate distance traveled
      const distanceTraveled = GpsUtils.calculateDistance(
        previousLocation.coordinates.coordinates[1], // lat
        previousLocation.coordinates.coordinates[0], // lon
        latitude,
        longitude
      );

      // Calculate time difference
      const timeDiff = (new Date() - previousLocation.createdAt) / 1000 / 60; // minutes
      
      // Calculate average speed
      const calculatedSpeed = timeDiff > 0 ? (distanceTraveled / timeDiff) * 60 : 0; // km/h

      locationAnalysis = {
        distanceTraveled: distanceTraveled * 1000, // meters
        timeSinceLastUpdate: timeDiff,
        calculatedSpeed,
        speedDifference: Math.abs(speed - calculatedSpeed),
        isSpeedAccurate: Math.abs(speed - calculatedSpeed) < 10 // within 10 km/h
      };
    }

    // Route adherence check
    let routeAnalysis = {};
    if (bus.route && bus.route.stops) {
      const nearestStop = bus.route.stops.reduce((nearest, stop) => {
        const distance = GpsUtils.calculateDistance(
          latitude, longitude,
          stop.location.coordinates[1], // lat
          stop.location.coordinates[0]  // lon
        );
        
        return distance < nearest.distance ? 
          { stop, distance: distance * 1000 } : nearest; // distance in meters
      }, { distance: Infinity });

      routeAnalysis = {
        nearestStop: nearestStop.stop ? {
          stopId: nearestStop.stop.stopId,
          name: nearestStop.stop.name,
          distance: nearestStop.distance
        } : null,
        isOnRoute: nearestStop.distance < 500, // within 500m of route
        routeDeviation: nearestStop.distance
      };
    }

    // Geofencing check for bus stops
    const busStopGeofences = await this.checkBusStopGeofences(busId, latitude, longitude);

    // Create enhanced location record
    const locationData = new Location({
      bus: bus._id,
      driver: driver._id,
      tripId,
      coordinates: {
        type: 'Point',
        coordinates: [longitude, latitude]
      },
      speed,
      heading,
      accuracy,
      altitude,
      passengers,
      deviceInfo: {
        ...deviceInfo,
        deviceId: deviceInfo.deviceId || req.headers['x-device-id'],
        appVersion: deviceInfo.appVersion || req.headers['x-app-version'],
        batteryLevel: deviceInfo.batteryLevel,
        networkType: deviceInfo.networkType
      },
      source: 'gps',
      // Enhanced data
      locationAnalysis,
      routeAnalysis,
      geofenceEvents: busStopGeofences,
      dataQuality: {
        accuracyLevel: accuracy < 10 ? 'high' : accuracy < 50 ? 'medium' : 'low',
        isSpeedRealistic: speed >= 0 && speed <= 120,
        hasValidHeading: heading >= 0 && heading <= 360
      }
    });

    await locationData.save();

    // Update bus current location with enhanced data
    await bus.updateLocation(latitude, longitude, speed, heading, {
      lastLocationUpdate: new Date(),
      locationAccuracy: accuracy,
      routeAdherence: routeAnalysis.isOnRoute,
      nearestStop: routeAnalysis.nearestStop
    });

    // Update passenger count in bus
    if (passengers.onboard !== undefined) {
      bus.currentTrip.passengersCount = passengers.onboard;
      
      // Track passenger flow
      if (passengers.boarded > 0 || passengers.alighted > 0) {
        bus.currentTrip.passengerEvents.push({
          timestamp: new Date(),
          boarded: passengers.boarded,
          alighted: passengers.alighted,
          totalOnboard: passengers.onboard,
          location: { latitude, longitude },
          stopId: routeAnalysis.nearestStop?.stopId
        });
      }
      
      await bus.save();
    }

    // Emit real-time location update via Socket.IO with enhanced data
    const io = req.app.get('io');
    
    // Enhanced passenger update
    io.to(`bus-${busId}`).emit('locationUpdate', {
      busId,
      location: {
        latitude,
        longitude,
        speed,
        heading,
        accuracy,
        lastUpdated: new Date()
      },
      passengers: passengers.onboard,
      tripId,
      eta: routeAnalysis.nearestStop ? 
        GpsUtils.calculateETA(routeAnalysis.nearestStop.distance / 1000, speed || 30) : null,
      nextStop: routeAnalysis.nearestStop,
      isOnRoute: routeAnalysis.isOnRoute
    });

    // Enhanced authority dashboard update
    io.to('authority-dashboard').emit('busLocationUpdate', {
      busId,
      driverId: driver.driverId,
      location: {
        latitude,
        longitude,
        speed,
        heading,
        accuracy,
        lastUpdated: new Date()
      },
      status: bus.operationalStatus,
      passengers: passengers.onboard,
      tripId,
      routeAdherence: routeAnalysis.isOnRoute,
      alerts: [
        ...(!routeAnalysis.isOnRoute ? ['off-route'] : []),
        ...(speed > 60 ? ['speeding'] : []),
        ...(accuracy > 50 ? ['poor-gps'] : [])
      ]
    });

    // Generate alerts if needed
    await this.checkAndGenerateAlerts(bus, locationData, routeAnalysis);

    res.json({
      success: true,
      message: 'Location updated successfully',
      data: {
        locationId: locationData._id,
        timestamp: locationData.createdAt,
        nextUpdateIn: 10, // seconds
        routeStatus: routeAnalysis.isOnRoute ? 'on-route' : 'off-route',
        nearestStop: routeAnalysis.nearestStop,
        dataQuality: locationData.dataQuality
      }
    });

  } catch (error) {
    console.error('Enhanced location update error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating location'
    });
  }
};

// Check bus stop geofences
const checkBusStopGeofences = async (busId, latitude, longitude) => {
  try {
    const bus = await Bus.findOne({ busId }).populate('route');
    if (!bus || !bus.route || !bus.route.stops) return [];

    const geofenceEvents = [];
    const geofenceRadius = 0.1; // 100 meters

    for (const stop of bus.route.stops) {
      const isWithinGeofence = GpsUtils.isWithinGeofence(
        latitude, longitude,
        stop.location.coordinates[1], // lat
        stop.location.coordinates[0], // lon
        geofenceRadius
      );

      if (isWithinGeofence) {
        geofenceEvents.push({
          stopId: stop.stopId,
          stopName: stop.name,
          eventType: 'entered',
          distance: GpsUtils.calculateDistance(
            latitude, longitude,
            stop.location.coordinates[1],
            stop.location.coordinates[0]
          ) * 1000, // meters
          timestamp: new Date()
        });
      }
    }

    return geofenceEvents;
  } catch (error) {
    console.error('Geofence check error:', error);
    return [];
  }
};

// Generate alerts based on location analysis
const checkAndGenerateAlerts = async (bus, locationData, routeAnalysis) => {
  try {
    const alerts = [];

    // Off-route alert
    if (!routeAnalysis.isOnRoute && routeAnalysis.routeDeviation > 1000) {
      alerts.push({
        type: 'route_deviation',
        severity: 'medium',
        message: `Bus ${bus.busId} is ${Math.round(routeAnalysis.routeDeviation)}m off route`,
        location: locationData.coordinates,
        busId: bus.busId
      });
    }

    // Speeding alert
    if (locationData.speed > 60) {
      alerts.push({
        type: 'speeding',
        severity: 'high',
        message: `Bus ${bus.busId} exceeding speed limit: ${locationData.speed} km/h`,
        location: locationData.coordinates,
        busId: bus.busId
      });
    }

    // Long idle alert (no movement for 20+ minutes)
    const lastMovement = await Location.findOne({
      bus: bus._id,
      speed: { $gt: 0 }
    }).sort({ createdAt: -1 });

    if (lastMovement && locationData.speed === 0) {
      const idleTime = (new Date() - lastMovement.createdAt) / 1000 / 60; // minutes
      if (idleTime > 20) {
        alerts.push({
          type: 'long_idle',
          severity: 'medium',
          message: `Bus ${bus.busId} idle for ${Math.round(idleTime)} minutes`,
          location: locationData.coordinates,
          busId: bus.busId
        });
      }
    }

    // Poor GPS quality alert
    if (locationData.accuracy > 50) {
      alerts.push({
        type: 'poor_gps',
        severity: 'low',
        message: `Bus ${bus.busId} has poor GPS accuracy: ${locationData.accuracy}m`,
        location: locationData.coordinates,
        busId: bus.busId
      });
    }

    // Create alert records and send notifications
    if (alerts.length > 0) {
      const Alert = require('../models/Alert');
      for (const alertData of alerts) {
        const alert = new Alert(alertData);
        await alert.save();

        // Send real-time alert to authority dashboard
        const io = req.app.get('io');
        io.to('authority-dashboard').emit('newAlert', alert);
      }
    }

  } catch (error) {
    console.error('Alert generation error:', error);
  }
};

// Get enhanced bus location with ETA predictions
const getBusLocationAdvanced = async (req, res) => {
  try {
    const { busId } = req.params;
    const { includeRoute = 'false', includeETA = 'true', includeHistory = 'false' } = req.query;

    // Find bus with enhanced data
    const bus = await Bus.findOne({ busId, isActive: true })
      .populate('route', 'name startPoint endPoint stops')
      .populate('currentDriver', 'driverId name phone')
      .populate('currentTrip');

    if (!bus) {
      return res.status(404).json({
        success: false,
        message: 'Bus not found or inactive'
      });
    }

    // Get latest location with enhanced data
    const latestLocation = await Location.findOne({ bus: bus._id })
      .sort({ createdAt: -1 })
      .populate('driver', 'driverId name');

    if (!latestLocation) {
      return res.status(404).json({
        success: false,
        message: 'No location data available for this bus'
      });
    }

    // Calculate data freshness
    const now = new Date();
    const lastUpdateMinutes = Math.floor((now - latestLocation.createdAt) / 1000 / 60);
    const freshness = lastUpdateMinutes < 2 ? 'live' : 
                     lastUpdateMinutes < 10 ? 'recent' : 'stale';

    const response = {
      success: true,
      data: {
        busId: bus.busId,
        registrationNumber: bus.registrationNumber,
        location: {
          latitude: latestLocation.coordinates.coordinates[1],
          longitude: latestLocation.coordinates.coordinates[0],
          speed: latestLocation.speed,
          heading: latestLocation.heading,
          accuracy: latestLocation.accuracy,
          lastUpdated: latestLocation.createdAt,
          lastUpdateMinutes,
          freshness
        },
        currentTrip: {
          tripId: latestLocation.tripId,
          passengersCount: bus.currentTrip?.passengersCount || 0,
          startTime: bus.currentTrip?.startTime,
          status: bus.operationalStatus
        },
        driver: latestLocation.driver ? {
          driverId: latestLocation.driver.driverId,
          name: latestLocation.driver.name
        } : null,
        dataQuality: latestLocation.dataQuality,
        routeAdherence: latestLocation.routeAnalysis
      }
    };

    // Include route information if requested
    if (includeRoute === 'true' && bus.route) {
      response.data.route = {
        routeId: bus.route._id,
        name: bus.route.name,
        startPoint: bus.route.startPoint,
        endPoint: bus.route.endPoint,
        stops: bus.route.stops.map(stop => ({
          stopId: stop.stopId,
          name: stop.name,
          location: {
            latitude: stop.location.coordinates[1],
            longitude: stop.location.coordinates[0]
          },
          estimatedArrival: stop.scheduledTime
        }))
      };
    }

    // Include ETA calculations if requested
    if (includeETA === 'true' && bus.route && bus.route.stops) {
      const currentLat = latestLocation.coordinates.coordinates[1];
      const currentLon = latestLocation.coordinates.coordinates[0];
      
      const upcomingStops = bus.route.stops.map(stop => {
        const distance = GpsUtils.calculateDistance(
          currentLat, currentLon,
          stop.location.coordinates[1],
          stop.location.coordinates[0]
        );
        
        const eta = GpsUtils.calculateETA(distance, latestLocation.speed || 30);
        
        return {
          stopId: stop.stopId,
          name: stop.name,
          distance: Math.round(distance * 1000), // meters
          eta: {
            minutes: eta.totalMinutes,
            formattedTime: `${eta.hours}h ${eta.minutes}m`
          }
        };
      }).sort((a, b) => a.distance - b.distance);

      response.data.upcomingStops = upcomingStops.slice(0, 5); // Next 5 stops
    }

    // Include location history if requested
    if (includeHistory === 'true') {
      const locationHistory = await Location.find({ bus: bus._id })
        .sort({ createdAt: -1 })
        .limit(20)
        .select('coordinates speed heading createdAt passengers');

      response.data.locationHistory = locationHistory.map(loc => ({
        latitude: loc.coordinates.coordinates[1],
        longitude: loc.coordinates.coordinates[0],
        speed: loc.speed,
        heading: loc.heading,
        timestamp: loc.createdAt,
        passengers: loc.passengers?.onboard
      }));
    }

    res.json(response);

  } catch (error) {
    console.error('Enhanced get bus location error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching bus location'
    });
  }
};

// Get nearby buses with enhanced filtering and sorting
const getNearbyBusesAdvanced = async (req, res) => {
  try {
    const { 
      latitude, 
      longitude, 
      maxDistance = 2000, // meters
      routeFilter,
      statusFilter = 'active',
      sortBy = 'distance',
      includeETA = 'true',
      limit = 10
    } = req.query;

    // Validate coordinates
    const coordValidation = GpsUtils.validateCoordinates(latitude, longitude);
    if (!coordValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coordinates provided'
      });
    }

    const searchLat = coordValidation.latitude;
    const searchLon = coordValidation.longitude;
    const maxDistanceKm = maxDistance / 1000;

    // Build query for nearby buses
    let busQuery = {
      isActive: true,
      operationalStatus: statusFilter
    };

    if (routeFilter) {
      busQuery['route'] = routeFilter;
    }

    // Find buses within radius using geospatial query
    const nearbyLocations = await Location.aggregate([
      {
        $geoNear: {
          near: {
            type: 'Point',
            coordinates: [searchLon, searchLat]
          },
          distanceField: 'distance',
          maxDistance: maxDistance,
          spherical: true,
          query: {}
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: '$bus',
          latestLocation: { $first: '$$ROOT' }
        }
      },
      {
        $replaceRoot: { newRoot: '$latestLocation' }
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
        $match: busQuery
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
        $limit: parseInt(limit)
      }
    ]);

    // Process and enhance results
    const enhancedBuses = nearbyLocations.map(location => {
      const bus = location.busDetails;
      const route = location.routeDetails[0];
      
      // Calculate data freshness
      const lastUpdateMinutes = Math.floor((new Date() - location.createdAt) / 1000 / 60);
      const freshness = lastUpdateMinutes < 2 ? 'live' : 
                       lastUpdateMinutes < 10 ? 'recent' : 'stale';

      const busData = {
        busId: bus.busId,
        registrationNumber: bus.registrationNumber,
        location: {
          latitude: location.coordinates.coordinates[1],
          longitude: location.coordinates.coordinates[0],
          distance: Math.round(location.distance), // meters
          speed: location.speed,
          heading: location.heading,
          lastUpdated: location.createdAt,
          freshness
        },
        passengers: location.passengers?.onboard || 0,
        capacity: bus.capacity,
        occupancyRate: location.passengers?.onboard ? 
          Math.round((location.passengers.onboard / bus.capacity) * 100) : 0,
        operationalStatus: bus.operationalStatus
      };

      // Add route information if available
      if (route) {
        busData.route = {
          routeId: route.routeId,
          name: route.name,
          destination: route.endPoint
        };
      }

      // Add ETA calculation if requested
      if (includeETA === 'true') {
        const distanceKm = location.distance / 1000;
        const eta = GpsUtils.calculateETA(distanceKm, location.speed || 30);
        busData.eta = {
          minutes: eta.totalMinutes,
          formattedTime: `${eta.hours}h ${eta.minutes}m`
        };
      }

      return busData;
    });

    // Sort results
    if (sortBy === 'eta' && includeETA === 'true') {
      enhancedBuses.sort((a, b) => a.eta.minutes - b.eta.minutes);
    } else if (sortBy === 'occupancy') {
      enhancedBuses.sort((a, b) => a.occupancyRate - b.occupancyRate);
    }
    // Default sort by distance (already sorted by geospatial query)

    res.json({
      success: true,
      data: {
        searchLocation: {
          latitude: searchLat,
          longitude: searchLon
        },
        searchRadius: maxDistance,
        totalFound: enhancedBuses.length,
        buses: enhancedBuses
      }
    });

  } catch (error) {
    console.error('Enhanced nearby buses error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error finding nearby buses'
    });
  }
};

module.exports = {
  updateLocationAdvanced,
  getBusLocationAdvanced,
  getNearbyBusesAdvanced,
  checkBusStopGeofences,
  checkAndGenerateAlerts,
  GpsUtils
};