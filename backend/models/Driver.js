const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const driverSchema = new mongoose.Schema({
  driverId: {
    type: String,
    required: [true, 'Driver ID is required'],
    unique: true,
    trim: true,
    uppercase: true,
    match: [/^DRV\d{4}$/, 'Driver ID must be in format DRV0001']
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
    unique: true,
    match: [/^[6-9]\d{9}$/, 'Please enter a valid Indian phone number']
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [4, 'Password must be at least 4 characters long']
  },
  licenseNumber: {
    type: String,
    required: [true, 'License number is required'],
    unique: true,
    trim: true,
    uppercase: true
  },
  address: {
    type: String,
    trim: true,
    maxlength: [300, 'Address cannot exceed 300 characters']
  },
  dateOfJoining: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isOnDuty: {
    type: Boolean,
    default: false
  },
  currentBus: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bus',
    default: null
  },
  lastLogin: {
    type: Date
  },
  totalTrips: {
    type: Number,
    default: 0
  },
  emergencyContact: {
    name: {
      type: String,
      trim: true
    },
    phone: {
      type: String,
      match: [/^[6-9]\d{9}$/, 'Please enter a valid Indian phone number']
    },
    relationship: {
      type: String,
      trim: true
    }
  }
}, {
  timestamps: true
});

// Indexes for faster queries (avoid duplicating unique indexes on driverId/phone)
driverSchema.index({ isActive: 1, isOnDuty: 1 });
driverSchema.index({ currentBus: 1 });

// Hash password before saving
driverSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
driverSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Hide password when converting to JSON
driverSchema.methods.toJSON = function() {
  const driver = this.toObject();
  delete driver.password;
  return driver;
};

// Virtual for driver's full info
driverSchema.virtual('fullInfo').get(function() {
  return {
    id: this.driverId,
    name: this.name,
    phone: this.phone,
    isOnDuty: this.isOnDuty,
    currentBus: this.currentBus
  };
});

module.exports = mongoose.model('Driver', driverSchema);