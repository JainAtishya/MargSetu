const { Driver, Bus, Location, Route } = require('../models');
const { generateTripId } = require('../utils/helpers');

// Update bus location - for drivers
const updateLocation = async (req, res) => {
    try {
        const {
            busId,
            latitude,
            longitude,
            speed = 0,
            heading = 0,
            accuracy = 10,
            altitude = 0,
            tripId: tripIdInput,
            passengers = { onboard: 0, boarded: 0, alighted: 0 },
            deviceInfo = {}
        } = req.body;

        // Verify driver is authorized for this bus
        const driver = req.user;
        const bus = await Bus.findOne({ busId }).populate('route');

        if (!bus) {
            return res.status(404).json({
                success: false,
                message: 'Bus not found'
            });
        }

        // DEBUG: Check driver assignment
        console.log('🔍 DEBUG - Driver assignment check:');
        console.log('   Driver ID:', driver._id?.toString());
        console.log('   Driver driverId:', driver.driverId);
        console.log('   Driver currentBus:', driver.currentBus);
        console.log('   Driver currentBus type:', typeof driver.currentBus);
        console.log('   Driver currentBus._id:', driver.currentBus?._id?.toString());
        console.log('   Bus _id:', bus._id?.toString());
        console.log('   Bus busId:', bus.busId);
        if (driver.currentBus && bus._id) {
            console.log('   ID comparison:', driver.currentBus._id?.toString() === bus._id.toString());
        }

        // Check if driver is assigned to this bus
        if (!driver.currentBus || driver.currentBus._id.toString() !== bus._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Driver not assigned to this bus'
            });
        }

        // Determine tripId: use provided, or current bus trip, or auto-generate if needed
        let tripId = tripIdInput;
        if (!tripId) {
            // If bus has an active trip, reuse it
            if (bus.currentTrip && bus.currentTrip.tripId) {
                tripId = bus.currentTrip.tripId;
            } else {
                // Lazy-start a trip to avoid rejecting location updates from clients that don't call start-trip
                if (typeof bus.startTrip === 'function') {
                    const { generateTripId } = require('../utils/helpers');
                    const newTripId = generateTripId(busId);
                    await bus.startTrip(newTripId);
                    await bus.save();
                    tripId = newTripId;
                    try {
                        const ts = new Date().toISOString();
                        const dId = driver?.driverId || driver?._id?.toString?.() || 'unknown';
                        console.log(`🚌  [TRIP-AUTO-START] bus=${busId} trip=${newTripId} reason=location-update driver=${dId} @ ${ts}`);
                    } catch (_) { }
                }
            }
        }

        // Log concise network GPS update for terminal visibility
        try {
            const ts = new Date().toISOString();
            const dId = driver?.driverId || driver?._id?.toString?.() || 'unknown';
            const sp = Number(speed) || 0;
            const hd = Number(heading) || 0;
            console.log(`📍  [NET-GPS] bus=${busId} lat=${latitude} lng=${longitude} speed=${sp} heading=${hd} trip=${tripId || 'n/a'} driver=${dId} @ ${ts}`);
        } catch (_) {
            // best-effort logging; do not block
        }

        // Create location record
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
                appVersion: deviceInfo.appVersion || req.headers['x-app-version']
            },
            source: 'gps'
        });

        await locationData.save();

        // Update bus current location
        await bus.updateLocation(latitude, longitude, speed, heading);

        // Update passenger count in bus
        if (passengers.onboard !== undefined) {
            bus.currentTrip.passengersCount = passengers.onboard;
            await bus.save();
        }

        // Emit real-time location update via Socket.IO
        const io = req.app.get('io');

        // Broadcast to passengers tracking this bus
        io.to(`bus-${busId}`).emit('locationUpdate', {
            busId,
            location: {
                latitude,
                longitude,
                speed,
                heading,
                lastUpdated: new Date()
            },
            passengers: passengers.onboard,
            tripId
        });

        // Broadcast to authority dashboard
        io.to('authority-dashboard').emit('busLocationUpdate', {
            busId,
            driverId: driver.driverId,
            location: {
                latitude,
                longitude,
                speed,
                heading,
                lastUpdated: new Date()
            },
            status: bus.operationalStatus,
            passengers: passengers.onboard,
            tripId
        });

        res.json({
            success: true,
            message: 'Location updated successfully',
            data: {
                locationId: locationData._id,
                timestamp: locationData.createdAt,
                nextUpdateIn: 10 // seconds
            }
        });

    } catch (error) {
        console.error('Update location error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error updating location'
        });
    }
};

