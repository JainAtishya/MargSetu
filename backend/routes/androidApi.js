const express = require('express');
const router = express.Router();
const Station = require('../models/Station');
const Route = require('../models/Route');
const Bus = require('../models/Bus');

// Configurable thresholds
const GPS_FRESH_WINDOW_MS = Number(process.env.GPS_FRESH_WINDOW_MS || 3 * 60 * 1000); // default 3 minutes
const SCHEDULE_BASE_HOUR = Number(process.env.SCHEDULE_BASE_HOUR || 6); // 6 AM
const SCHEDULE_FREQ_MIN = Number(process.env.SCHEDULE_FREQ_MIN || 30); // 30 minutes

// Get all stations (for Android app)
router.get('/stations', async (req, res) => {
  try {
    const stations = await Station.find({}, {
      name: 1,
      location: 1,
      _id: 1
    });

    // Format for Android app
    const formattedStations = stations.map(station => ({
      id: station._id.toString(),
      name: station.name,
      latitude: station.location?.coordinates?.[1] || 0,
      longitude: station.location?.coordinates?.[0] || 0
    }));

    res.json({
      success: true,
      stations: formattedStations,
      data: formattedStations
    });
  } catch (error) {
    console.error('Error fetching stations for Android:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stations',
      stations: []
    });
  }
});

// Search buses between stations
router.post('/search-buses', async (req, res) => {
  try {
    const { fromStationId, toStationId } = req.body;

    if (!fromStationId || !toStationId) {
      return res.status(400).json({
        success: false,
        message: 'From and to station IDs are required',
        buses: []
      });
    }

    // Find routes that connect these stations
    const routes = await Route.find({
      $or: [
        { startLocation: fromStationId, endLocation: toStationId },
        { startLocation: toStationId, endLocation: fromStationId },
        { 
          $and: [
            { stops: fromStationId },
            { stops: toStationId }
          ]
        }
      ]
    }).populate('startLocation endLocation stops');

    // Find buses on these routes
    const routeIds = routes.map(route => route._id);
    const buses = await Bus.find({ 
      route: { $in: routeIds },
      status: 'active'
    })
    .populate('route')
    .populate('driver', 'name phone');

    // Format for Android app
    const formattedBuses = buses.map(bus => ({
      id: bus._id.toString(),
      busNumber: bus.busNumber,
      routeName: bus.route?.name || 'Unknown Route',
      driverName: bus.driver?.name || 'Unknown Driver',
      driverPhone: bus.driver?.phone || '',
      currentLatitude: bus.currentLocation?.lat || 0,
      currentLongitude: bus.currentLocation?.lng || 0,
      lastUpdated: bus.lastUpdated ? bus.lastUpdated.toISOString() : new Date().toISOString(),
      status: bus.status || 'unknown'
    }));

    res.json({
      success: true,
      buses: formattedBuses,
      routesFound: routes.length
    });

  } catch (error) {
    console.error('Error searching buses for Android:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search buses',
      buses: []
    });
  }
});

