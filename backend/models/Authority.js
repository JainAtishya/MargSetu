const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const authoritySchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters long'],
    maxlength: [50, 'Username cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long']
  },
  role: {
    type: String,
    enum: ['admin', 'supervisor', 'operator'],
    default: 'operator'
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    match: [/^[6-9]\d{9}$/, 'Please enter a valid Indian phone number']
  },
  department: {
    type: String,
    trim: true,
    maxlength: [100, 'Department name cannot exceed 100 characters']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  permissions: [{
    type: String,
    enum: ['view_buses', 'manage_buses', 'view_alerts', 'manage_alerts', 'view_reports', 'manage_drivers', 'system_admin']
  }]
}, {
  timestamps: true
});

// Index for faster queries
authoritySchema.index({ isActive: 1 });

// Hash password before saving
authoritySchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
authoritySchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Hide password when converting to JSON
authoritySchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  return user;
};

module.exports = mongoose.model('Authority', authoritySchema);