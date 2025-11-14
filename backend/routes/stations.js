const express = require('express');
const router = express.Router();
const Station = require('../models/Station');

// Get all stations
router.get('/', async (req, res) => {
  try {
    const stations = await Station.find();
    res.json({
      success: true,
      data: stations
    });
  } catch (error) {
    console.error('Error fetching stations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stations'
    });
  }
});

// Get station by ID
router.get('/:id', async (req, res) => {
  try {
    const station = await Station.findById(req.params.id);
    if (!station) {
      return res.status(404).json({
        success: false,
        message: 'Station not found'
      });
    }

    res.json({
      success: true,
      data: station
    });
  } catch (error) {
    console.error('Error fetching station:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch station'
    });
  }
});

// Search stations by name or location
router.get('/search/:query', async (req, res) => {
  try {
    const query = req.params.query;
    const stations = await Station.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { 'location.address': { $regex: query, $options: 'i' } }
      ]
    });

    res.json({
      success: true,
      data: stations
    });
  } catch (error) {
    console.error('Error searching stations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search stations'
    });
  }
});

// Get nearby stations
router.post('/nearby', async (req, res) => {
  try {
    const { lat, lng, maxDistance = 5000 } = req.body; // maxDistance in meters

    const stations = await Station.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [lng, lat]
          },
          $maxDistance: maxDistance
        }
      }
    });

    res.json({
      success: true,
      data: stations
    });
  } catch (error) {
    console.error('Error finding nearby stations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to find nearby stations'
    });
  }
});

// Create new station
router.post('/', async (req, res) => {
  try {
    const stationData = req.body;
    const station = new Station(stationData);
    await station.save();

    res.status(201).json({
      success: true,
      data: station,
      message: 'Station created successfully'
    });
  } catch (error) {
    console.error('Error creating station:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create station'
    });
  }
});

// Update station
router.put('/:id', async (req, res) => {
  try {
    const station = await Station.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!station) {
      return res.status(404).json({
        success: false,
        message: 'Station not found'
      });
    }

    res.json({
      success: true,
      data: station,
      message: 'Station updated successfully'
    });
  } catch (error) {
    console.error('Error updating station:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update station'
    });
  }
});

// Delete station
router.delete('/:id', async (req, res) => {
  try {
    const station = await Station.findByIdAndDelete(req.params.id);
    if (!station) {
      return res.status(404).json({
        success: false,
        message: 'Station not found'
      });
    }

    res.json({
      success: true,
      message: 'Station deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting station:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete station'
    });
  }
});

module.exports = router;