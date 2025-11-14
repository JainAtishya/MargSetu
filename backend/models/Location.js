const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
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
  tripId: {
    type: String,
    required: false,
    trim: true
  },
  coordinates: {
    type: {
      type: String,
      enum: ['Point'],
      required: true,
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: [true, 'Coordinates are required'],
      validate: {
        validator: function (coords) {
          return coords.length === 2 &&
            coords[0] >= -180 && coords[0] <= 180 && // longitude
            coords[1] >= -90 && coords[1] <= 90;    // latitude
        },
        message: 'Invalid coordinates format. Must be [longitude, latitude]'
      }
    }
  },
  speed: {
    type: Number,
    default: 0,
    min: [0, 'Speed cannot be negative'],
    max: [200, 'Speed seems unrealistic'] // in km/h
  },
  heading: {
    type: Number,
    default: 0,
    min: [0, 'Heading must be between 0 and 360'],
    max: [360, 'Heading must be between 0 and 360']
  },
  accuracy: {
    type: Number,
    default: 10, // GPS accuracy in meters
    min: [0, 'Accuracy cannot be negative']
  },
  altitude: {
    type: Number,
    default: 0 // in meters
  },
  currentStop: {
    stopId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },
    stopName: {
      type: String,
      trim: true
    },
    stopOrder: {
      type: Number,
      default: 0
    },
    arrivalTime: {
      type: Date,
      default: null
    },
    departureTime: {
      type: Date,
      default: null
    }
  },
  passengers: {
    onboard: {
      type: Number,
      default: 0,
      min: [0, 'Passenger count cannot be negative']
    },
    boarded: {
      type: Number,
      default: 0,
      min: [0, 'Passenger count cannot be negative']
    },
    alighted: {
      type: Number,
      default: 0,
      min: [0, 'Passenger count cannot be negative']
    }
  },
  networkInfo: {
    type: {
      type: String,
      enum: ['mobile', 'wifi', 'sms'],
      default: 'mobile'
    },
    strength: {
      type: Number,
      min: [0, 'Signal strength must be between 0 and 100'],
      max: [100, 'Signal strength must be between 0 and 100'],
      default: 100
    },
    provider: {
      type: String,
      trim: true
    }
  },
  deviceInfo: {
    deviceId: {
      type: String,
      trim: true
    },
    appVersion: {
      type: String,
      trim: true
    },
    batteryLevel: {
      type: Number,
      min: [0, 'Battery level must be between 0 and 100'],
      max: [100, 'Battery level must be between 0 and 100']
    }
  },
  isManual: {
    type: Boolean,
    default: false // true if location was manually updated
  },
  source: {
    type: String,
    enum: ['gps', 'network', 'sms', 'manual'],
    default: 'gps'
  }
}, {
  timestamps: true
});

// Create geospatial index
locationSchema.index({ coordinates: "2dsphere" });

// Compound indexes for efficient queries
locationSchema.index({ bus: 1, createdAt: -1 });
locationSchema.index({ driver: 1, createdAt: -1 });
locationSchema.index({ tripId: 1, createdAt: -1 });

// TTL index to automatically delete old location records after 30 days
locationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 }); // 30 days

// Virtual for formatted coordinates
locationSchema.virtual('latitude').get(function () {
  return this.coordinates.coordinates[1];
});

locationSchema.virtual('longitude').get(function () {
  return this.coordinates.coordinates[0];
});

// Method to calculate distance from another point
locationSchema.methods.distanceFrom = function (longitude, latitude) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (latitude - this.latitude) * Math.PI / 180;
  const dLon = (longitude - this.longitude) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(this.latitude * Math.PI / 180) * Math.cos(latitude * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in kilometers
};

// Static method to get latest location for a bus
locationSchema.statics.getLatestForBus = function (busId) {
  return this.findOne({ bus: busId }).sort({ createdAt: -1 });
};

// Static method to get location history for a trip
locationSchema.statics.getTripHistory = function (tripId, limit = 100) {
  return this.find({ tripId: tripId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('bus', 'busId registrationNumber')
    .populate('driver', 'driverId name');
};

// Static method to find buses near a location
locationSchema.statics.findNearbyBuses = function (longitude, latitude, maxDistance = 5000) {
  return this.aggregate([
    {
      $geoNear: {
        near: {
          type: "Point",
          coordinates: [longitude, latitude]
        },
        distanceField: "distance",
        maxDistance: maxDistance,
        spherical: true
      }
    },
    {
      $sort: { createdAt: -1 }
    },
    {
      $group: {
        _id: "$bus",
        latestLocation: { $first: "$$ROOT" }
      }
    },
    {
      $replaceRoot: { newRoot: "$latestLocation" }
    },
    {
      $lookup: {
        from: "buses",
        localField: "bus",
        foreignField: "_id",
        as: "busInfo"
      }
    }
  ]);
};

module.exports = mongoose.model('Location', locationSchema);