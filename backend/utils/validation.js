const Joi = require('joi');

// Authority validation schemas
const authorityLoginSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(50).required(),
  password: Joi.string().min(6).required()
});

const authorityRegisterSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  name: Joi.string().min(2).max(100).required(),
  phone: Joi.string().pattern(/^[6-9]\d{9}$/).required(),
  department: Joi.string().max(100).optional(),
  role: Joi.string().valid('admin', 'supervisor', 'operator').default('operator')
});

// Driver validation schemas
const driverLoginSchema = Joi.object({
  driverId: Joi.string().pattern(/^DRV\d{4}$/).required(),
  password: Joi.string().min(4).required(),
  busId: Joi.string().pattern(/^BUS\d{3}$/).optional(),
  deviceInfo: Joi.object({
    deviceId: Joi.string().optional(),
    platform: Joi.string().optional(),
    version: Joi.string().optional()
  }).optional()
});

const driverRegisterSchema = Joi.object({
  driverId: Joi.string().pattern(/^DRV\d{4}$/).required(),
  name: Joi.string().min(2).max(100).required(),
  phone: Joi.string().pattern(/^[6-9]\d{9}$/).required(),
  email: Joi.string().email().optional(),
  password: Joi.string().min(4).required(),
  licenseNumber: Joi.string().min(10).max(20).required(),
  address: Joi.string().max(300).optional(),
  emergencyContact: Joi.object({
    name: Joi.string().max(100).optional(),
    phone: Joi.string().pattern(/^[6-9]\d{9}$/).optional(),
    relationship: Joi.string().max(50).optional()
  }).optional()
});

// Bus location validation schema
const locationUpdateSchema = Joi.object({
  busId: Joi.string().pattern(/^BUS\d{3}$/).required(),
  latitude: Joi.number().min(-90).max(90).required(),
  longitude: Joi.number().min(-180).max(180).required(),
  speed: Joi.number().min(0).max(200).default(0),
  heading: Joi.number().min(0).max(360).default(0),
  accuracy: Joi.number().min(0).default(10),
  altitude: Joi.number().default(0),
  // Make tripId optional to support clients that don't explicitly start trips
  tripId: Joi.string().optional(),
  passengers: Joi.object({
    onboard: Joi.number().min(0).default(0),
    boarded: Joi.number().min(0).default(0),
    alighted: Joi.number().min(0).default(0)
  }).optional(),
  deviceInfo: Joi.object({
    deviceId: Joi.string().optional(),
    appVersion: Joi.string().optional(),
    batteryLevel: Joi.number().min(0).max(100).optional()
  }).optional()
});

// SOS alert validation schema
const sosAlertSchema = Joi.object({
  busId: Joi.string().pattern(/^BUS\d{3}$/).required(),
  latitude: Joi.number().min(-90).max(90).required(),
  longitude: Joi.number().min(-180).max(180).required(),
  description: Joi.string().max(500).default('Emergency SOS Alert'),
  // Allow SOS without an explicit tripId; backend can associate if available
  tripId: Joi.string().optional(),
  passengers: Joi.number().min(0).optional(),
  deviceInfo: Joi.object({
    batteryLevel: Joi.number().min(0).max(100).optional(),
    networkStrength: Joi.number().min(0).max(100).optional()
  }).optional()
});

// SMS query validation schema
const smsQuerySchema = Joi.object({
  from: Joi.string().pattern(/^[6-9]\d{9}$/).required(),
  body: Joi.string().min(1).max(160).required()
});

// Route validation schema
const routeSchema = Joi.object({
  routeId: Joi.string().pattern(/^R\d{3}$/).required(),
  name: Joi.string().min(2).max(150).required(),
  description: Joi.string().max(500).optional(),
  startPoint: Joi.string().min(2).max(100).required(),
  endPoint: Joi.string().min(2).max(100).required(),
  totalDistance: Joi.number().min(0).required(),
  estimatedDuration: Joi.number().min(0).required(),
  baseFare: Joi.number().min(0).required(),
  fareStructure: Joi.string().valid('flat', 'distance-based', 'zone-based').default('flat'),
  operatingDays: Joi.array().items(
    Joi.string().valid('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')
  ).required(),
  stops: Joi.array().items(
    Joi.object({
      name: Joi.string().min(1).max(100).required(),
      coordinates: Joi.object({
        latitude: Joi.number().min(-90).max(90).required(),
        longitude: Joi.number().min(-180).max(180).required()
      }).required(),
      order: Joi.number().min(1).required(),
      estimatedTime: Joi.number().min(0).required(),
      fare: Joi.number().min(0).default(0)
    })
  ).min(2).required()
});

// Bus validation schema
const busSchema = Joi.object({
  busId: Joi.string().pattern(/^BUS\d{3}$/).required(),
  registrationNumber: Joi.string().pattern(/^[A-Z]{2}\d{2}[A-Z]{1,2}\d{4}$/).required(),
  route: Joi.string().required(), // MongoDB ObjectId
  capacity: Joi.number().min(10).max(100).required(),
  model: Joi.string().min(2).max(100).required(),
  manufacturer: Joi.string().min(2).max(50).required(),
  yearOfManufacture: Joi.number().min(2000).max(new Date().getFullYear()).required(),
  fuelType: Joi.string().valid('diesel', 'cng', 'electric', 'hybrid').required()
});

// Validation middleware function
const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      });
    }
    next();
  };
};

module.exports = {
  validate,
  authorityLoginSchema,
  authorityRegisterSchema,
  driverLoginSchema,
  driverRegisterSchema,
  locationUpdateSchema,
  sosAlertSchema,
  smsQuerySchema,
  routeSchema,
  busSchema
};