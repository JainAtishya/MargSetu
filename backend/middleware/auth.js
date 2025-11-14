const jwt = require('jsonwebtoken');
const { Authority, Driver } = require('../models');

// General authentication middleware
const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user exists based on type
    let user;
    if (decoded.type === 'authority') {
      user = await Authority.findById(decoded.id);
    } else if (decoded.type === 'driver') {
      user = await Driver.findById(decoded.id);
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. User not found.'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated.'
      });
    }

    req.user = user;
    req.userType = decoded.type;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired.'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error during authentication.'
    });
  }
};

// Authority-only authentication middleware
const authenticateAuthority = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.type !== 'authority') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Authority access required.'
      });
    }

    const authority = await Authority.findById(decoded.id);
    
    if (!authority || !authority.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token or account deactivated.'
      });
    }

    req.user = authority;
    req.userType = 'authority';
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired.'
      });
    }
    
    res.status(401).json({
      success: false,
      message: 'Invalid token.'
    });
  }
};

// Driver-only authentication middleware
const authenticateDriver = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.type !== 'driver') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Driver access required.'
      });
    }

    const driver = await Driver.findById(decoded.id).populate('currentBus', 'busId registrationNumber route');
    
    if (!driver || !driver.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token or account deactivated.'
      });
    }

    req.user = driver;
    req.userType = 'driver';
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired.'
      });
    }
    
    res.status(401).json({
      success: false,
      message: 'Invalid token.'
    });
  }
};

// Role-based authorization middleware for authorities
const authorize = (roles = []) => {
  return (req, res, next) => {
    if (req.userType !== 'authority') {
      return res.status(403).json({
        success: false,
        message: 'Authority access required.'
      });
    }

    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(' or ')}`
      });
    }

    next();
  };
};

// Permission-based authorization middleware
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (req.userType !== 'authority') {
      return res.status(403).json({
        success: false,
        message: 'Authority access required.'
      });
    }

    if (!req.user.permissions.includes(permission)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required permission: ${permission}`
      });
    }

    next();
  };
};

// Optional authentication middleware (for public endpoints that can benefit from user context)
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      let user;
      if (decoded.type === 'authority') {
        user = await Authority.findById(decoded.id);
      } else if (decoded.type === 'driver') {
        user = await Driver.findById(decoded.id);
      }

      if (user && user.isActive) {
        req.user = user;
        req.userType = decoded.type;
      }
    }
  } catch (error) {
    // For optional auth, we don't return errors, just proceed without user context
  }
  
  next();
};

module.exports = {
  authenticate,
  authenticateAuthority,
  authenticateDriver,
  authorize,
  requirePermission,
  optionalAuth
};