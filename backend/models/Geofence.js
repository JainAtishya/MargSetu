const mongoose = require('mongoose');

const geofenceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  
  type: {
    type: String,
    enum: ['bus_stop', 'depot', 'restricted_area', 'school_zone', 'maintenance_area', 'checkpoint'],
    required: true
  },
  
  geometry: {
    type: {
      type: String,
      enum: ['Point', 'Polygon'],
      required: true
    },
    coordinates: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    }
  },
  
  radius: {
    type: Number, // in meters, used for Point geometry
    min: 1,
    max: 10000 // 10km max radius
  },
  
  routeId: {
    type: String,
    index: true
  },
  
  busStopId: {
    type: String,
    index: true
  },
  
  alertSettings: {
    onEntry: {
      type: Boolean,
      default: false
    },
    onExit: {
      type: Boolean,
      default: false
    },
    dwellTimeAlert: {
      type: Boolean,
      default: false
    },
    maxDwellTime: {
      type: Number,
      default: 300 // 5 minutes in seconds
    },
    speedAlert: {
      type: Boolean,
      default: false
    },
    maxSpeed: {
      type: Number,
      default: 40 // km/h
    },
    alertRecipients: [{
      type: String, // email addresses or phone numbers
      method: {
        type: String,
        enum: ['email', 'sms', 'push'],
        default: 'email'
      }
    }]
  },
  
  metadata: {
    description: String,
    address: String,
    landmark: String,
    operatingHours: {
      start: String, // HH:MM format
      end: String    // HH:MM format
    },
    daysActive: [{
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    }],
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium'
    }
  },
  
  analytics: {
    totalEntries: {
      type: Number,
      default: 0
    },
    totalExits: {
      type: Number,
      default: 0
    },
    averageDwellTime: {
      type: Number,
      default: 0
    },
    lastEntry: Date,
    lastExit: Date,
    mostActiveHour: Number,
    dailyTraffic: [{
      date: Date,
      entries: Number,
      exits: Number,
      avgDwellTime: Number
    }]
  },
  
  isActive: {
    type: Boolean,
    default: true
  },
  
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Geospatial index for efficient location queries
geofenceSchema.index({ geometry: '2dsphere' });

// Compound indexes for performance
geofenceSchema.index({ type: 1, isActive: 1 });
geofenceSchema.index({ routeId: 1, isActive: 1 });
geofenceSchema.index({ createdAt: -1 });

// Instance methods
geofenceSchema.methods.isPointInside = function(longitude, latitude) {
  if (this.geometry.type === 'Point') {
    // For circular geofences, calculate distance
    const R = 6371000; // Earth's radius in meters
    const φ1 = latitude * Math.PI / 180;
    const φ2 = this.geometry.coordinates[1] * Math.PI / 180;
    const Δφ = (this.geometry.coordinates[1] - latitude) * Math.PI / 180;
    const Δλ = (this.geometry.coordinates[0] - longitude) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;

    return distance <= this.radius;
  } else {
    // For polygon geofences, use MongoDB's geoWithin query
    // This is more efficiently done at the database level
    return false; // Placeholder - should be handled by database query
  }
};

geofenceSchema.methods.isCurrentlyActive = function() {
  if (!this.isActive) return false;
  
  if (!this.metadata.operatingHours || !this.metadata.daysActive) {
    return true; // Always active if no restrictions
  }
  
  const now = new Date();
  const currentDay = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
  
  // Check if today is an active day
  if (!this.metadata.daysActive.includes(currentDay)) {
    return false;
  }
  
  // Check operating hours
  const currentTime = now.getHours() * 60 + now.getMinutes(); // minutes since midnight
  const startTime = this.metadata.operatingHours.start.split(':');
  const endTime = this.metadata.operatingHours.end.split(':');
  
  const startMinutes = parseInt(startTime[0]) * 60 + parseInt(startTime[1]);
  const endMinutes = parseInt(endTime[0]) * 60 + parseInt(endTime[1]);
  
  return currentTime >= startMinutes && currentTime <= endMinutes;
};

