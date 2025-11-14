const express = require('express');
const router = express.Router();
const Authority = require('../models/Authority');

// Get authority information
router.get('/', async (req, res) => {
  try {
    const authorities = await Authority.find();
    res.json({
      success: true,
      data: authorities
    });
  } catch (error) {
    console.error('Error fetching authorities:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch authorities'
    });
  }
});

// Get authority by ID
router.get('/:id', async (req, res) => {
  try {
    const authority = await Authority.findById(req.params.id);
    if (!authority) {
      return res.status(404).json({
        success: false,
        message: 'Authority not found'
      });
    }

    res.json({
      success: true,
      data: authority
    });
  } catch (error) {
    console.error('Error fetching authority:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch authority'
    });
  }
});

// Create new authority (admin only)
router.post('/', async (req, res) => {
  try {
    const authorityData = req.body;
    const authority = new Authority(authorityData);
    await authority.save();

    res.status(201).json({
      success: true,
      data: authority,
      message: 'Authority created successfully'
    });
  } catch (error) {
    console.error('Error creating authority:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create authority'
    });
  }
});

// Update authority
router.put('/:id', async (req, res) => {
  try {
    const authority = await Authority.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!authority) {
      return res.status(404).json({
        success: false,
        message: 'Authority not found'
      });
    }

    res.json({
      success: true,
      data: authority,
      message: 'Authority updated successfully'
    });
  } catch (error) {
    console.error('Error updating authority:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update authority'
    });
  }
});

// Delete authority
router.delete('/:id', async (req, res) => {
  try {
    const authority = await Authority.findByIdAndDelete(req.params.id);
    if (!authority) {
      return res.status(404).json({
        success: false,
        message: 'Authority not found'
      });
    }

    res.json({
      success: true,
      message: 'Authority deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting authority:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete authority'
    });
  }
});

module.exports = router;