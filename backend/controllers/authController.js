const { Authority, Driver } = require('../models');
const { generateToken } = require('../utils/jwt');

// Authority login
const authorityLogin = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find authority by username
    const authority = await Authority.findOne({ username }).select('+password');
    
    if (!authority) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }

    // Check if account is active
    if (!authority.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact administrator.'
      });
    }

    // Verify password
    const isPasswordValid = await authority.comparePassword(password);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }

    // Update last login
    authority.lastLogin = new Date();
    await authority.save();

    // Generate token
    const token = generateToken({
      id: authority._id,
      username: authority.username,
      role: authority.role,
      type: 'authority'
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: authority.toJSON(),
        token: token
      }
    });

  } catch (error) {
    console.error('Authority login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
};

// Authority register
const authorityRegister = async (req, res) => {
  try {
    const { username, email, password, name, phone, department, role } = req.body;

    // Check if authority already exists
    const existingAuthority = await Authority.findOne({
      $or: [{ username }, { email }, { phone }]
    });

    if (existingAuthority) {
      return res.status(400).json({
        success: false,
        message: 'Authority with this username, email, or phone already exists'
      });
    }

    // Create new authority
    const authority = new Authority({
      username,
      email,
      password,
      name,
      phone,
      department,
      role,
      permissions: getDefaultPermissions(role)
    });

    await authority.save();

    // Generate token
    const token = generateToken({
      id: authority._id,
      username: authority.username,
      role: authority.role,
      type: 'authority'
    });

    res.status(201).json({
      success: true,
      message: 'Authority registered successfully',
      data: {
        user: authority.toJSON(),
        token: token
      }
    });

  } catch (error) {
    console.error('Authority registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
};

// Driver login
const driverLogin = async (req, res) => {
  try {
    const { driverId, password, busId, deviceInfo } = req.body;

    // Find driver by driverId
    const driver = await Driver.findOne({ driverId }).select('+password').populate('currentBus', 'busId registrationNumber route');
    
    if (!driver) {
      return res.status(401).json({
        success: false,
        message: 'Invalid driver ID or password'
      });
    }

    // Check if account is active
    if (!driver.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact administrator.'
      });
    }

    // Verify password
    const isPasswordValid = await driver.comparePassword(password);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid driver ID or password'
      });
    }

    // Validate bus ID if provided
    if (busId) {
      if (!driver.currentBus) {
        return res.status(400).json({
          success: false,
          message: 'Driver is not assigned to any bus. Please contact administrator.'
        });
      }
      
      if (driver.currentBus.busId !== busId) {
        return res.status(400).json({
          success: false,
          message: `Driver is not assigned to bus ${busId}. You are assigned to ${driver.currentBus.busId}.`
        });
      }
    }

    // Update last login and device info if provided
    driver.lastLogin = new Date();
    if (deviceInfo) {
      driver.lastDeviceInfo = deviceInfo;
    }
    await driver.save();

    // Generate tokens
    const token = generateToken({
      id: driver._id,
      driverId: driver.driverId,
      type: 'driver'
    });

    const refreshToken = generateToken({
      id: driver._id,
      driverId: driver.driverId,
      type: 'driver_refresh'
    }, '7d'); // Refresh token with 7 days expiry

    // Response format matching Android expectations
    res.json({
      token: token,
      refreshToken: refreshToken,
      driver: {
        driverId: driver.driverId,
        name: driver.name,
        phone: driver.phone,
        bus: driver.currentBus ? {
          busId: driver.currentBus.busId,
          registrationNumber: driver.currentBus.registrationNumber
        } : null
      },
      expiresIn: "24h"
    });

  } catch (error) {
    console.error('Driver login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
};

// Driver register
const driverRegister = async (req, res) => {
  try {
    const { driverId, name, phone, email, password, licenseNumber, address, emergencyContact } = req.body;

    // Check if driver already exists
    const existingDriver = await Driver.findOne({
      $or: [{ driverId }, { phone }, { licenseNumber }]
    });

    if (existingDriver) {
      return res.status(400).json({
        success: false,
        message: 'Driver with this ID, phone, or license number already exists'
      });
    }

    // Create new driver
    const driver = new Driver({
      driverId,
      name,
      phone,
      email,
      password,
      licenseNumber,
      address,
      emergencyContact
    });

    await driver.save();

    // Generate token
    const token = generateToken({
      id: driver._id,
      driverId: driver.driverId,
      type: 'driver'
    });

    res.status(201).json({
      success: true,
      message: 'Driver registered successfully',
      data: {
        user: driver.toJSON(),
        token: token
      }
    });

  } catch (error) {
    console.error('Driver registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
};

// Get current user profile
const getProfile = async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        user: req.user.toJSON(),
        userType: req.userType
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching profile'
    });
  }
};

// Update profile
const updateProfile = async (req, res) => {
  try {
    const updates = req.body;
    
    // Remove sensitive fields that shouldn't be updated via this endpoint
    delete updates.password;
    delete updates.driverId;
    delete updates.username;
    delete updates.role;
    delete updates.permissions;

    // Update user
    Object.assign(req.user, updates);
    await req.user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: req.user.toJSON()
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating profile'
    });
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Verify current password
    const user = req.userType === 'authority' 
      ? await Authority.findById(req.user._id).select('+password')
      : await Driver.findById(req.user._id).select('+password');

    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error changing password'
    });
  }
};

// Logout (client-side token removal, but we can track last logout)
const logout = async (req, res) => {
  try {
    // Could implement token blacklisting here if needed
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during logout'
    });
  }
};

// Helper function to get default permissions based on role
const getDefaultPermissions = (role) => {
  const permissionSets = {
    admin: ['view_buses', 'manage_buses', 'view_alerts', 'manage_alerts', 'view_reports', 'manage_drivers', 'system_admin'],
    supervisor: ['view_buses', 'manage_buses', 'view_alerts', 'manage_alerts', 'view_reports'],
    operator: ['view_buses', 'view_alerts', 'view_reports']
  };
  
  return permissionSets[role] || permissionSets.operator;
};

module.exports = {
  authorityLogin,
  authorityRegister,
  driverLogin,
  driverRegister,
  getProfile,
  updateProfile,
  changePassword,
  logout
};