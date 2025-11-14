const { Bus, Route, Location } = require('../models');
const ETACalculationService = require('../services/etaService');

const etaService = new ETACalculationService();

// Get ETA for a specific bus - for passengers
const getBusETA = async (req, res) => {
  try {
    const { busId } = req.params;
    const { stopName, stopOrder, includeAll = 'false' } = req.query;

    // Find bus and its route
    const bus = await Bus.findOne({ busId, isActive: true })
      .populate('route');

    if (!bus || !bus.route) {
      return res.status(404).json({
        success: false,
        message: 'Bus or route not found'
      });
    }

    // Get latest location
    const latestLocation = await Location.getLatestForBus(bus._id);
    
    if (!latestLocation) {
      return res.status(404).json({
        success: false,
        message: 'No location data available for this bus'
      });
    }

    // Check if location data is recent (within last 10 minutes)
    const locationAge = (Date.now() - latestLocation.createdAt) / (1000 * 60);
    if (locationAge > 10) {
      return res.status(200).json({
        success: true,
        message: 'ETA calculated with stale location data',
        data: {
          warning: 'Location data is more than 10 minutes old',
          lastUpdate: latestLocation.createdAt,
          ageMinutes: Math.round(locationAge)
        }
      });
    }

    const currentLocation = {
      latitude: latestLocation.latitude,
      longitude: latestLocation.longitude,
      speed: latestLocation.speed,
      accuracy: latestLocation.accuracy
    };

    let etaData;

    // If specific stop is requested
    if (stopName || stopOrder) {
      const targetStop = bus.route.stops.find(stop => 
        stopName ? stop.name.toLowerCase().includes(stopName.toLowerCase()) :
        stopOrder ? stop.order === parseInt(stopOrder) : false
      );

      if (!targetStop) {
        return res.status(404).json({
          success: false,
          message: 'Stop not found on this route'
        });
      }

      const eta = etaService.calculateETAToStop(currentLocation, targetStop, null, bus.route);
      
      etaData = {
        targetStop: {
          name: targetStop.name,
          order: targetStop.order,
          coordinates: targetStop.coordinates
        },
        eta: eta,
        busInfo: {
          busId: bus.busId,
          currentTrip: bus.currentTrip,
          operationalStatus: bus.operationalStatus
        }
      };

    } else {
      // Calculate ETA for all upcoming stops
      const routeETA = etaService.calculateRouteETA(
        currentLocation, 
        bus.route, 
        bus.currentTrip.currentStopOrder
      );

      etaData = {
        route: {
          routeId: bus.route.routeId,
          name: bus.route.name,
          totalStops: bus.route.stops.length
        },
        busInfo: {
          busId: bus.busId,
          currentTrip: bus.currentTrip,
          operationalStatus: bus.operationalStatus,
          progress: etaService.calculateRouteProgress(
            bus.currentTrip.currentStopOrder,
            bus.route.stops.length
          )
        },
        eta: routeETA,
        includeAll: includeAll === 'true' ? routeETA?.allStops || [] : null
      };
    }

    res.json({
      success: true,
      data: {
        ...etaData,
        currentLocation: {
          ...currentLocation,
          lastUpdated: latestLocation.createdAt,
          ageMinutes: Math.round(locationAge)
        },
        calculatedAt: new Date(),
        disclaimer: 'ETAs are estimates and may vary due to traffic and other factors'
      }
    });

  } catch (error) {
    console.error('Get bus ETA error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error calculating ETA'
    });
  }
};

