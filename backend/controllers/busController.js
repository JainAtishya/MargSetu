const { Bus, Driver, Route, Location } = require('../models');

// Get all buses - for authorities
const getAllBuses = async (req, res) => {
  try {
    const { status, route, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    // Build filter
    const filter = { isActive: true };
    if (status) filter.status = status;
    if (route) filter.route = route;

    const buses = await Bus.find(filter)
      .populate('route', 'routeId name startPoint endPoint')
      .populate('currentDriver', 'driverId name phone')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ busId: 1 });

    const total = await Bus.countDocuments(filter);

    // Get latest locations for each bus
    const busesWithLocation = await Promise.all(
      buses.map(async (bus) => {
        const latestLocation = await Location.getLatestForBus(bus._id);
        return {
          ...bus.toObject(),
          latestLocation: latestLocation ? {
            latitude: latestLocation.latitude,
            longitude: latestLocation.longitude,
            speed: latestLocation.speed,
            lastUpdated: latestLocation.createdAt,
            ageMinutes: Math.floor((Date.now() - latestLocation.createdAt) / (1000 * 60))
          } : null
        };
      })
    );

    res.json({
      success: true,
      data: {
        buses: busesWithLocation,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(total / limit),
          hasNext: skip + buses.length < total,
          hasPrev: page > 1
        },
        summary: {
          total,
          active: buses.filter(b => b.status === 'active').length,
          running: buses.filter(b => b.operationalStatus === 'running').length,
          idle: buses.filter(b => b.operationalStatus === 'idle').length
        }
      }
    });

  } catch (error) {
    console.error('Get all buses error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving buses'
    });
  }
};

// Get single bus details - for authorities and drivers
const getBusById = async (req, res) => {
  try {
    const { busId } = req.params;

    const bus = await Bus.findOne({ busId, isActive: true })
      .populate('route')
      .populate('currentDriver', 'driverId name phone emergencyContact');

    if (!bus) {
      return res.status(404).json({
        success: false,
        message: 'Bus not found'
      });
    }

    // Get recent locations (last 10)
    const recentLocations = await Location.find({ bus: bus._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('coordinates speed createdAt tripId passengers');

    // Get current trip details
    const currentTrip = bus.currentTrip.tripId ? {
      ...bus.currentTrip.toObject(),
      duration: bus.currentTrip.startTime ? 
        Math.floor((Date.now() - bus.currentTrip.startTime) / (1000 * 60)) : null
    } : null;

    res.json({
      success: true,
      data: {
        bus: bus.toObject(),
        recentLocations,
        currentTrip,
        stats: {
          totalLocationsToday: await Location.countDocuments({
            bus: bus._id,
            createdAt: { $gte: new Date().setHours(0, 0, 0, 0) }
          }),
          averageSpeed: recentLocations.length > 0 ? 
            Math.round(recentLocations.reduce((sum, loc) => sum + loc.speed, 0) / recentLocations.length) : 0
        }
      }
    });

  } catch (error) {
    console.error('Get bus by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving bus details'
    });
  }
};

// Create new bus - for authorities
const createBus = async (req, res) => {
  try {
    const busData = req.body;

    // Check if bus already exists
    const existingBus = await Bus.findOne({
      $or: [
        { busId: busData.busId },
        { registrationNumber: busData.registrationNumber }
      ]
    });

    if (existingBus) {
      return res.status(400).json({
        success: false,
        message: 'Bus with this ID or registration number already exists'
      });
    }

    // Verify route exists
    if (busData.route) {
      const route = await Route.findById(busData.route);
      if (!route) {
        return res.status(400).json({
          success: false,
          message: 'Invalid route ID'
        });
      }
    }

    const bus = new Bus(busData);
    await bus.save();

    const populatedBus = await Bus.findById(bus._id)
      .populate('route', 'routeId name startPoint endPoint');

    res.status(201).json({
      success: true,
      message: 'Bus created successfully',
      data: { bus: populatedBus }
    });

  } catch (error) {
    console.error('Create bus error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating bus'
    });
  }
};

// Update bus - for authorities
const updateBus = async (req, res) => {
  try {
    const { busId } = req.params;
    const updates = req.body;

    // Don't allow updating these fields directly
    delete updates.busId;
    delete updates.currentLocation;
    delete updates.currentTrip;

    // Verify route if being updated
    if (updates.route) {
      const route = await Route.findById(updates.route);
      if (!route) {
        return res.status(400).json({
          success: false,
          message: 'Invalid route ID'
        });
      }
    }

    const bus = await Bus.findOneAndUpdate(
      { busId, isActive: true },
      updates,
      { new: true, runValidators: true }
    ).populate('route', 'routeId name startPoint endPoint')
     .populate('currentDriver', 'driverId name');

    if (!bus) {
      return res.status(404).json({
        success: false,
        message: 'Bus not found'
      });
    }

    res.json({
      success: true,
      message: 'Bus updated successfully',
      data: { bus }
    });

  } catch (error) {
    console.error('Update bus error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating bus'
    });
  }
};

