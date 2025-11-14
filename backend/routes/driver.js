const express = require('express');
const router = express.Router();
const Driver = require('../models/Driver');
const Bus = require('../models/Bus');

// Get all drivers
router.get('/', async (req, res) => {
  try {
    const drivers = await Driver.find().populate('authority');
    res.json({
      success: true,
      data: drivers
    });
  } catch (error) {
    console.error('Error fetching drivers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch drivers'
    });
  }
});

// Get driver by ID
router.get('/:id', async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id).populate('authority');
    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }

    res.json({
      success: true,
      data: driver
    });
  } catch (error) {
    console.error('Error fetching driver:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch driver'
    });
  }
});

// Get driver's assigned bus
router.get('/:id/bus', async (req, res) => {
  try {
    const bus = await Bus.findOne({ driver: req.params.id })
      .populate('route')
      .populate('driver');
    
    if (!bus) {
      return res.status(404).json({
        success: false,
        message: 'No bus assigned to this driver'
      });
    }

    res.json({
      success: true,
      data: bus
    });
  } catch (error) {
    console.error('Error fetching driver bus:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch driver bus'
    });
  }
});

// Create new driver
router.post('/', async (req, res) => {
  try {
    const driverData = req.body;
    const driver = new Driver(driverData);
    await driver.save();

    res.status(201).json({
      success: true,
      data: driver,
      message: 'Driver created successfully'
    });
  } catch (error) {
    console.error('Error creating driver:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create driver'
    });
  }
});

// Update driver
router.put('/:id', async (req, res) => {
  try {
    const driver = await Driver.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('authority');

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }

    res.json({
      success: true,
      data: driver,
      message: 'Driver updated successfully'
    });
  } catch (error) {
    console.error('Error updating driver:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update driver'
    });
  }
});

// Update driver status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const driver = await Driver.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }

    res.json({
      success: true,
      data: driver,
      message: 'Driver status updated successfully'
    });
  } catch (error) {
    console.error('Error updating driver status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update driver status'
    });
  }
});

// Delete driver
router.delete('/:id', async (req, res) => {
  try {
    // Check if driver is assigned to any bus
    const assignedBus = await Bus.findOne({ driver: req.params.id });
    if (assignedBus) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete driver. Driver is assigned to a bus.'
      });
    }

    const driver = await Driver.findByIdAndDelete(req.params.id);
    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }

    res.json({
      success: true,
      message: 'Driver deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting driver:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete driver'
    });
  }
});

module.exports = router;