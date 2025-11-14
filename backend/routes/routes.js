const express = require('express');
const router = express.Router();
const routeController = require('../controllers/routeController');
const { authenticate, authorize } = require('../middleware/auth');

// Apply authentication to all routes
router.use(authenticate);

// Get all routes
router.get('/', routeController.getAllRoutes);

// Get route by ID
router.get('/:id', routeController.getRouteById);

// Create new route (Authority only)
router.post('/', authorize(['authority']), routeController.createRoute);

// Update route (Authority only)
router.put('/:id', authorize(['authority']), routeController.updateRoute);

// Delete route (Authority only)
router.delete('/:id', authorize(['authority']), routeController.deleteRoute);

// Toggle route status (Authority only)
router.patch('/:id/toggle-status', authorize(['authority']), routeController.toggleRouteStatus);

module.exports = router;