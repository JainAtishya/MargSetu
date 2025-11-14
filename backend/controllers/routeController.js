const { Route } = require('../models');

// Get all routes
exports.getAllRoutes = async (req, res) => {
  try {
    const { active, page = 1, limit = 20 } = req.query;
    const filter = {};
    
    if (active !== undefined) filter.isActive = active === 'true';

    const routes = await Route.find(filter)
      .sort({ routeId: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await Route.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: routes,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get routes error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch routes',
      error: error.message
    });
  }
};

// Get route by ID
exports.getRouteById = async (req, res) => {
  try {
    const route = await Route.findById(req.params.id);
    
    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Route not found'
      });
    }

    res.status(200).json({
      success: true,
      data: route
    });
  } catch (error) {
    console.error('Get route by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch route',
      error: error.message
    });
  }
};

// Create new route
exports.createRoute = async (req, res) => {
  try {
    const routeData = req.body;

    // Validate required fields
    if (!routeData.routeId || !routeData.name || !routeData.startPoint || !routeData.endPoint) {
      return res.status(400).json({
        success: false,
        message: 'Route ID, name, start point, and end point are required'
      });
    }

    // Check if route ID already exists
    const existingRoute = await Route.findOne({ routeId: routeData.routeId });
    if (existingRoute) {
      return res.status(400).json({
        success: false,
        message: 'Route ID already exists'
      });
    }

    const route = new Route(routeData);
    await route.save();

    res.status(201).json({
      success: true,
      message: 'Route created successfully',
      data: route
    });
  } catch (error) {
    console.error('Create route error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        error: error.message
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to create route',
      error: error.message
    });
  }
};

// Update route
exports.updateRoute = async (req, res) => {
  try {
    const updates = req.body;
    
    // Remove fields that shouldn't be updated
    delete updates.routeId;
    delete updates._id;

    const route = await Route.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Route not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Route updated successfully',
      data: route
    });
  } catch (error) {
    console.error('Update route error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        error: error.message
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to update route',
      error: error.message
    });
  }
};

// Delete route
exports.deleteRoute = async (req, res) => {
  try {
    const route = await Route.findByIdAndDelete(req.params.id);

    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Route not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Route deleted successfully'
    });
  } catch (error) {
    console.error('Delete route error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete route',
      error: error.message
    });
  }
};

// Toggle route active status
exports.toggleRouteStatus = async (req, res) => {
  try {
    const route = await Route.findById(req.params.id);

    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Route not found'
      });
    }

    route.isActive = !route.isActive;
    await route.save();

    res.status(200).json({
      success: true,
      message: `Route ${route.isActive ? 'activated' : 'deactivated'} successfully`,
      data: route
    });
  } catch (error) {
    console.error('Toggle route status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle route status',
      error: error.message
    });
  }
};