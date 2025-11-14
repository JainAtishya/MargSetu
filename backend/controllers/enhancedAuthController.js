const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { Authority, Driver } = require('../models');
const { sendEmail } = require('../services/emailService');

// Enhanced password validation
const validatePassword = (password) => {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  return {
    isValid: password.length >= minLength && hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar,
    message: password.length < minLength ? 'Password must be at least 8 characters long' :
             !hasUpperCase ? 'Password must contain at least one uppercase letter' :
             !hasLowerCase ? 'Password must contain at least one lowercase letter' :
             !hasNumbers ? 'Password must contain at least one number' :
             !hasSpecialChar ? 'Password must contain at least one special character' :
             'Password is valid'
  };
};

// Generate secure tokens
const generateTokens = (userId, role) => {
  const accessToken = jwt.sign(
    { userId, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );

  const refreshToken = jwt.sign(
    { userId, role, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  return { accessToken, refreshToken };
};

// Enhanced Authority Registration
const registerAuthority = async (req, res) => {
  try {
    const { 
      name, 
      username, 
      email, 
      password, 
      phone, 
      role = 'admin',
      department,
      designation,
      employeeId
    } = req.body;

    // Validate required fields
    if (!name || !username || !email || !password || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: passwordValidation.message
      });
    }

    // Check if authority already exists
    const existingAuthority = await Authority.findOne({
      $or: [{ email }, { username }, { phone }]
    });

    if (existingAuthority) {
      return res.status(400).json({
        success: false,
        message: 'Authority with this email, username, or phone already exists'
      });
    }

    // Hash password
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create authority
    const authority = new Authority({
      name,
      username,
      email,
      password: hashedPassword,
      phone,
      role,
      department,
      designation,
      employeeId,
      verificationToken,
      verificationExpires,
      isVerified: false,
      loginAttempts: 0,
      accountStatus: 'active'
    });

    await authority.save();

    // Send verification email (if email service is configured)
    try {
      await sendEmail({
        to: email,
        subject: 'Verify Your MargSetu Authority Account',
        template: 'verify-account',
        data: {
          name,
          verificationToken,
          verificationUrl: `${process.env.FRONTEND_URL}/verify-account/${verificationToken}`
        }
      });
    } catch (emailError) {
      console.error('Email sending failed:', emailError.message);
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(authority._id, authority.role);

    // Store refresh token
    authority.refreshTokens.push({
      token: refreshToken,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });
    await authority.save();

    res.status(201).json({
      success: true,
      message: 'Authority registered successfully. Please check your email for verification.',
      data: {
        authorityId: authority._id,
        name: authority.name,
        username: authority.username,
        email: authority.email,
        role: authority.role,
        isVerified: authority.isVerified,
        accessToken,
        refreshToken
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

// Enhanced Driver Registration
const registerDriver = async (req, res) => {
  try {
    const { 
      driverId, 
      name, 
      phone, 
      password, 
      licenseNumber,
      licenseExpiryDate,
      address,
      emergencyContact,
      bloodGroup,
      dateOfBirth
    } = req.body;

    // Validate required fields
    if (!driverId || !name || !phone || !password || !licenseNumber) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: passwordValidation.message
      });
    }

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

    // Hash password
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Generate verification code for phone
    const phoneVerificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const phoneVerificationExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Create driver
    const driver = new Driver({
      driverId,
      name,
      phone,
      password: hashedPassword,
      licenseNumber,
      licenseExpiryDate: licenseExpiryDate ? new Date(licenseExpiryDate) : undefined,
      address,
      emergencyContact,
      bloodGroup,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      phoneVerificationCode,
      phoneVerificationExpires,
      isPhoneVerified: false,
      loginAttempts: 0,
      accountStatus: 'active'
    });

    await driver.save();

    // Send SMS verification (if SMS service is configured)
    try {
      // SMS sending logic would go here
      console.log(`SMS verification code for ${phone}: ${phoneVerificationCode}`);
    } catch (smsError) {
      console.error('SMS sending failed:', smsError.message);
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(driver._id, 'driver');

    // Store refresh token
    driver.refreshTokens.push({
      token: refreshToken,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });
    await driver.save();

    res.status(201).json({
      success: true,
      message: 'Driver registered successfully. Please verify your phone number.',
      data: {
        driverId: driver.driverId,
        name: driver.name,
        phone: driver.phone,
        licenseNumber: driver.licenseNumber,
        isPhoneVerified: driver.isPhoneVerified,
        accessToken,
        refreshToken
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

// Enhanced Authority Login
const loginAuthority = async (req, res) => {
  try {
    const { username, password, rememberMe = false } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide username and password'
      });
    }

    // Find authority
    const authority = await Authority.findOne({
      $or: [{ username }, { email: username }]
    }).select('+password +loginAttempts +lockedUntil');

    if (!authority) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if account is locked
    if (authority.isLocked) {
      return res.status(423).json({
        success: false,
        message: 'Account is temporarily locked due to too many failed login attempts'
      });
    }

    // Check if account is active
    if (authority.accountStatus !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Account is not active. Please contact administrator.'
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, authority.password);

    if (!isValidPassword) {
      // Increment login attempts
      await authority.incLoginAttempts();
      
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Reset login attempts on successful login
    authority.loginAttempts = 0;
    authority.lockedUntil = undefined;
    authority.lastLogin = new Date();
    
    // Clean old refresh tokens
    authority.refreshTokens = authority.refreshTokens.filter(
      tokenObj => tokenObj.expiresAt > new Date()
    );

    // Generate new tokens
    const tokenExpiry = rememberMe ? '30d' : '15m';
    const { accessToken, refreshToken } = generateTokens(authority._id, authority.role);

    // Store refresh token
    authority.refreshTokens.push({
      token: refreshToken,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + (rememberMe ? 30 : 7) * 24 * 60 * 60 * 1000),
      deviceInfo: {
        userAgent: req.headers['user-agent'],
        ip: req.ip
      }
    });

    await authority.save();

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        authorityId: authority._id,
        name: authority.name,
        username: authority.username,
        email: authority.email,
        role: authority.role,
        isVerified: authority.isVerified,
        lastLogin: authority.lastLogin,
        accessToken,
        refreshToken
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

// Enhanced Driver Login
const loginDriver = async (req, res) => {
  try {
    const { driverId, password, rememberMe = false } = req.body;

    if (!driverId || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide driver ID and password'
      });
    }

    // Find driver
    const driver = await Driver.findOne({ driverId })
      .select('+password +loginAttempts +lockedUntil')
      .populate('currentBus', 'busId registrationNumber');

    if (!driver) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if account is locked
    if (driver.isLocked) {
      return res.status(423).json({
        success: false,
        message: 'Account is temporarily locked due to too many failed login attempts'
      });
    }

    // Check if account is active
    if (driver.accountStatus !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Account is not active. Please contact administrator.'
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, driver.password);

    if (!isValidPassword) {
      // Increment login attempts
      await driver.incLoginAttempts();
      
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Reset login attempts on successful login
    driver.loginAttempts = 0;
    driver.lockedUntil = undefined;
    driver.lastLogin = new Date();
    driver.isOnline = true;
    
    // Clean old refresh tokens
    driver.refreshTokens = driver.refreshTokens.filter(
      tokenObj => tokenObj.expiresAt > new Date()
    );

    // Generate new tokens
    const { accessToken, refreshToken } = generateTokens(driver._id, 'driver');

    // Store refresh token
    driver.refreshTokens.push({
      token: refreshToken,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + (rememberMe ? 30 : 7) * 24 * 60 * 60 * 1000),
      deviceInfo: {
        userAgent: req.headers['user-agent'],
        ip: req.ip
      }
    });

    await driver.save();

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        driverId: driver.driverId,
        name: driver.name,
        phone: driver.phone,
        licenseNumber: driver.licenseNumber,
        isPhoneVerified: driver.isPhoneVerified,
        currentBus: driver.currentBus,
        lastLogin: driver.lastLogin,
        accessToken,
        refreshToken
      }
    });

  } catch (error) {
    console.error('Driver login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
};

// Refresh Token
const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET
    );

    if (decoded.type !== 'refresh') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token type'
      });
    }

    // Find user by role
    let user;
    if (decoded.role === 'driver') {
      user = await Driver.findById(decoded.userId);
    } else {
      user = await Authority.findById(decoded.userId);
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if refresh token exists in user's tokens
    const tokenExists = user.refreshTokens.some(
      tokenObj => tokenObj.token === refreshToken && tokenObj.expiresAt > new Date()
    );

    if (!tokenExists) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token'
      });
    }

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user._id, decoded.role);

    // Remove old refresh token and add new one
    user.refreshTokens = user.refreshTokens.filter(
      tokenObj => tokenObj.token !== refreshToken
    );
    
    user.refreshTokens.push({
      token: newRefreshToken,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });

    await user.save();

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        accessToken,
        refreshToken: newRefreshToken
      }
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid refresh token'
    });
  }
};

