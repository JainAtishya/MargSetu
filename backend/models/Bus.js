const mongoose = require('mongoose');

const busSchema = new mongoose.Schema({
  busId: {
    type: String,
    required: [true, 'Bus ID is required'],
    unique: true,
    trim: true,
    uppercase: true,
    match: [/^BUS\d{3}$/, 'Bus ID must be in format BUS001']
  },
  registrationNumber: {
    type: String,
    required: [true, 'Registration number is required'],
    unique: true,
    trim: true,
    uppercase: true,
    match: [/^[A-Z]{2}\d{2}[A-Z]{1,2}\d{4}$/, 'Please enter a valid Indian vehicle registration number']
  },
  route: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Route',
    required: [true, 'Route assignment is required']
  },
  currentDriver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver',
    default: null
  },
  capacity: {
    type: Number,
    required: [true, 'Bus capacity is required'],
    min: [10, 'Capacity must be at least 10'],
    max: [100, 'Capacity cannot exceed 100']
  },
  model: {
    type: String,
    required: [true, 'Bus model is required'],
    trim: true,
    maxlength: [100, 'Model name cannot exceed 100 characters']
  },
  manufacturer: {
    type: String,
    required: [true, 'Manufacturer is required'],
    trim: true,
    maxlength: [50, 'Manufacturer name cannot exceed 50 characters']
  },
  yearOfManufacture: {
    type: Number,
    required: [true, 'Year of manufacture is required'],
    min: [2000, 'Year must be 2000 or later'],
    max: [new Date().getFullYear(), 'Year cannot be in the future']
  },
  fuelType: {
    type: String,
    enum: ['diesel', 'cng', 'electric', 'hybrid'],
    required: [true, 'Fuel type is required']
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'maintenance', 'breakdown'],
    default: 'inactive'
  },
  operationalStatus: {
    type: String,
    enum: ['idle', 'running', 'break', 'completed'],
    default: 'idle'
  },
  currentLocation: {
    coordinates: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [0, 0]
      }
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    },
    speed: {
      type: Number,
      default: 0,
      min: [0, 'Speed cannot be negative']
    },
    heading: {
      type: Number,
      default: 0,
      min: [0, 'Heading must be between 0 and 360'],
      max: [360, 'Heading must be between 0 and 360']
    }
  },
  currentTrip: {
    tripId: {
      type: String,
      default: null
    },
    startTime: {
      type: Date,
      default: null
    },
    currentStopOrder: {
      type: Number,
      default: 0
    },
    direction: {
      type: String,
      enum: ['forward', 'backward'],
      default: 'forward'
    },
    passengersCount: {
      type: Number,
      default: 0,
      min: [0, 'Passenger count cannot be negative']
    }
  },
  maintenance: {
    lastService: {
      type: Date
    },
    nextService: {
      type: Date
    },
    mileage: {
      type: Number,
      default: 0,
      min: [0, 'Mileage cannot be negative']
    }
  },
  emergencyFeatures: {
    panicButton: {
      type: Boolean,
      default: true
    },
    gpsTracker: {
      type: Boolean,
      default: true
    },
    camera: {
      type: Boolean,
      default: false
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Create geospatial index for location queries
busSchema.index({ "currentLocation.coordinates": "2dsphere" });

// Other indexes for faster queries
busSchema.index({ route: 1 });
busSchema.index({ currentDriver: 1 });
busSchema.index({ status: 1, operationalStatus: 1 });
busSchema.index({ isActive: 1 });

// Virtual for bus summary
busSchema.virtual('summary').get(function() {
  return {
    id: this.busId,
    registration: this.registrationNumber,
    status: this.status,
    operationalStatus: this.operationalStatus,
    currentDriver: this.currentDriver,
    route: this.route,
    lastUpdate: this.currentLocation.lastUpdated
  };
});

// Method to update location
busSchema.methods.updateLocation = function(latitude, longitude, speed = 0, heading = 0) {
  this.currentLocation = {
    coordinates: {
      type: 'Point',
      coordinates: [longitude, latitude]
    },
    lastUpdated: new Date(),
    speed: speed,
    heading: heading
  };
  return this.save();
};

// Method to start trip
busSchema.methods.startTrip = function(tripId) {
  this.currentTrip = {
    tripId: tripId,
    startTime: new Date(),
    currentStopOrder: 0,
    direction: 'forward',
    passengersCount: 0
  };
  this.operationalStatus = 'running';
  return this.save();
};

// Method to end trip
busSchema.methods.endTrip = function() {
  this.currentTrip = {
    tripId: null,
    startTime: null,
    currentStopOrder: 0,
    direction: 'forward',
    passengersCount: 0
  };
  this.operationalStatus = 'idle';
  return this.save();
};

// Static method to find nearby buses
busSchema.statics.findNearby = function(longitude, latitude, maxDistance = 5000) {
  return this.find({
    "currentLocation.coordinates": {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [longitude, latitude]
        },
        $maxDistance: maxDistance
      }
    },
    status: 'active',
    operationalStatus: 'running'
  });
};

module.exports = mongoose.model('Bus', busSchema);