// Get bus location - for passengers
const getBusLocation = async (req, res) => {
    try {
        const { busId } = req.params;
        const { includeRoute = 'false', includeETA = 'false' } = req.query;

        // Find bus
        const bus = await Bus.findOne({ busId, isActive: true })
            .populate('route', 'name startPoint endPoint stops')
            .populate('currentDriver', 'driverId name phone');

        if (!bus) {
            return res.status(404).json({
                success: false,
                message: 'Bus not found or inactive'
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

        // Calculate how old the location data is
        const lastUpdateMinutes = Math.floor((Date.now() - latestLocation.createdAt) / (1000 * 60));

        // Prepare response data
        const responseData = {
            busId: bus.busId,
            registrationNumber: bus.registrationNumber,
            status: bus.status,
            operationalStatus: bus.operationalStatus,
            location: {
                latitude: latestLocation.latitude,
                longitude: latestLocation.longitude,
                speed: latestLocation.speed,
                heading: latestLocation.heading,
                accuracy: latestLocation.accuracy,
                lastUpdated: latestLocation.createdAt,
                lastUpdateMinutes
            },
            currentTrip: {
                tripId: latestLocation.tripId,
                startTime: bus.currentTrip.startTime,
                currentStopOrder: bus.currentTrip.currentStopOrder,
                direction: bus.currentTrip.direction,
                passengersCount: latestLocation.passengers?.onboard || 0
            },
            driver: bus.currentDriver ? {
                id: bus.currentDriver.driverId,
                name: bus.currentDriver.name,
                phone: bus.currentDriver.phone
            } : null,
            lastUpdateStatus: lastUpdateMinutes < 2 ? 'live' : lastUpdateMinutes < 10 ? 'recent' : 'stale'
        };

        // Include route information if requested
        if (includeRoute === 'true' && bus.route) {
            responseData.route = {
                id: bus.route.routeId,
                name: bus.route.name,
                startPoint: bus.route.startPoint,
                endPoint: bus.route.endPoint,
                stops: bus.route.stops
            };
        }

        // Include ETA calculations if requested
        if (includeETA === 'true' && bus.route) {
            const etaData = await calculateETA(bus, latestLocation);
            responseData.eta = etaData;
        }

        res.json({
            success: true,
            data: responseData
        });

    } catch (error) {
        console.error('Get bus location error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error retrieving bus location'
        });
    }
};

// Get nearby buses - for passengers
const getNearbyBuses = async (req, res) => {
    try {
        const { latitude, longitude, radius = 5000 } = req.query;

        if (!latitude || !longitude) {
            return res.status(400).json({
                success: false,
                message: 'Latitude and longitude are required'
            });
        }

        const lat = parseFloat(latitude);
        const lng = parseFloat(longitude);
        const maxDistance = parseInt(radius);

        // Find nearby buses using geospatial query
        const nearbyLocations = await Location.findNearbyBuses(lng, lat, maxDistance);

        const buses = [];
        for (const location of nearbyLocations) {
            if (location.busInfo && location.busInfo.length > 0) {
                const bus = location.busInfo[0];
                const driver = await Driver.findById(location.driver).select('driverId name');

                buses.push({
                    busId: bus.busId,
                    registrationNumber: bus.registrationNumber,
                    status: bus.status,
                    operationalStatus: bus.operationalStatus,
                    location: {
                        latitude: location.latitude,
                        longitude: location.longitude,
                        speed: location.speed,
                        lastUpdated: location.createdAt,
                        distance: Math.round(location.distance)
                    },
                    driver: driver ? {
                        id: driver.driverId,
                        name: driver.name
                    } : null,
                    passengers: location.passengers?.onboard || 0
                });
            }
        }

        res.json({
            success: true,
            data: {
                buses,
                searchRadius: maxDistance,
                searchCenter: { latitude: lat, longitude: lng },
                totalFound: buses.length
            }
        });

    } catch (error) {
        console.error('Get nearby buses error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error finding nearby buses'
        });
    }
};

// Get bus route with current position - for passengers
const getBusRoute = async (req, res) => {
    try {
        const { busId } = req.params;

        const bus = await Bus.findOne({ busId, isActive: true })
            .populate('route');

        if (!bus || !bus.route) {
            return res.status(404).json({
                success: false,
                message: 'Bus or route not found'
            });
        }

        // Get latest location to determine current position on route
        const latestLocation = await Location.getLatestForBus(bus._id);

        // Calculate which stop the bus is closest to
        let nearestStop = null;
        let nearestDistance = Infinity;

        if (latestLocation && bus.route.stops.length > 0) {
            for (const stop of bus.route.stops) {
                const distance = latestLocation.distanceFrom(
                    stop.coordinates.longitude,
                    stop.coordinates.latitude
                );

                if (distance < nearestDistance) {
                    nearestDistance = distance;
                    nearestStop = {
                        ...stop.toObject(),
                        distanceFromBus: Math.round(distance * 1000) // in meters
                    };
                }
            }
        }

        res.json({
            success: true,
            data: {
                bus: {
                    busId: bus.busId,
                    registrationNumber: bus.registrationNumber,
                    status: bus.status,
                    operationalStatus: bus.operationalStatus
                },
                route: bus.route,
                currentLocation: latestLocation ? {
                    latitude: latestLocation.latitude,
                    longitude: latestLocation.longitude,
                    lastUpdated: latestLocation.createdAt
                } : null,
                nearestStop,
                currentTrip: bus.currentTrip
            }
        });

    } catch (error) {
        console.error('Get bus route error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error retrieving bus route'
        });
    }
};

