const mongoose = require('mongoose');

const stationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Station name is required'],
    trim: true,
    maxlength: [100, 'Station name cannot exceed 100 characters']
  },
  
  code: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    uppercase: true,
    maxlength: [10, 'Station code cannot exceed 10 characters']
  },
  
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: [true, 'Station coordinates are required'],
      validate: {
        validator: function(coords) {
          return coords && coords.length === 2 && 
                 coords[0] >= -180 && coords[0] <= 180 && // longitude
                 coords[1] >= -90 && coords[1] <= 90;     // latitude
        },
        message: 'Invalid coordinates. Must be [longitude, latitude] within valid ranges'
      }
    },
    address: {
      type: String,
      trim: true,
      maxlength: [200, 'Address cannot exceed 200 characters']
    }
  },
  
  facilities: [{
    type: String,
    enum: ['waiting-area', 'shelter', 'toilets', 'parking', 'food-court', 'atm', 'wifi', 'charging-points']
  }],
  
  status: {
    type: String,
    enum: ['active', 'inactive', 'under-construction', 'maintenance'],
    default: 'active'
  },
  
  operatingHours: {
    start: {
      type: String,
      match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid start time format (HH:MM)']
    },
    end: {
      type: String,
      match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid end time format (HH:MM)']
    }
  },
  
  capacity: {
    type: Number,
    min: [1, 'Capacity must be at least 1'],
    max: [10000, 'Capacity cannot exceed 10000']
  },
  
  platformCount: {
    type: Number,
    min: [1, 'Platform count must be at least 1'],
    max: [50, 'Platform count cannot exceed 50'],
    default: 1
  },
  
  authority: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Authority',
    required: [true, 'Authority reference is required']
  },
  
  contactInfo: {
    phone: {
      type: String,
      match: [/^\+?[\d\s\-\(\)]{10,15}$/, 'Invalid phone number format']
    },
    email: {
      type: String,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email format']
    }
  },
  
  accessibility: {
    wheelchairAccessible: {
      type: Boolean,
      default: false
    },
    escalator: {
      type: Boolean,
      default: false
    },
    elevator: {
      type: Boolean,
      default: false
    },
    audioAnnouncements: {
      type: Boolean,
      default: false
    }
  },
  
  amenities: {
    restrooms: Boolean,
    foodVendors: Boolean,
    newsstand: Boolean,
    ticketCounter: Boolean,
    waitingRoom: Boolean
  },
  
  isActive: {
    type: Boolean,
    default: true
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Create geospatial index for location-based queries
stationSchema.index({ location: '2dsphere' });

// Create text index for search functionality
stationSchema.index({ 
  name: 'text', 
  'location.address': 'text',
  code: 'text'
});

// Virtual for getting latitude
stationSchema.virtual('latitude').get(function() {
  return this.location && this.location.coordinates ? this.location.coordinates[1] : null;
});

// Virtual for getting longitude
stationSchema.virtual('longitude').get(function() {
  return this.location && this.location.coordinates ? this.location.coordinates[0] : null;
});

// Pre-save middleware to update timestamps
stationSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Pre-save middleware to generate station code if not provided
stationSchema.pre('save', function(next) {
  if (!this.code && this.name) {
    // Generate code from first 3 letters of name + random number
    const nameCode = this.name.replace(/[^A-Za-z]/g, '').substring(0, 3).toUpperCase();
    const randomNum = Math.floor(Math.random() * 999).toString().padStart(3, '0');
    this.code = nameCode + randomNum;
  }
  next();
});

// Instance method to calculate distance to another station
stationSchema.methods.calculateDistanceTo = function(otherStation) {
  if (!this.location || !otherStation.location) {
    return null;
  }
  
  const R = 6371; // Earth's radius in kilometers
  const dLat = (otherStation.latitude - this.latitude) * Math.PI / 180;
  const dLon = (otherStation.longitude - this.longitude) * Math.PI / 180;
  
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(this.latitude * Math.PI / 180) * Math.cos(otherStation.latitude * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in kilometers
};

// Static method to find nearby stations
stationSchema.statics.findNearby = function(longitude, latitude, maxDistance = 5000) {
  return this.find({
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        $maxDistance: maxDistance // in meters
      }
    },
    isActive: true
  });
};

// Static method to search stations by text
stationSchema.statics.searchByText = function(searchTerm) {
  return this.find({
    $text: { $search: searchTerm },
    isActive: true
  }, {
    score: { $meta: 'textScore' }
  }).sort({
    score: { $meta: 'textScore' }
  });
};

const Station = mongoose.model('Station', stationSchema);

module.exports = Station;