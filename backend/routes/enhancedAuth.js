const express = require('express');
const router = express.Router();
const authController = require('../controllers/enhancedAuthController');
const { authenticate, authorize } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

// Rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const resetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // limit each IP to 3 password reset requests per hour
  message: {
    success: false,
    message: 'Too many password reset attempts, please try again later.'
  }
});

// Authority routes
router.post('/authority/register', authController.registerAuthority);
router.post('/authority/login', authLimiter, authController.loginAuthority);

// Driver routes
router.post('/driver/register', authController.registerDriver);
router.post('/driver/login', authLimiter, authController.loginDriver);

// Token management
router.post('/refresh-token', authController.refreshToken);
router.post('/logout', authenticate, authController.logout);

// Account verification
router.get('/verify/:token', authController.verifyAccount);
router.post('/verify-phone', authController.verifyPhone);

// Password reset
router.post('/forgot-password', resetLimiter, authController.requestPasswordReset);
router.post('/reset-password', authController.resetPassword);

// Profile management (authenticated routes)
router.get('/profile', authenticate, async (req, res) => {
  try {
    const user = req.user;
    
    // Remove sensitive information
    const profile = {
      id: user._id,
      name: user.name,
      email: user.email || undefined,
      phone: user.phone || undefined,
      role: user.role || 'driver',
      isVerified: user.isVerified || user.isPhoneVerified,
      lastLogin: user.lastLogin,
      accountStatus: user.accountStatus
    };

    if (user.role === 'driver') {
      profile.driverId = user.driverId;
      profile.licenseNumber = user.licenseNumber;
      profile.isOnline = user.isOnline;
      profile.currentBus = user.currentBus;
    } else {
      profile.username = user.username;
      profile.department = user.department;
      profile.designation = user.designation;
    }

    res.json({
      success: true,
      data: profile
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching profile'
    });
  }
});

// Update profile
router.put('/profile', authenticate, async (req, res) => {
  try {
    const user = req.user;
    const updates = req.body;

    // Fields that can be updated
    const allowedUpdates = ['name', 'phone', 'address', 'emergencyContact'];
    
    if (user.role !== 'driver') {
      allowedUpdates.push('department', 'designation');
    }

    // Filter allowed updates
    const filteredUpdates = {};
    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        filteredUpdates[key] = updates[key];
      }
    });

    // Update user
    Object.assign(user, filteredUpdates);
    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        name: user.name,
        phone: user.phone,
        address: user.address,
        emergencyContact: user.emergencyContact
      }
    });

  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating profile'
    });
  }
});

// Change password
router.put('/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = req.user;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    // Verify current password
    const bcrypt = require('bcryptjs');
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);

    if (!isValidPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Validate new password
    const passwordValidation = authController.validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: passwordValidation.message
      });
    }

    // Hash and save new password
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    user.password = await bcrypt.hash(newPassword, saltRounds);
    
    // Invalidate all refresh tokens except current session
    const currentRefreshToken = req.headers['x-refresh-token'];
    user.refreshTokens = user.refreshTokens.filter(
      tokenObj => tokenObj.token === currentRefreshToken
    );

    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error changing password'
    });
  }
});

// Get user sessions (refresh tokens)
router.get('/sessions', authenticate, async (req, res) => {
  try {
    const user = req.user;

    const sessions = user.refreshTokens
      .filter(tokenObj => tokenObj.expiresAt > new Date())
      .map(tokenObj => ({
        id: tokenObj._id,
        createdAt: tokenObj.createdAt,
        expiresAt: tokenObj.expiresAt,
        deviceInfo: tokenObj.deviceInfo,
        isCurrent: req.headers['x-refresh-token'] === tokenObj.token
      }));

    res.json({
      success: true,
      data: {
        activeSessions: sessions.length,
        sessions
      }
    });

  } catch (error) {
    console.error('Sessions fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching sessions'
    });
  }
});

// Revoke specific session
router.delete('/sessions/:sessionId', authenticate, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const user = req.user;

    user.refreshTokens = user.refreshTokens.filter(
      tokenObj => tokenObj._id.toString() !== sessionId
    );

    await user.save();

    res.json({
      success: true,
      message: 'Session revoked successfully'
    });

  } catch (error) {
    console.error('Session revoke error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error revoking session'
    });
  }
});

// Revoke all sessions except current
router.delete('/sessions', authenticate, async (req, res) => {
  try {
    const user = req.user;
    const currentRefreshToken = req.headers['x-refresh-token'];

    // Keep only current session
    user.refreshTokens = user.refreshTokens.filter(
      tokenObj => tokenObj.token === currentRefreshToken
    );

    await user.save();

    res.json({
      success: true,
      message: 'All other sessions revoked successfully'
    });

  } catch (error) {
    console.error('Sessions revoke error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error revoking sessions'
    });
  }
});

// Admin routes - User management
router.get('/users', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { role, page = 1, limit = 20, search } = req.query;
    const skip = (page - 1) * limit;

    let query = {};
    if (role) {
      query.role = role;
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } }
      ];
    }

    const Authority = require('../models/Authority');
    const Driver = require('../models/Driver');

    let users = [];
    let total = 0;

    if (!role || role === 'authority') {
      const authorities = await Authority.find(query)
        .select('-password -refreshTokens')
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 });
      
      users = users.concat(authorities);
      
      if (!role) {
        total += await Authority.countDocuments(query);
      } else {
        total = await Authority.countDocuments(query);
      }
    }

    if (!role || role === 'driver') {
      const drivers = await Driver.find(query)
        .select('-password -refreshTokens')
        .skip(role ? skip : 0)
        .limit(role ? parseInt(limit) : parseInt(limit) - users.length)
        .sort({ createdAt: -1 });
      
      users = users.concat(drivers);
      
      if (!role) {
        total += await Driver.countDocuments(query);
      } else {
        total = await Driver.countDocuments(query);
      }
    }

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Users fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching users'
    });
  }
});

// Health check for auth service
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Enhanced authentication service is running',
    features: [
      'User registration with email/phone verification',
      'Enhanced login with account lockout protection',
      'JWT access and refresh tokens',
      'Password reset functionality',
      'Session management',
      'Rate limiting',
      'Profile management',
      'Admin user management'
    ],
    timestamp: new Date().toISOString()
  });
});

module.exports = router;