// Start trip - for drivers
const startTrip = async (req, res) => {
    try {
        const { busId, routeDirection = 'forward' } = req.body;
        const driver = req.user;

        const bus = await Bus.findOne({ busId }).populate('route');

        if (!bus) {
            return res.status(404).json({
                success: false,
                message: 'Bus not found'
            });
        }

        // Check if driver is assigned to this bus
        if (!driver.currentBus || driver.currentBus._id.toString() !== bus._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Driver not assigned to this bus'
            });
        }

        // Generate trip ID
        const tripId = generateTripId(busId);

        // Start trip
        await bus.startTrip(tripId);
        bus.currentTrip.direction = routeDirection;
        await bus.save();

        // Update driver status
        driver.isOnDuty = true;
        await driver.save();

        // Log trip start for internet-based journeys
        try {
            const ts = new Date().toISOString();
            const dId = driver?.driverId || driver?._id?.toString?.() || 'unknown';
            console.log(`🚌  [TRIP-START] bus=${busId} trip=${tripId} direction=${routeDirection} driver=${dId} @ ${ts}`);
        } catch (_) {
            // best-effort logging
        }

        // Notify authorities
        const io = req.app.get('io');
        io.to('authority-dashboard').emit('tripStarted', {
            busId,
            driverId: driver.driverId,
            tripId,
            startTime: new Date(),
            route: bus.route?.name
        });

        res.json({
            success: true,
            message: 'Trip started successfully',
            data: {
                tripId,
                busId,
                startTime: bus.currentTrip.startTime,
                direction: routeDirection,
                route: bus.route
            }
        });

    } catch (error) {
        console.error('Start trip error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error starting trip'
        });
    }
};

