const express = require('express');
const router = express.Router();
const Route = require('../models/Route');
const Bus = require('../models/Bus');

// Get all routes
router.get('/', async (req, res) => {
  try {
    const routes = await Route.find()
      .populate('startLocation', 'name location')
      .populate('endLocation', 'name location')
      .populate('stops', 'name location');
    
    res.json({
      success: true,
      data: routes
    });
  } catch (error) {
    console.error('Error fetching routes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch routes'
    });
  }
});

// Get route by ID
router.get('/:id', async (req, res) => {
  try {
    const route = await Route.findById(req.params.id)
      .populate('startLocation', 'name location')
      .populate('endLocation', 'name location')
      .populate('stops', 'name location');
    
    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Route not found'
      });
    }

    res.json({
      success: true,
      data: route
    });
  } catch (error) {
    console.error('Error fetching route:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch route'
    });
  }
});

// Get buses on a specific route
router.get('/:id/buses', async (req, res) => {
  try {
    const buses = await Bus.find({ route: req.params.id })
      .populate('driver', 'name phone');
    
    res.json({
      success: true,
      data: buses
    });
  } catch (error) {
    console.error('Error fetching buses on route:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch buses on route'
    });
  }
});

// Search routes
router.get('/search/:query', async (req, res) => {
  try {
    const query = req.params.query;
    const routes = await Route.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } }
      ]
    })
    .populate('startLocation', 'name location')
    .populate('endLocation', 'name location')
    .populate('stops', 'name location');
    
    res.json({
      success: true,
      data: routes
    });
  } catch (error) {
    console.error('Error searching routes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search routes'
    });
  }
});

// Get routes between two stations
router.post('/between', async (req, res) => {
  try {
    const { startStationId, endStationId } = req.body;
    
    if (!startStationId || !endStationId) {
      return res.status(400).json({
        success: false,
        message: 'Start and end station IDs are required'
      });
    }

    const routes = await Route.find({
      $or: [
        { startLocation: startStationId, endLocation: endStationId },
        { startLocation: endStationId, endLocation: startStationId },
        { stops: { $all: [startStationId, endStationId] } }
      ]
    })
    .populate('startLocation', 'name location')
    .populate('endLocation', 'name location')
    .populate('stops', 'name location');
    
    res.json({
      success: true,
      data: routes
    });
  } catch (error) {
    console.error('Error finding routes between stations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to find routes between stations'
    });
  }
});

// Create new route
router.post('/', async (req, res) => {
  try {
    const routeData = req.body;
    const route = new Route(routeData);
    await route.save();

    const populatedRoute = await Route.findById(route._id)
      .populate('startLocation', 'name location')
      .populate('endLocation', 'name location')
      .populate('stops', 'name location');

    res.status(201).json({
      success: true,
      data: populatedRoute,
      message: 'Route created successfully'
    });
  } catch (error) {
    console.error('Error creating route:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create route'
    });
  }
});

// Update route
router.put('/:id', async (req, res) => {
  try {
    const route = await Route.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
    .populate('startLocation', 'name location')
    .populate('endLocation', 'name location')
    .populate('stops', 'name location');

    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Route not found'
      });
    }

    res.json({
      success: true,
      data: route,
      message: 'Route updated successfully'
    });
  } catch (error) {
    console.error('Error updating route:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update route'
    });
  }
});

// Delete route
router.delete('/:id', async (req, res) => {
  try {
    // Check if route has assigned buses
    const assignedBuses = await Bus.find({ route: req.params.id });
    if (assignedBuses.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete route. Buses are assigned to this route.'
      });
    }

    const route = await Route.findByIdAndDelete(req.params.id);
    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Route not found'
      });
    }

    res.json({
      success: true,
      message: 'Route deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting route:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete route'
    });
  }
});

module.exports = router;