// Get bus real-time location
router.get('/bus/:busId/location', async (req, res) => {
  try {
    const { busId } = req.params;

    const bus = await Bus.findById(busId)
      .populate('route', 'name startPoint endPoint estimatedDuration schedule')
      .populate('currentDriver', 'name phone');

    if (!bus) {
      return res.status(404).json({
        success: false,
        message: 'Bus not found',
        location: null
      });
    }

    // Compute schedule-based status and decide whether to expose GPS
    const now = new Date();
    const route = bus.route;
    const durMin = Number(route?.estimatedDuration) || 180;
    let scheduledStart;
    if (Array.isArray(route?.schedule) && route.schedule.length > 0) {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const times = route.schedule.map(s => String(s.startTime)).filter(Boolean).map(t => {
        const [hh, mm] = t.split(':').map(Number);
        return new Date(today.getFullYear(), today.getMonth(), today.getDate(), hh || 0, mm || 0, 0, 0);
      });
      const upcoming = times.find(t => t >= now) || times[times.length - 1] || now;
      scheduledStart = upcoming;
    } else {
      const base = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 6, 0, 0, 0);
      const freq = 30;
      const idx = Number(String(bus.busId || '').replace(/\D/g, '')) || 0;
      const offsetMin = (idx % 24) * freq;
      scheduledStart = new Date(base.getTime() + offsetMin * 60000);
      if (scheduledStart.getTime() + durMin * 60000 < now.getTime()) {
        const minsSinceBase = Math.floor((now.getTime() - base.getTime()) / 60000);
        const slotsSince = Math.ceil(minsSinceBase / freq);
        scheduledStart = new Date(base.getTime() + slotsSince * freq * 60000);
      }
    }
    const scheduledEnd = new Date(scheduledStart.getTime() + durMin * 60000);

    const geo = bus.currentLocation || {};
    const last = geo.lastUpdated ? new Date(geo.lastUpdated) : null;
    const freshMs = 3 * 60 * 1000;
    const hasRecentGPS = !!(last && (now - last) <= freshMs);

    // Extract coordinates from multiple possible shapes
    const coordsObj = geo.coordinates && typeof geo.coordinates === 'object' && !Array.isArray(geo.coordinates)
      ? geo.coordinates
      : null;
    const coordsArr = Array.isArray(geo.coordinates) ? geo.coordinates : null;
    const lon = (coordsObj?.coordinates?.[0]) ?? (coordsArr?.[0]) ?? geo.longitude ?? geo.lng ?? 0;
    const lat = (coordsObj?.coordinates?.[1]) ?? (coordsArr?.[1]) ?? geo.latitude ?? geo.lat ?? 0;

    let statusText = 'Online';
    if (now < scheduledStart) {
      statusText = 'Not started yet';
    } else if (now >= scheduledStart && !hasRecentGPS) {
      statusText = 'Not started';
    } else if (hasRecentGPS) {
      statusText = 'Running';
    }

    res.json({
      success: true,
      location: {
        busId: bus._id.toString(),
        busNumber: bus.busNumber,
        routeName: route?.name || undefined,
        latitude: hasRecentGPS ? (lat || 0) : 0,
        longitude: hasRecentGPS ? (lon || 0) : 0,
        lastUpdated: geo.lastUpdated || null,
        status: statusText,
        scheduledStart,
        scheduledEnd,
        driverName: bus.currentDriver?.name || undefined,
        driverPhone: bus.currentDriver?.phone || undefined
      }
    });

  } catch (error) {
    console.error('Error fetching bus location for Android:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bus location',
      location: null
    });
  }
});

// Get route details
router.get('/route/:routeId', async (req, res) => {
  try {
    const { routeId } = req.params;

    const route = await Route.findById(routeId)
      .populate('startLocation', 'name location')
      .populate('endLocation', 'name location')
      .populate('stops', 'name location');

    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Route not found',
        route: null
      });
    }

    // Format stops for Android app
    const formattedStops = route.stops?.map(stop => ({
      id: stop._id.toString(),
      name: stop.name,
      latitude: stop.location?.coordinates?.[1] || 0,
      longitude: stop.location?.coordinates?.[0] || 0
    })) || [];

    res.json({
      success: true,
      route: {
        id: route._id.toString(),
        name: route.name,
        startStation: {
          id: route.startLocation?._id.toString() || '',
          name: route.startLocation?.name || '',
          latitude: route.startLocation?.location?.coordinates?.[1] || 0,
          longitude: route.startLocation?.location?.coordinates?.[0] || 0
        },
        endStation: {
          id: route.endLocation?._id.toString() || '',
          name: route.endLocation?.name || '',
          latitude: route.endLocation?.location?.coordinates?.[1] || 0,
          longitude: route.endLocation?.location?.coordinates?.[0] || 0
        },
        stops: formattedStops,
        distance: route.distance || 0,
        estimatedDuration: route.estimatedDuration || 0
      }
    });

  } catch (error) {
    console.error('Error fetching route details for Android:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch route details',
      route: null
    });
  }
});

