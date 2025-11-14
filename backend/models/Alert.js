const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  alertId: {
    type: String,
    required: [true, 'Alert ID is required'],
    unique: true,
    trim: true,
    uppercase: true
  },
  type: {
    type: String,
    enum: ['sos', 'breakdown', 'delay', 'idle', 'route_deviation', 'speed_violation', 'maintenance', 'fuel_low', 'panic'],
    required: [true, 'Alert type is required']
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    required: [true, 'Alert severity is required']
  },
  title: {
    type: String,
    required: [true, 'Alert title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Alert description is required'],
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  bus: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bus',
    required: [true, 'Bus reference is required']
  },
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver',
    required: [true, 'Driver reference is required']
  },
  route: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Route'
  },
  location: {
    coordinates: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: [true, 'Location coordinates are required']
      }
    },
    address: {
      type: String,
      trim: true,
      maxlength: [300, 'Address cannot exceed 300 characters']
    },
    landmark: {
      type: String,
      trim: true,
      maxlength: [100, 'Landmark cannot exceed 100 characters']
    }
  },
  status: {
    type: String,
    enum: ['active', 'acknowledged', 'in_progress', 'resolved', 'dismissed'],
    default: 'active'
  },
  priority: {
    type: Number,
    min: [1, 'Priority must be between 1 and 10'],
    max: [10, 'Priority must be between 1 and 10'],
    default: 5
  },
  acknowledgedBy: {
    authority: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Authority'
    },
    acknowledgedAt: {
      type: Date
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters']
    }
  },
  resolvedBy: {
    authority: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Authority'
    },
    resolvedAt: {
      type: Date
    },
    resolution: {
      type: String,
      trim: true,
      maxlength: [1000, 'Resolution cannot exceed 1000 characters']
    },
    actionTaken: {
      type: String,
      trim: true,
      maxlength: [500, 'Action taken cannot exceed 500 characters']
    }
  },
  metadata: {
    tripId: {
      type: String,
      trim: true
    },
    speed: {
      type: Number,
      min: [0, 'Speed cannot be negative']
    },
    fuel: {
      type: Number,
      min: [0, 'Fuel level cannot be negative'],
      max: [100, 'Fuel level cannot exceed 100']
    },
    passengers: {
      type: Number,
      min: [0, 'Passenger count cannot be negative']
    },
    deviceInfo: {
      batteryLevel: Number,
      networkStrength: Number,
      appVersion: String
    }
  },
  notifications: [{
    method: {
      type: String,
      enum: ['sms', 'email', 'push', 'call'],
      required: true
    },
    recipient: {
      type: String,
      required: true,
      trim: true
    },
    sentAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['sent', 'delivered', 'failed'],
      default: 'sent'
    },
    response: {
      type: String,
      trim: true
    }
  }],
  autoResolved: {
    type: Boolean,
    default: false
  },
  escalationLevel: {
    type: Number,
    default: 0,
    min: [0, 'Escalation level cannot be negative']
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }]
}, {
  timestamps: true
});

// Indexes for faster queries (avoid duplicating unique single-field indexes)
alertSchema.index({ type: 1, severity: 1 });
alertSchema.index({ bus: 1, createdAt: -1 });
alertSchema.index({ driver: 1, createdAt: -1 });
alertSchema.index({ status: 1, priority: -1 });
alertSchema.index({ createdAt: -1 });
alertSchema.index({ "location.coordinates": "2dsphere" });

// Virtual for alert age
alertSchema.virtual('ageInMinutes').get(function() {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60));
});

// Virtual for response time
alertSchema.virtual('responseTimeInMinutes').get(function() {
  if (!this.acknowledgedBy.acknowledgedAt) return null;
  return Math.floor((this.acknowledgedBy.acknowledgedAt - this.createdAt) / (1000 * 60));
});

// Virtual for resolution time
alertSchema.virtual('resolutionTimeInMinutes').get(function() {
  if (!this.resolvedBy.resolvedAt) return null;
  return Math.floor((this.resolvedBy.resolvedAt - this.createdAt) / (1000 * 60));
});

// Pre-validate middleware to generate alert ID before validation runs
alertSchema.pre('validate', async function(next) {
  if (!this.alertId) {
    try {
      const count = await mongoose.model('Alert').countDocuments();
      const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      this.alertId = `ALT${date}${(count + 1).toString().padStart(4, '0')}`;
    } catch (err) {
      return next(err);
    }
  }
  next();
});

// Method to acknowledge alert
alertSchema.methods.acknowledge = function(authorityId, notes = '') {
  this.status = 'acknowledged';
  this.acknowledgedBy = {
    authority: authorityId,
    acknowledgedAt: new Date(),
    notes: notes
  };
  return this.save();
};

// Method to resolve alert
alertSchema.methods.resolve = function(authorityId, resolution, actionTaken = '') {
  this.status = 'resolved';
  this.resolvedBy = {
    authority: authorityId,
    resolvedAt: new Date(),
    resolution: resolution,
    actionTaken: actionTaken
  };
  return this.save();
};

// Method to escalate alert
alertSchema.methods.escalate = function() {
  this.escalationLevel += 1;
  this.priority = Math.min(this.priority + 1, 10);
  return this.save();
};

// Static method to get active alerts
alertSchema.statics.getActiveAlerts = function(filters = {}) {
  return this.find({ 
    status: { $in: ['active', 'acknowledged', 'in_progress'] },
    ...filters
  })
  .sort({ priority: -1, createdAt: -1 })
  .populate('bus', 'busId registrationNumber')
  .populate('driver', 'driverId name phone')
  .populate('acknowledgedBy.authority', 'name username')
  .populate('resolvedBy.authority', 'name username');
};

// Static method to get alerts by type
alertSchema.statics.getAlertsByType = function(type, limit = 50) {
  return this.find({ type: type })
             .sort({ createdAt: -1 })
             .limit(limit)
             .populate('bus', 'busId registrationNumber')
             .populate('driver', 'driverId name');
};

// Static method to get critical alerts
alertSchema.statics.getCriticalAlerts = function() {
  return this.find({ 
    severity: 'critical',
    status: { $in: ['active', 'acknowledged', 'in_progress'] }
  })
  .sort({ createdAt: -1 })
  .populate('bus', 'busId registrationNumber')
  .populate('driver', 'driverId name phone');
};

module.exports = mongoose.model('Alert', alertSchema);