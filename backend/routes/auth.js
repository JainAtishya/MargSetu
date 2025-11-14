const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { validate, authorityLoginSchema, authorityRegisterSchema, driverLoginSchema, driverRegisterSchema } = require('../utils/validation');

// Authority routes
router.post('/authority/login', validate(authorityLoginSchema), authController.authorityLogin);
router.post('/authority/register', validate(authorityRegisterSchema), authController.authorityRegister);

// Driver routes
router.post('/driver/login', validate(driverLoginSchema), authController.driverLogin);
router.post('/driver/register', validate(driverRegisterSchema), authController.driverRegister);

// Backward-compatible alias for driver app hitting /api/auth/driver-login
router.post('/driver-login', validate(driverLoginSchema), authController.driverLogin);

// Protected routes (require authentication)
router.get('/profile', authenticate, authController.getProfile);
router.patch('/profile', authenticate, authController.updateProfile);
router.post('/change-password', authenticate, authController.changePassword);
router.post('/logout', authenticate, authController.logout);

module.exports = router;