// Account Verification
const verifyAccount = async (req, res) => {
  try {
    const { token } = req.params;

    const authority = await Authority.findOne({
      verificationToken: token,
      verificationExpires: { $gt: new Date() }
    });

    if (!authority) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification token'
      });
    }

    authority.isVerified = true;
    authority.verificationToken = undefined;
    authority.verificationExpires = undefined;
    await authority.save();

    res.json({
      success: true,
      message: 'Account verified successfully'
    });

  } catch (error) {
    console.error('Account verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during verification'
    });
  }
};

// Phone Verification
const verifyPhone = async (req, res) => {
  try {
    const { driverId, verificationCode } = req.body;

    const driver = await Driver.findOne({
      driverId,
      phoneVerificationCode: verificationCode,
      phoneVerificationExpires: { $gt: new Date() }
    });

    if (!driver) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification code'
      });
    }

    driver.isPhoneVerified = true;
    driver.phoneVerificationCode = undefined;
    driver.phoneVerificationExpires = undefined;
    await driver.save();

    res.json({
      success: true,
      message: 'Phone number verified successfully'
    });

  } catch (error) {
    console.error('Phone verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during verification'
    });
  }
};

// Password Reset Request
const requestPasswordReset = async (req, res) => {
  try {
    const { email, userType = 'authority' } = req.body;

    let user;
    if (userType === 'driver') {
      user = await Driver.findOne({ phone: email }); // For drivers, use phone
    } else {
      user = await Authority.findOne({ email });
    }

    if (!user) {
      return res.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    user.passwordResetToken = resetToken;
    user.passwordResetExpires = resetExpires;
    await user.save();

    // Send reset email/SMS
    try {
      if (userType === 'driver') {
        // Send SMS for drivers
        console.log(`Password reset code for ${user.phone}: ${resetToken.slice(0, 6)}`);
      } else {
        // Send email for authorities
        await sendEmail({
          to: user.email,
          subject: 'Password Reset Request',
          template: 'password-reset',
          data: {
            name: user.name,
            resetToken,
            resetUrl: `${process.env.FRONTEND_URL}/reset-password/${resetToken}`
          }
        });
      }
    } catch (error) {
      console.error('Failed to send reset notification:', error.message);
    }

    res.json({
      success: true,
      message: 'If an account exists, a password reset link has been sent.'
    });

  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during password reset request'
    });
  }
};