// Get all routes
router.get('/routes', async (req, res) => {
  try {
    const routes = await Route.find({})
      .populate('startLocation', 'name location')
      .populate('endLocation', 'name location');

    const formattedRoutes = routes.map(route => ({
      id: route._id.toString(),
      name: route.name,
      startStation: route.startLocation?.name || 'Unknown',
      endStation: route.endLocation?.name || 'Unknown',
      distance: route.distance || 0,
      estimatedDuration: route.estimatedDuration || 0
    }));

    res.json({
      success: true,
      routes: formattedRoutes
    });

  } catch (error) {
    console.error('Error fetching routes for Android:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch routes',
      routes: []
    });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Android API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Add GET search endpoint compatible with passenger app query params
router.get('/buses/search', async (req, res) => {
  const startedAt = Date.now();
  try {
    const { from, to } = req.query;
    console.log('🔎 [Android] GET /buses/search', { from, to });

    if (!from || !to) {
      return res.status(400).json({ success: false, message: 'from and to are required', buses: [] });
    }

    // Try exact station match first, then fuzzy
    let [fromStation, toStation] = await Promise.all([
      Station.findOne({ name: new RegExp(`^${from}$`, 'i') }),
      Station.findOne({ name: new RegExp(`^${to}$`, 'i') })
    ]);

    if (!fromStation) {
      fromStation = await Station.findOne({ name: new RegExp(from, 'i') });
    }
    if (!toStation) {
      toStation = await Station.findOne({ name: new RegExp(to, 'i') });
    }

    // Find routes by endpoints (directional: from -> to). Fallback keeps order.
    let routes = [];
    if (fromStation && toStation) {
      routes = await Route.find({
        isActive: true,
        startPoint: new RegExp(`^${fromStation.name}$`, 'i'),
        endPoint: new RegExp(`^${toStation.name}$`, 'i')
      });
    }
    if (!routes || routes.length === 0) {
      const fromEsc = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const toEsc = to.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      routes = await Route.find({
        isActive: true,
        name: { $regex: new RegExp(`${fromEsc}.*${toEsc}`, 'i') }
      });
    }

    const routeIds = routes.map(r => r._id);
    console.log(`🧭 Matching routes: ${routes.length}`);
    if (routes.length) {
      console.log('🧭 Routes sample:', routes.slice(0, 3).map(r => ({ id: r._id.toString(), name: r.name, start: r.startPoint, end: r.endPoint })));
    }

    // Find active buses on these routes
    const buses = await Bus.find({
      route: { $in: routeIds },
      status: 'active',
      isActive: true
    }).populate('route').populate('currentDriver', 'name phone');

    console.log(`🚌 Matching buses: ${buses.length}`);
    if (buses.length) {
      console.log('🚌 Buses sample:', buses.slice(0, 3).map(b => ({ id: b._id.toString(), reg: b.registrationNumber, route: b.route?.name })));
    }

    // Helper: compute schedule window and real-time status per bus
    const computeScheduleAndStatus = (bus) => {
      const now = new Date();
      const route = bus.route;
      const durMin = Number(route?.estimatedDuration) || 180;

      // If route has schedule, derive next departure; else generate simple staggered slots
      let scheduledStart;
      if (Array.isArray(route?.schedule) && route.schedule.length > 0) {
        // Pick the nearest upcoming start time today
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const starts = route.schedule.map(s => s.startTime).filter(Boolean);
        const times = starts.map(t => {
          const [hh, mm] = String(t).split(':').map(Number);
          return new Date(today.getFullYear(), today.getMonth(), today.getDate(), hh || 0, mm || 0, 0, 0);
        });
        const upcoming = times.find(t => t >= now) || times[times.length - 1];
        // If none upcoming, assume last start time of today (may be in the past)
        scheduledStart = upcoming || now;
      } else {
        // Simple fallback: base 06:00, frequency 30 min, stagger by bus index so they spread
        const base = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 6, 0, 0, 0);
        const freq = 30; // minutes
        const idx = Number(String(bus.busId).replace(/\D/g, '')) || 0;
        const offsetMin = (idx % 24) * freq; // within 12 hours window
        scheduledStart = new Date(base.getTime() + offsetMin * 60000);
        // If computed start already passed far in past, roll forward by days until in the future window of today
        if (scheduledStart.getTime() + durMin * 60000 < now.getTime()) {
          // Move to next slot after now
          const minsSinceBase = Math.floor((now.getTime() - base.getTime()) / 60000);
          const slotsSince = Math.ceil(minsSinceBase / freq);
          scheduledStart = new Date(base.getTime() + slotsSince * freq * 60000);
        }
      }
      const scheduledEnd = new Date(scheduledStart.getTime() + durMin * 60000);

      // Determine GPS freshness
      const geo = bus.currentLocation || {};
      const last = geo.lastUpdated ? new Date(geo.lastUpdated) : null;
      const freshMs = 3 * 60 * 1000; // 3 minutes threshold
      const hasRecentGPS = !!(last && (now - last) <= freshMs);

      // Derive status text based on time and GPS
      let statusText = 'Online';
      if (now < scheduledStart) {
        statusText = 'Not started yet';
      } else if (now >= scheduledStart && !hasRecentGPS) {
        statusText = 'Not started';
      } else if (hasRecentGPS) {
        statusText = 'Running';
      }

      return { scheduledStart, scheduledEnd, hasRecentGPS, statusText };
    };

    const formatted = buses.map(b => {
      const geo = b.currentLocation || {};
      const coordsObj = geo.coordinates && typeof geo.coordinates === 'object' && !Array.isArray(geo.coordinates)
        ? geo.coordinates
        : null;
      const coordsArr = Array.isArray(geo.coordinates) ? geo.coordinates : null;

      const lon =
        // GeoJSON Point inside object: { coordinates: { type: 'Point', coordinates: [lon, lat] } }
        (coordsObj?.coordinates?.[0]) ??
        // Older shape: { coordinates: [lon, lat] }
        (coordsArr?.[0]) ??
        // Flat fields
        geo.longitude ?? geo.lng ?? 0;

      const lat =
        (coordsObj?.coordinates?.[1]) ??
        (coordsArr?.[1]) ??
        geo.latitude ?? geo.lat ?? 0;

      const sched = computeScheduleAndStatus(b);

      return {
        id: b._id.toString(),
        busNumber: b.registrationNumber,
        routeName: b.route?.name || `${b.route?.startPoint || ''} - ${b.route?.endPoint || ''}`.trim(),
        driverName: b.currentDriver?.name || 'Unknown Driver',
        driverPhone: b.currentDriver?.phone || '',
        currentLatitude: sched.hasRecentGPS ? (lat || 0) : 0,
        currentLongitude: sched.hasRecentGPS ? (lon || 0) : 0,
        status: sched.statusText,
        seatsAvailable: Math.max(0, (b.capacity || 40) - (b.currentTrip?.passengersCount || 0)),
        totalSeats: b.capacity || 40,
        estimatedArrival: '15 mins',
        scheduledStart: sched.scheduledStart,
        scheduledEnd: sched.scheduledEnd,
        gpsLastUpdated: geo.lastUpdated || null
      };
    });

    const elapsed = Date.now() - startedAt;
    return res.json({
      success: true,
      buses: formatted,
      data: formatted,
      routesFound: routes.length,
      stationsResolved: { from: fromStation?.name || null, to: toStation?.name || null },
      elapsedMs: elapsed
    });

  } catch (error) {
    console.error('💥 Error in GET /api/android/buses/search:', error);
    return res.status(500).json({ success: false, message: 'Internal error', buses: [] });
  }
});

module.exports = router;