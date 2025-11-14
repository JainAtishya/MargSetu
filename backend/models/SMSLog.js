const mongoose = require('mongoose');

const SMSLogSchema = new mongoose.Schema({
  phoneNumber: {
    type: String,
    required: true,
    index: true
  },
  messageType: {
    type: String,
    required: true,
    enum: ['driver_gps', 'passenger_query', 'notification', 'alert', 'instruction'],
    index: true
  },
  messageSid: {
    type: String,
    required: true,
    unique: true
  },
  status: {
    type: String,
    required: true,
    enum: ['received', 'processed', 'responded', 'failed', 'sent'],
    default: 'received'
  },
  busId: {
    type: String,
    index: true
  },
  queryType: {
    type: String,
    enum: ['bus_location', 'route_buses', 'nearest_buses', 'help']
  },
  location: {
    latitude: Number,
    longitude: Number
  },
  query: String,
  response: String,
  processedAt: {
    type: Date,
    default: Date.now,
    index: false
  },
  responseTime: Number, // in milliseconds
  errorMessage: String,
  metadata: {
    userAgent: String,
    source: String,
    ipAddress: String,
    twilioStatus: String
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
SMSLogSchema.index({ phoneNumber: 1, messageType: 1 });
SMSLogSchema.index({ busId: 1, processedAt: -1 });
SMSLogSchema.index({ messageType: 1, status: 1 });
// Keep single-field descending index for queries by recency without duplicating field-level index
SMSLogSchema.index({ processedAt: -1 });

// Methods
SMSLogSchema.methods.markProcessed = function(responseTime) {
  this.status = 'processed';
  this.responseTime = responseTime;
  return this.save();
};

SMSLogSchema.methods.markFailed = function(errorMessage) {
  this.status = 'failed';
  this.errorMessage = errorMessage;
  return this.save();
};

// Statics for analytics
SMSLogSchema.statics.getAnalytics = async function(startDate, endDate) {
  const pipeline = [
    {
      $match: {
        processedAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      }
    },
    {
      $group: {
        _id: {
          type: '$messageType',
          status: '$status',
          date: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$processedAt'
            }
          }
        },
        count: { $sum: 1 },
        avgResponseTime: { $avg: '$responseTime' }
      }
    },
    {
      $group: {
        _id: '$_id.date',
        types: {
          $push: {
            type: '$_id.type',
            status: '$_id.status',
            count: '$count',
            avgResponseTime: '$avgResponseTime'
          }
        },
        totalMessages: { $sum: '$count' }
      }
    },
    {
      $sort: { _id: -1 }
    }
  ];

  return this.aggregate(pipeline);
};

SMSLogSchema.statics.getBusUsage = async function(busId, days = 7) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return this.find({
    busId,
    processedAt: { $gte: startDate }
  }).sort({ processedAt: -1 });
};

SMSLogSchema.statics.getPopularQueries = async function(days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const pipeline = [
    {
      $match: {
        messageType: 'passenger_query',
        processedAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$queryType',
        count: { $sum: 1 },
        successRate: {
          $avg: {
            $cond: [{ $eq: ['$status', 'responded'] }, 1, 0]
          }
        }
      }
    },
    {
      $sort: { count: -1 }
    }
  ];

  return this.aggregate(pipeline);
};

// Pre-save middleware
SMSLogSchema.pre('save', function(next) {
  if (this.isNew && !this.processedAt) {
    this.processedAt = new Date();
  }
  next();
});

module.exports = mongoose.model('SMSLog', SMSLogSchema);