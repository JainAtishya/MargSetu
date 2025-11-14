const express = require('express');
const router = express.Router();
const Bus = require('../models/Bus');

// Get all buses
router.get('/', async (req, res) => {
  try {
    const buses = await Bus.find()
      .populate('route', 'name startLocation endLocation')
      .populate('driver', 'name phone');
    
    res.json({
      success: true,
      data: buses
    });
  } catch (error) {
    console.error('Error fetching buses:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch buses'
    });
  }
});

// Get bus by ID
router.get('/:id', async (req, res) => {
  try {
    const bus = await Bus.findById(req.params.id)
      .populate('route')
      .populate('driver');
    
    if (!bus) {
      return res.status(404).json({
        success: false,
        message: 'Bus not found'
      });
    }

    res.json({
      success: true,
      data: bus
    });
  } catch (error) {
    console.error('Error fetching bus:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bus'
    });
  }
});

// Get buses by route
router.get('/route/:routeId', async (req, res) => {
  try {
    const buses = await Bus.find({ route: req.params.routeId })
      .populate('route', 'name startLocation endLocation')
      .populate('driver', 'name phone');
    
    res.json({
      success: true,
      data: buses
    });
  } catch (error) {
    console.error('Error fetching buses by route:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch buses by route'
    });
  }
});

// Search buses
router.get('/search/:query', async (req, res) => {
  try {
    const query = req.params.query;
    const buses = await Bus.find({
      $or: [
        { busNumber: { $regex: query, $options: 'i' } },
        { licensePlate: { $regex: query, $options: 'i' } }
      ]
    })
    .populate('route', 'name startLocation endLocation')
    .populate('driver', 'name phone');
    
    res.json({
      success: true,
      data: buses
    });
  } catch (error) {
    console.error('Error searching buses:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search buses'
    });
  }
});

// Get bus current location
router.get('/:id/location', async (req, res) => {
  try {
    const bus = await Bus.findById(req.params.id, 'busNumber currentLocation lastUpdated');
    
    if (!bus) {
      return res.status(404).json({
        success: false,
        message: 'Bus not found'
      });
    }

    res.json({
      success: true,
      data: {
        busId: bus._id,
        busNumber: bus.busNumber,
        currentLocation: bus.currentLocation,
        lastUpdated: bus.lastUpdated
      }
    });
  } catch (error) {
    console.error('Error fetching bus location:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bus location'
    });
  }
});

// Update bus location (for driver app)
router.put('/:id/location', async (req, res) => {
  try {
    const { lat, lng } = req.body;
    
    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    const bus = await Bus.findByIdAndUpdate(
      req.params.id,
      {
        currentLocation: { lat, lng },
        lastUpdated: new Date()
      },
      { new: true }
    );

    if (!bus) {
      return res.status(404).json({
        success: false,
        message: 'Bus not found'
      });
    }

    // Emit location update via WebSocket
    if (global.io) {
      global.io.to(`bus-${bus._id}`).emit('location-update', {
        busId: bus._id,
        location: { lat, lng },
        timestamp: new Date(),
        busNumber: bus.busNumber
      });
    }

    res.json({
      success: true,
      data: bus,
      message: 'Bus location updated successfully'
    });
  } catch (error) {
    console.error('Error updating bus location:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update bus location'
    });
  }
});

// Update bus status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['active', 'inactive', 'maintenance', 'out-of-service'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Valid statuses: ' + validStatuses.join(', ')
      });
    }

    const bus = await Bus.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate('route', 'name').populate('driver', 'name');

    if (!bus) {
      return res.status(404).json({
        success: false,
        message: 'Bus not found'
      });
    }

    res.json({
      success: true,
      data: bus,
      message: 'Bus status updated successfully'
    });
  } catch (error) {
    console.error('Error updating bus status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update bus status'
    });
  }
});

// Create new bus
router.post('/', async (req, res) => {
  try {
    const busData = req.body;
    const bus = new Bus(busData);
    await bus.save();

    const populatedBus = await Bus.findById(bus._id)
      .populate('route', 'name startLocation endLocation')
      .populate('driver', 'name phone');

    res.status(201).json({
      success: true,
      data: populatedBus,
      message: 'Bus created successfully'
    });
  } catch (error) {
    console.error('Error creating bus:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create bus'
    });
  }
});

// Update bus
router.put('/:id', async (req, res) => {
  try {
    const bus = await Bus.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
    .populate('route', 'name startLocation endLocation')
    .populate('driver', 'name phone');

    if (!bus) {
      return res.status(404).json({
        success: false,
        message: 'Bus not found'
      });
    }

    res.json({
      success: true,
      data: bus,
      message: 'Bus updated successfully'
    });
  } catch (error) {
    console.error('Error updating bus:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update bus'
    });
  }
});

// Delete bus
router.delete('/:id', async (req, res) => {
  try {
    const bus = await Bus.findByIdAndDelete(req.params.id);
    if (!bus) {
      return res.status(404).json({
        success: false,
        message: 'Bus not found'
      });
    }

    res.json({
      success: true,
      message: 'Bus deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting bus:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete bus'
    });
  }
});

module.exports = router;