geofenceSchema.methods.updateAnalytics = function(eventType, dwellTime = null) {
  if (eventType === 'entry') {
    this.analytics.totalEntries += 1;
    this.analytics.lastEntry = new Date();
  } else if (eventType === 'exit') {
    this.analytics.totalExits += 1;
    this.analytics.lastExit = new Date();
    
    if (dwellTime) {
      // Update average dwell time
      const totalDwellTime = this.analytics.averageDwellTime * (this.analytics.totalExits - 1) + dwellTime;
      this.analytics.averageDwellTime = totalDwellTime / this.analytics.totalExits;
    }
  }
  
  // Update daily traffic
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let todayTraffic = this.analytics.dailyTraffic.find(day => 
    day.date.getTime() === today.getTime()
  );
  
  if (!todayTraffic) {
    todayTraffic = {
      date: today,
      entries: 0,
      exits: 0,
      avgDwellTime: 0
    };
    this.analytics.dailyTraffic.push(todayTraffic);
  }
  
  if (eventType === 'entry') {
    todayTraffic.entries += 1;
  } else if (eventType === 'exit') {
    todayTraffic.exits += 1;
    if (dwellTime) {
      const totalDwellTime = todayTraffic.avgDwellTime * (todayTraffic.exits - 1) + dwellTime;
      todayTraffic.avgDwellTime = totalDwellTime / todayTraffic.exits;
    }
  }
  
  // Keep only last 30 days of daily traffic
  this.analytics.dailyTraffic = this.analytics.dailyTraffic
    .sort((a, b) => b.date - a.date)
    .slice(0, 30);
};

// Static methods
geofenceSchema.statics.findGeofencesForLocation = function(longitude, latitude, routeId = null) {
  const query = {
    isActive: true,
    geometry: {
      $geoIntersects: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude]
        }
      }
    }
  };
  
  if (routeId) {
    query.$or = [
      { routeId: routeId },
      { routeId: { $exists: false } } // Global geofences
    ];
  }
  
  return this.find(query);
};

geofenceSchema.statics.findNearbyGeofences = function(longitude, latitude, maxDistance = 1000) {
  return this.find({
    isActive: true,
    geometry: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        $maxDistance: maxDistance
      }
    }
  });
};

geofenceSchema.statics.getAnalyticsSummary = function(routeId = null, days = 7) {
  const matchStage = {
    isActive: true,
    'analytics.dailyTraffic.0': { $exists: true }
  };
  
  if (routeId) {
    matchStage.routeId = routeId;
  }
  
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - days);
  
  return this.aggregate([
    { $match: matchStage },
    { $unwind: '$analytics.dailyTraffic' },
    {
      $match: {
        'analytics.dailyTraffic.date': { $gte: fromDate }
      }
    },
    {
      $group: {
        _id: '$_id',
        name: { $first: '$name' },
        type: { $first: '$type' },
        routeId: { $first: '$routeId' },
        totalEntries: { $sum: '$analytics.dailyTraffic.entries' },
        totalExits: { $sum: '$analytics.dailyTraffic.exits' },
        avgDwellTime: { $avg: '$analytics.dailyTraffic.avgDwellTime' },
        maxDailyTraffic: { 
          $max: { 
            $add: ['$analytics.dailyTraffic.entries', '$analytics.dailyTraffic.exits'] 
          } 
        }
      }
    },
    { $sort: { totalEntries: -1 } }
  ]);
};

// Pre-save middleware
geofenceSchema.pre('save', function(next) {
  // Validate geometry based on type
  if (this.geometry.type === 'Point' && !this.radius) {
    return next(new Error('Radius is required for Point geometry'));
  }
  
  if (this.geometry.type === 'Polygon' && this.radius) {
    this.radius = undefined; // Remove radius for polygons
  }
  
  // Validate coordinates
  if (this.geometry.type === 'Point') {
    const [lng, lat] = this.geometry.coordinates;
    if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
      return next(new Error('Invalid coordinates for Point geometry'));
    }
  }
  
  next();
});

// Post-save middleware
geofenceSchema.post('save', function(doc) {
  console.log(`Geofence ${doc.name} (${doc.type}) saved successfully`);
});

module.exports = mongoose.model('Geofence', geofenceSchema);