// End trip - for drivers
const endTrip = async (req, res) => {
    try {
        const { busId } = req.body;
        const driver = req.user;

        const bus = await Bus.findOne({ busId });

        if (!bus) {
            return res.status(404).json({
                success: false,
                message: 'Bus not found'
            });
        }

        // Check if driver is assigned to this bus
        if (!driver.currentBus || driver.currentBus._id.toString() !== bus._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Driver not assigned to this bus'
            });
        }

        const tripId = bus.currentTrip.tripId;

        // End trip
        await bus.endTrip();

        // Update driver status
        driver.isOnDuty = false;
        driver.totalTrips += 1;
        await driver.save();

        // Log trip end
        try {
            const ts = new Date().toISOString();
            const dId = driver?.driverId || driver?._id?.toString?.() || 'unknown';
            console.log(`🧭  [TRIP-END] bus=${busId} trip=${tripId} driver=${dId} @ ${ts}`);
        } catch (_) {
            // best-effort logging
        }

        // Notify authorities
        const io = req.app.get('io');
        io.to('authority-dashboard').emit('tripEnded', {
            busId,
            driverId: driver.driverId,
            tripId,
            endTime: new Date()
        });

        res.json({
            success: true,
            message: 'Trip ended successfully',
            data: {
                tripId,
                busId,
                endTime: new Date()
            }
        });

    } catch (error) {
        console.error('End trip error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error ending trip'
        });
    }
};

// Helper function to calculate ETA (basic implementation)
const calculateETA = async (bus, currentLocation) => {
    try {
        const route = bus.route;
        const currentStopOrder = bus.currentTrip.currentStopOrder;

        if (!route || !route.stops || route.stops.length === 0) {
            return null;
        }

        const remainingStops = route.stops
            .filter(stop => stop.order > currentStopOrder)
            .sort((a, b) => a.order - b.order);

        const etas = [];
        let estimatedTime = 0;

        for (const stop of remainingStops) {
            // Simple ETA calculation based on average speed and distance
            const avgSpeed = currentLocation.speed || 20; // Default 20 km/h
            const distance = currentLocation.distanceFrom(
                stop.coordinates.longitude,
                stop.coordinates.latitude
            );

            estimatedTime += (distance / avgSpeed) * 60; // Convert to minutes

            etas.push({
                stopName: stop.name,
                stopOrder: stop.order,
                estimatedArrival: new Date(Date.now() + estimatedTime * 60000),
                estimatedMinutes: Math.round(estimatedTime),
                distance: Math.round(distance * 1000) // in meters
            });
        }

        return {
            nextStop: etas[0] || null,
            allUpcomingStops: etas,
            totalRemainingTime: Math.round(estimatedTime),
            lastCalculated: new Date()
        };

    } catch (error) {
        console.error('ETA calculation error:', error);
        return null;
    }
};

module.exports = {
    updateLocation,
    getBusLocation,
    getNearbyBuses,
    getBusRoute,
    startTrip,
    endTrip,
    // New: provide a simple way for client to fetch a valid tripId
    async getOrCreateTripId(req, res) {
        try {
            const { busId, routeDirection = 'forward' } = req.body;
            const driver = req.user;

            const bus = await Bus.findOne({ busId }).populate('route');
            if (!bus) {
                return res.status(404).json({ success: false, message: 'Bus not found' });
            }

            if (!driver.currentBus || driver.currentBus._id.toString() !== bus._id.toString()) {
                return res.status(403).json({ success: false, message: 'Driver not assigned to this bus' });
            }

            let tripId = bus.currentTrip?.tripId;
            if (!tripId) {
                const { generateTripId } = require('../utils/helpers');
                tripId = generateTripId(busId);
                await bus.startTrip(tripId);
                bus.currentTrip.direction = routeDirection;
                await bus.save();
                try {
                    const ts = new Date().toISOString();
                    const dId = driver?.driverId || driver?._id?.toString?.() || 'unknown';
                    console.log(`🚌  [TRIP-START] bus=${busId} trip=${tripId} direction=${routeDirection} driver=${dId} @ ${ts}`);
                } catch (_) { }
            }

            return res.json({ success: true, data: { tripId, busId, direction: bus.currentTrip?.direction || routeDirection } });
        } catch (error) {
            console.error('Get or create tripId error:', error);
            res.status(500).json({ success: false, message: 'Server error getting trip ID' });
        }
    }
};