// Assign driver to bus - for authorities
const assignDriver = async (req, res) => {
  try {
    const { busId } = req.params;
    const { driverId } = req.body;

    const bus = await Bus.findOne({ busId, isActive: true });
    const driver = await Driver.findOne({ driverId, isActive: true });

    if (!bus) {
      return res.status(404).json({
        success: false,
        message: 'Bus not found'
      });
    }

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }

    // Check if driver is already assigned to another bus
    if (driver.currentBus && driver.currentBus.toString() !== bus._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Driver is already assigned to another bus'
      });
    }

    // Check if bus already has a driver
    if (bus.currentDriver && bus.currentDriver.toString() !== driver._id.toString()) {
      // Unassign previous driver
      await Driver.findByIdAndUpdate(bus.currentDriver, { 
        currentBus: null,
        isOnDuty: false 
      });
    }

    // Assign driver to bus
    bus.currentDriver = driver._id;
    await bus.save();

    // Update driver assignment
    driver.currentBus = bus._id;
    await driver.save();

    const updatedBus = await Bus.findById(bus._id)
      .populate('currentDriver', 'driverId name phone')
      .populate('route', 'routeId name');

    res.json({
      success: true,
      message: 'Driver assigned successfully',
      data: { bus: updatedBus }
    });

  } catch (error) {
    console.error('Assign driver error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error assigning driver'
    });
  }
};

// Unassign driver from bus - for authorities
const unassignDriver = async (req, res) => {
  try {
    const { busId } = req.params;

    const bus = await Bus.findOne({ busId, isActive: true })
      .populate('currentDriver');

    if (!bus) {
      return res.status(404).json({
        success: false,
        message: 'Bus not found'
      });
    }

    if (!bus.currentDriver) {
      return res.status(400).json({
        success: false,
        message: 'No driver assigned to this bus'
      });
    }

    // Check if bus is currently running a trip
    if (bus.operationalStatus === 'running') {
      return res.status(400).json({
        success: false,
        message: 'Cannot unassign driver while bus is running a trip'
      });
    }

    // Unassign driver
    const driver = bus.currentDriver;
    bus.currentDriver = null;
    await bus.save();

    // Update driver
    driver.currentBus = null;
    driver.isOnDuty = false;
    await driver.save();

    res.json({
      success: true,
      message: 'Driver unassigned successfully',
      data: {
        bus: { busId: bus.busId, currentDriver: null },
        driver: { driverId: driver.driverId, currentBus: null }
      }
    });

  } catch (error) {
    console.error('Unassign driver error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error unassigning driver'
    });
  }
};

// Delete bus - for authorities (soft delete)
const deleteBus = async (req, res) => {
  try {
    const { busId } = req.params;

    const bus = await Bus.findOne({ busId, isActive: true })
      .populate('currentDriver');

    if (!bus) {
      return res.status(404).json({
        success: false,
        message: 'Bus not found'
      });
    }

    // Check if bus is currently active
    if (bus.operationalStatus === 'running') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete bus while it is running a trip'
      });
    }

    // Unassign driver if any
    if (bus.currentDriver) {
      bus.currentDriver.currentBus = null;
      bus.currentDriver.isOnDuty = false;
      await bus.currentDriver.save();
    }

    // Soft delete
    bus.isActive = false;
    bus.status = 'inactive';
    bus.currentDriver = null;
    await bus.save();

    res.json({
      success: true,
      message: 'Bus deleted successfully'
    });

  } catch (error) {
    console.error('Delete bus error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting bus'
    });
  }
};

// Get bus performance stats - for authorities
const getBusStats = async (req, res) => {
  try {
    const { busId } = req.params;
    const { startDate, endDate } = req.query;

    const bus = await Bus.findOne({ busId, isActive: true });
    if (!bus) {
      return res.status(404).json({
        success: false,
        message: 'Bus not found'
      });
    }

    // Date range filter
    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    const locationFilter = { bus: bus._id };
    if (Object.keys(dateFilter).length > 0) {
      locationFilter.createdAt = dateFilter;
    }

    // Get location statistics
    const locations = await Location.find(locationFilter)
      .sort({ createdAt: 1 });

    if (locations.length === 0) {
      return res.json({
        success: true,
        data: {
          busId,
          period: { startDate, endDate },
          stats: {
            totalDistance: 0,
            averageSpeed: 0,
            maxSpeed: 0,
            totalTrips: 0,
            operatingHours: 0,
            locations: 0
          }
        }
      });
    }

    // Calculate statistics
    let totalDistance = 0;
    let totalSpeed = 0;
    let maxSpeed = 0;
    const tripIds = new Set();

    for (let i = 1; i < locations.length; i++) {
      const prev = locations[i - 1];
      const curr = locations[i];
      
      // Calculate distance between consecutive points
      const distance = prev.distanceFrom(curr.longitude, curr.latitude);
      totalDistance += distance;
      
      // Speed statistics
      totalSpeed += curr.speed;
      maxSpeed = Math.max(maxSpeed, curr.speed);
      
      // Count unique trips
      if (curr.tripId) tripIds.add(curr.tripId);
    }

    const averageSpeed = locations.length > 0 ? totalSpeed / locations.length : 0;
    const operatingHours = locations.length > 0 ? 
      (locations[locations.length - 1].createdAt - locations[0].createdAt) / (1000 * 60 * 60) : 0;

    res.json({
      success: true,
      data: {
        busId,
        period: { startDate, endDate },
        stats: {
          totalDistance: Math.round(totalDistance * 100) / 100, // Round to 2 decimal places
          averageSpeed: Math.round(averageSpeed * 100) / 100,
          maxSpeed: Math.round(maxSpeed * 100) / 100,
          totalTrips: tripIds.size,
          operatingHours: Math.round(operatingHours * 100) / 100,
          totalLocations: locations.length,
          efficiency: locations.length > 0 ? Math.round((totalDistance / operatingHours) * 100) / 100 : 0
        }
      }
    });

  } catch (error) {
    console.error('Get bus stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving bus statistics'
    });
  }
};

module.exports = {
  getAllBuses,
  getBusById,
  createBus,
  updateBus,
  assignDriver,
  unassignDriver,
  deleteBus,
  getBusStats
};