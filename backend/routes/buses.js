const express = require('express');
const router = express.Router();
const busController = require('../controllers/busController');
const { authenticateAuthority, optionalAuth, requirePermission } = require('../middleware/auth');
const { validate, busSchema } = require('../utils/validation');

// Public routes (for passengers)
router.get('/:busId', optionalAuth, busController.getBusById);

// Authority routes (require authentication)
router.get('/', authenticateAuthority, requirePermission('view_buses'), busController.getAllBuses);
router.post('/', authenticateAuthority, requirePermission('manage_buses'), validate(busSchema), busController.createBus);
router.patch('/:busId', authenticateAuthority, requirePermission('manage_buses'), busController.updateBus);
router.delete('/:busId', authenticateAuthority, requirePermission('manage_buses'), busController.deleteBus);

// Driver assignment routes
router.post('/:busId/assign-driver', authenticateAuthority, requirePermission('manage_buses'), busController.assignDriver);
router.delete('/:busId/unassign-driver', authenticateAuthority, requirePermission('manage_buses'), busController.unassignDriver);

// Statistics routes
router.get('/:busId/stats', authenticateAuthority, requirePermission('view_reports'), busController.getBusStats);

module.exports = router;