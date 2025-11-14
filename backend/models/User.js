const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    required: false,
    unique: true,
    sparse: true
  },
  password: {
    type: String,
    required: true,
    minlength: 8
  },
  role: {
    type: String,
    enum: ['passenger', 'driver', 'authority', 'admin'],
    default: 'passenger'
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  profile: {
    avatar: String,
    bio: String,
    preferredLanguage: {
      type: String,
      default: 'en'
    }
  },
  preferences: {
    notifications: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: true },
      push: { type: Boolean, default: true }
    },
    privacy: {
      shareLocation: { type: Boolean, default: true },
      publicProfile: { type: Boolean, default: false }
    }
  },
  verification: {
    email: {
      isVerified: { type: Boolean, default: false },
      token: String,
      expiresAt: Date
    },
    phone: {
      isVerified: { type: Boolean, default: false },
      otp: String,
      expiresAt: Date
    }
  },
  security: {
    lastLogin: Date,
    loginAttempts: { type: Number, default: 0 },
    accountLocked: { type: Boolean, default: false },
    lockUntil: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecret: String
  },
  assignedRoutes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Route'
  }],
  driverId: {
    type: String,
    unique: true,
    sparse: true
  },
  deviceTokens: [String], // For push notifications
  isActive: {
    type: Boolean,
    default: true
  },
  lastSeen: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for performance (avoid duplicating unique single-field indexes)
userSchema.index({ role: 1 });
userSchema.index({ 'verification.email.isVerified': 1 });
userSchema.index({ 'security.accountLocked': 1 });
userSchema.index({ createdAt: -1 });

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for account lock status
userSchema.virtual('isAccountLocked').get(function() {
  return !!(this.security.accountLocked && this.security.lockUntil && this.security.lockUntil > Date.now());
});

// Instance methods
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.incrementLoginAttempts = function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.security.lockUntil && this.security.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: {
        'security.lockUntil': 1
      },
      $set: {
        'security.loginAttempts': 1,
        'security.accountLocked': false
      }
    });
  }
  
  const updates = { $inc: { 'security.loginAttempts': 1 } };
  
  // If we have exceeded max attempts and it's not locked already, lock the account
  const maxAttempts = 5;
  const lockTime = 15 * 60 * 1000; // 15 minutes
  
  if (this.security.loginAttempts + 1 >= maxAttempts && !this.isAccountLocked) {
    updates.$set = {
      'security.lockUntil': Date.now() + lockTime,
      'security.accountLocked': true
    };
  }
  
  return this.updateOne(updates);
};

userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: {
      'security.loginAttempts': 1,
      'security.lockUntil': 1
    },
    $set: {
      'security.accountLocked': false,
      'security.lastLogin': new Date()
    }
  });
};

userSchema.methods.generatePasswordResetToken = function() {
  const crypto = require('crypto');
  const resetToken = crypto.randomBytes(32).toString('hex');
  
  this.security.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  
  this.security.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  
  return resetToken;
};

userSchema.methods.generateEmailVerificationToken = function() {
  const crypto = require('crypto');
  const verificationToken = crypto.randomBytes(32).toString('hex');
  
  this.verification.email.token = crypto
    .createHash('sha256')
    .update(verificationToken)
    .digest('hex');
  
  this.verification.email.expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  
  return verificationToken;
};

// Static methods
userSchema.statics.findByCredentials = async function(usernameOrEmail, password) {
  const user = await this.findOne({
    $or: [
      { username: usernameOrEmail },
      { email: usernameOrEmail }
    ]
  });
  
  if (!user) {
    throw new Error('Invalid credentials');
  }
  
  if (user.isAccountLocked) {
    throw new Error('Account is locked due to too many failed login attempts');
  }
  
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    await user.incrementLoginAttempts();
    throw new Error('Invalid credentials');
  }
  
  // Reset login attempts on successful login
  if (user.security.loginAttempts > 0) {
    await user.resetLoginAttempts();
  }
  
  return user;
};

userSchema.statics.findByPasswordResetToken = function(token) {
  const crypto = require('crypto');
  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
  
  return this.findOne({
    'security.passwordResetToken': hashedToken,
    'security.passwordResetExpires': { $gt: Date.now() }
  });
};

userSchema.statics.findByEmailVerificationToken = function(token) {
  const crypto = require('crypto');
  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
  
  return this.findOne({
    'verification.email.token': hashedToken,
    'verification.email.expiresAt': { $gt: Date.now() }
  });
};

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Pre-save middleware to generate driverId for drivers
userSchema.pre('save', function(next) {
  if (this.role === 'driver' && !this.driverId) {
    this.driverId = `DRV${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
  }
  next();
});

// Post-save middleware
userSchema.post('save', function(doc) {
  console.log(`User ${doc.username} saved successfully`);
});

// Transform output
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  delete user.security.passwordResetToken;
  delete user.security.twoFactorSecret;
  delete user.verification.email.token;
  delete user.verification.phone.otp;
  return user;
};

module.exports = mongoose.model('User', userSchema);