// Get ETA for all buses on a route - for passengers
const getRouteETA = async (req, res) => {
  try {
    const { routeId } = req.params;

    // Find route
    const route = await Route.findOne({ routeId, isActive: true });
    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Route not found'
      });
    }

    // Find all active buses on this route
    const buses = await Bus.find({ 
      route: route._id, 
      isActive: true, 
      status: 'active',
      operationalStatus: { $in: ['running', 'break'] }
    });

    const busETAs = [];

    for (const bus of buses) {
      const latestLocation = await Location.getLatestForBus(bus._id);
      
      if (latestLocation) {
        const currentLocation = {
          latitude: latestLocation.latitude,
          longitude: latestLocation.longitude,
          speed: latestLocation.speed,
          accuracy: latestLocation.accuracy
        };

        const routeETA = etaService.calculateRouteETA(
          currentLocation,
          route,
          bus.currentTrip.currentStopOrder
        );

        const locationAge = (Date.now() - latestLocation.createdAt) / (1000 * 60);

        busETAs.push({
          busId: bus.busId,
          registrationNumber: bus.registrationNumber,
          operationalStatus: bus.operationalStatus,
          currentTrip: bus.currentTrip,
          eta: routeETA,
          locationAge: Math.round(locationAge),
          isDataFresh: locationAge <= 5,
          progress: etaService.calculateRouteProgress(
            bus.currentTrip.currentStopOrder,
            route.stops.length
          )
        });
      }
    }

    res.json({
      success: true,
      data: {
        route: {
          routeId: route.routeId,
          name: route.name,
          startPoint: route.startPoint,
          endPoint: route.endPoint,
          totalStops: route.stops.length
        },
        buses: busETAs,
        summary: {
          totalBuses: busETAs.length,
          activeBuses: busETAs.filter(b => b.operationalStatus === 'running').length,
          freshData: busETAs.filter(b => b.isDataFresh).length
        },
        calculatedAt: new Date()
      }
    });

  } catch (error) {
    console.error('Get route ETA error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error calculating route ETA'
    });
  }
};

// Get ETA for a specific stop - for passengers waiting at stops
const getStopETA = async (req, res) => {
  try {
    const { routeId } = req.params;
    const { stopName, stopOrder } = req.query;

    if (!stopName && !stopOrder) {
      return res.status(400).json({
        success: false,
        message: 'Stop name or stop order is required'
      });
    }

    // Find route
    const route = await Route.findOne({ routeId, isActive: true });
    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Route not found'
      });
    }

    // Find the target stop
    const targetStop = route.stops.find(stop => 
      stopName ? stop.name.toLowerCase().includes(stopName.toLowerCase()) :
      stopOrder ? stop.order === parseInt(stopOrder) : false
    );

    if (!targetStop) {
      return res.status(404).json({
        success: false,
        message: 'Stop not found on this route'
      });
    }

    // Find all buses on this route that haven't passed this stop yet
    const buses = await Bus.find({ 
      route: route._id, 
      isActive: true, 
      status: 'active',
      operationalStatus: 'running',
      'currentTrip.currentStopOrder': { $lt: targetStop.order }
    });

    const busETAs = [];

    for (const bus of buses) {
      const latestLocation = await Location.getLatestForBus(bus._id);
      
      if (latestLocation) {
        const currentLocation = {
          latitude: latestLocation.latitude,
          longitude: latestLocation.longitude,
          speed: latestLocation.speed,
          accuracy: latestLocation.accuracy
        };

        const eta = etaService.calculateETAToStop(currentLocation, targetStop, null, route);
        const locationAge = (Date.now() - latestLocation.createdAt) / (1000 * 60);

        if (eta) {
          busETAs.push({
            busId: bus.busId,
            registrationNumber: bus.registrationNumber,
            currentTrip: bus.currentTrip,
            eta: eta,
            locationAge: Math.round(locationAge),
            isDataFresh: locationAge <= 5,
            currentLocation: {
              latitude: latestLocation.latitude,
              longitude: latestLocation.longitude,
              lastUpdated: latestLocation.createdAt
            }
          });
        }
      }
    }

    // Sort by ETA (closest first)
    busETAs.sort((a, b) => a.eta.estimatedTime - b.eta.estimatedTime);

    res.json({
      success: true,
      data: {
        stop: {
          name: targetStop.name,
          order: targetStop.order,
          coordinates: targetStop.coordinates
        },
        route: {
          routeId: route.routeId,
          name: route.name
        },
        upcomingBuses: busETAs,
        summary: {
          totalBuses: busETAs.length,
          nextBusIn: busETAs.length > 0 ? busETAs[0].eta.estimatedTime : null,
          freshData: busETAs.filter(b => b.isDataFresh).length
        },
        calculatedAt: new Date()
      }
    });

  } catch (error) {
    console.error('Get stop ETA error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error calculating stop ETA'
    });
  }
};

