const express = require('express');
const router = express.Router();
const locationController = require('../controllers/locationController');
const { authenticateDriver, optionalAuth } = require('../middleware/auth');
const { validate, locationUpdateSchema } = require('../utils/validation');

// Driver routes (require driver authentication)
router.post('/update', authenticateDriver, validate(locationUpdateSchema), locationController.updateLocation);
// Start trip (explicit) and get-or-create tripId for driver apps
router.post('/start-trip', authenticateDriver, locationController.startTrip);
router.post('/trip-id', authenticateDriver, locationController.getOrCreateTripId);
router.post('/end-trip', authenticateDriver, locationController.endTrip);

// Public routes (for passengers)
router.get('/bus/:busId', optionalAuth, locationController.getBusLocation);
router.get('/bus/:busId/route', optionalAuth, locationController.getBusRoute);
router.get('/nearby', optionalAuth, locationController.getNearbyBuses);

module.exports = router;