// Reset Password
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword, userType = 'authority' } = req.body;

    // Validate new password
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: passwordValidation.message
      });
    }

    let user;
    if (userType === 'driver') {
      user = await Driver.findOne({
        passwordResetToken: token,
        passwordResetExpires: { $gt: new Date() }
      });
    } else {
      user = await Authority.findOne({
        passwordResetToken: token,
        passwordResetExpires: { $gt: new Date() }
      });
    }

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    // Hash new password
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    user.password = hashedPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.loginAttempts = 0;
    user.lockedUntil = undefined;
    
    // Invalidate all refresh tokens
    user.refreshTokens = [];

    await user.save();

    res.json({
      success: true,
      message: 'Password reset successfully'
    });

  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during password reset'
    });
  }
};

// Logout
const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const user = req.user;

    if (refreshToken) {
      // Remove specific refresh token
      user.refreshTokens = user.refreshTokens.filter(
        tokenObj => tokenObj.token !== refreshToken
      );
    } else {
      // Remove all refresh tokens (logout from all devices)
      user.refreshTokens = [];
    }

    if (user.role === 'driver') {
      user.isOnline = false;
    }

    await user.save();

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

module.exports = {
  registerAuthority,
  registerDriver,
  loginAuthority,
  loginDriver,
  refreshToken,
  verifyAccount,
  verifyPhone,
  requestPasswordReset,
  resetPassword,
  logout,
  validatePassword
};