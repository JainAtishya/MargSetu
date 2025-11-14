const mongoose = require('mongoose');

const stopSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Stop name is required'],
    trim: true,
    maxlength: [100, 'Stop name cannot exceed 100 characters']
  },
  coordinates: {
    latitude: {
      type: Number,
      required: [true, 'Latitude is required'],
      min: [-90, 'Latitude must be between -90 and 90'],
      max: [90, 'Latitude must be between -90 and 90']
    },
    longitude: {
      type: Number,
      required: [true, 'Longitude is required'],
      min: [-180, 'Longitude must be between -180 and 180'],
      max: [180, 'Longitude must be between -180 and 180']
    }
  },
  order: {
    type: Number,
    required: [true, 'Stop order is required'],
    min: [1, 'Stop order must be at least 1']
  },
  estimatedTime: {
    type: Number, // in minutes from start
    required: [true, 'Estimated time is required'],
    min: [0, 'Estimated time cannot be negative']
  },
  fare: {
    type: Number,
    default: 0,
    min: [0, 'Fare cannot be negative']
  }
});

const routeSchema = new mongoose.Schema({
  routeId: {
    type: String,
    required: [true, 'Route ID is required'],
    unique: true,
    trim: true,
    uppercase: true,
    match: [/^R\d{3}$/, 'Route ID must be in format R001']
  },
  name: {
    type: String,
    required: [true, 'Route name is required'],
    trim: true,
    maxlength: [150, 'Route name cannot exceed 150 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  startPoint: {
    type: String,
    required: [true, 'Start point is required'],
    trim: true
  },
  endPoint: {
    type: String,
    required: [true, 'End point is required'],
    trim: true
  },
  stops: [stopSchema],
  totalDistance: {
    type: Number, // in kilometers
    required: [true, 'Total distance is required'],
    min: [0, 'Distance cannot be negative']
  },
  estimatedDuration: {
    type: Number, // in minutes
    required: [true, 'Estimated duration is required'],
    min: [0, 'Duration cannot be negative']
  },
  operatingDays: [{
    type: String,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  }],
  schedule: [{
    startTime: {
      type: String,
      required: true,
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Start time must be in HH:MM format']
    },
    endTime: {
      type: String,
      required: true,
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'End time must be in HH:MM format']
    },
    frequency: {
      type: Number, // in minutes
      default: 30,
      min: [5, 'Frequency must be at least 5 minutes']
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  baseFare: {
    type: Number,
    required: [true, 'Base fare is required'],
    min: [0, 'Base fare cannot be negative']
  },
  fareStructure: {
    type: String,
    enum: ['flat', 'distance-based', 'zone-based'],
    default: 'flat'
  }
}, {
  timestamps: true
});

// Indexes for faster queries (avoid duplicating unique single-field indexes)
routeSchema.index({ isActive: 1 });
routeSchema.index({ 'stops.coordinates': '2dsphere' }); // For geospatial queries

// Virtual for route summary
routeSchema.virtual('summary').get(function() {
  return {
    id: this.routeId,
    name: this.name,
    startPoint: this.startPoint,
    endPoint: this.endPoint,
    totalStops: this.stops.length,
    duration: this.estimatedDuration,
    isActive: this.isActive
  };
});

// Method to get next stop
routeSchema.methods.getNextStop = function(currentStopOrder) {
  const nextStop = this.stops.find(stop => stop.order === currentStopOrder + 1);
  return nextStop || null;
};

// Method to calculate fare between stops
routeSchema.methods.calculateFare = function(fromStopOrder, toStopOrder) {
  if (this.fareStructure === 'flat') {
    return this.baseFare;
  }
  
  if (this.fareStructure === 'distance-based') {
    const distance = Math.abs(toStopOrder - fromStopOrder);
    return this.baseFare + (distance * 2); // 2 rupees per stop
  }
  
  return this.baseFare;
};

module.exports = mongoose.model('Route', routeSchema);