// Get delay analysis for authorities
const getDelayAnalysis = async (req, res) => {
  try {
    const { routeId, date } = req.query;
    const targetDate = date ? new Date(date) : new Date();
    
    // Set date range (full day)
    const startDate = new Date(targetDate);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(targetDate);
    endDate.setHours(23, 59, 59, 999);

    let filter = {
      createdAt: { $gte: startDate, $lte: endDate }
    };

    if (routeId) {
      const route = await Route.findOne({ routeId });
      if (!route) {
        return res.status(404).json({
          success: false,
          message: 'Route not found'
        });
      }

      const buses = await Bus.find({ route: route._id });
      filter.bus = { $in: buses.map(b => b._id) };
    }

    // Get location data for analysis
    const locations = await Location.find(filter)
      .populate('bus', 'busId registrationNumber route')
      .sort({ createdAt: 1 });

    // Group by trip and analyze delays
    const tripAnalysis = {};
    
    for (const location of locations) {
      if (!location.tripId) continue;

      if (!tripAnalysis[location.tripId]) {
        tripAnalysis[location.tripId] = {
          tripId: location.tripId,
          busId: location.bus.busId,
          locations: [],
          delays: []
        };
      }

      tripAnalysis[location.tripId].locations.push(location);
    }

    // Calculate delays for each trip
    const delayResults = [];
    
    for (const tripData of Object.values(tripAnalysis)) {
      if (tripData.locations.length === 0) continue;

      // Simple delay calculation based on expected vs actual times
      // This would be enhanced with actual schedule data
      const avgSpeed = tripData.locations.reduce((sum, loc) => sum + loc.speed, 0) / tripData.locations.length;
      const totalTime = (tripData.locations[tripData.locations.length - 1].createdAt - tripData.locations[0].createdAt) / (1000 * 60);

      delayResults.push({
        tripId: tripData.tripId,
        busId: tripData.busId,
        startTime: tripData.locations[0].createdAt,
        endTime: tripData.locations[tripData.locations.length - 1].createdAt,
        duration: Math.round(totalTime),
        averageSpeed: Math.round(avgSpeed * 100) / 100,
        totalLocations: tripData.locations.length,
        estimatedDelay: Math.max(0, totalTime - 60) // Assuming 60 min baseline
      });
    }

    const summary = {
      totalTrips: delayResults.length,
      averageDelay: delayResults.length > 0 ? 
        Math.round(delayResults.reduce((sum, trip) => sum + trip.estimatedDelay, 0) / delayResults.length) : 0,
      onTimeTrips: delayResults.filter(trip => trip.estimatedDelay <= 5).length,
      delayedTrips: delayResults.filter(trip => trip.estimatedDelay > 5).length,
      severelyDelayed: delayResults.filter(trip => trip.estimatedDelay > 15).length
    };

    res.json({
      success: true,
      data: {
        date: targetDate.toISOString().split('T')[0],
        summary,
        trips: delayResults,
        analysisNote: 'Delay analysis is based on estimated baseline times. Integrate with actual schedules for more accurate results.'
      }
    });

  } catch (error) {
    console.error('Get delay analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error analyzing delays'
    });
  }
};

module.exports = {
  getBusETA,
  getRouteETA,
  getStopETA,
  getDelayAnalysis
};