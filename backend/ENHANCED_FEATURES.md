# MargSetu Backend - Enhanced Features Documentation

## 🚀 Overview

The MargSetu backend has been significantly enhanced with enterprise-grade features including advanced GPS tracking, sophisticated authentication, real-time analytics, intelligent notifications, and comprehensive monitoring capabilities.

## 📋 Table of Contents

1. [Enhanced Authentication System](#enhanced-authentication-system)
2. [Advanced GPS Location Services](#advanced-gps-location-services)
3. [Intelligent Notification System](#intelligent-notification-system)
4. [Advanced Analytics Engine](#advanced-analytics-engine)
5. [Geofencing System](#geofencing-system)
6. [API Endpoints](#api-endpoints)
7. [Environment Configuration](#environment-configuration)
8. [Installation & Setup](#installation--setup)

## 🔐 Enhanced Authentication System

### Features
- **Multi-factor Authentication**: Email and phone verification
- **Enterprise Security**: Password complexity validation, account lockout protection
- **JWT Token Management**: Access and refresh tokens with secure rotation
- **Session Management**: Multiple device support with session control
- **Admin Features**: User management, role-based access control

### Endpoints
```
POST /api/v1/auth/register          - Enhanced user registration
POST /api/v1/auth/login             - Secure login with MFA
POST /api/v1/auth/verify-email      - Email verification
POST /api/v1/auth/verify-phone      - Phone verification
POST /api/v1/auth/refresh-token     - Token refresh
GET  /api/v1/auth/profile           - User profile
PUT  /api/v1/auth/profile           - Update profile
POST /api/v1/auth/change-password   - Change password
POST /api/v1/auth/reset-password    - Password reset
GET  /api/v1/auth/sessions          - Manage sessions
```

### Security Features
- Password complexity requirements (8+ chars, uppercase, lowercase, number, special char)
- Account lockout after 5 failed attempts
- Rate limiting on authentication endpoints
- Secure password hashing with bcrypt
- JWT tokens with short expiration and refresh mechanism

## 📍 Advanced GPS Location Services

### Features
- **Sophisticated Algorithms**: Haversine distance calculations, bearing analysis
- **Route Adherence Monitoring**: Real-time deviation detection
- **ETA Predictions**: Advanced arrival time calculations
- **Geofencing**: Entry/exit detection with customizable zones
- **Data Quality Assessment**: GPS accuracy and reliability scoring
- **Real-time Broadcasting**: WebSocket integration for live updates

### Key Components

#### GpsUtils Class
```javascript
// Distance calculation using Haversine formula
calculateDistance(lat1, lon1, lat2, lon2)

// Bearing calculation for direction tracking
calculateBearing(lat1, lon1, lat2, lon2)

// ETA prediction based on historical data
predictETA(currentLocation, destination, historicalSpeeds)

// Route adherence checking
checkRouteAdherence(currentLocation, plannedRoute)
```

### Endpoints
```
POST /api/v1/locations/v2/update           - Advanced location update
GET  /api/v1/locations/v2/bus/:busId       - Enhanced bus tracking
GET  /api/v1/locations/v2/nearby           - Advanced nearby buses
GET  /api/v1/locations/v2/history/:busId   - Historical location data
GET  /api/v1/locations/v2/fleet/overview   - Fleet monitoring
GET  /api/v1/locations/v2/tracking/:busId/stream - Real-time tracking
```

### Advanced Features
- **Route Optimization**: Analysis and recommendations
- **Real-time Streams**: Server-sent events for live tracking
- **Historical Analysis**: Granular data with analytics
- **Fleet Overview**: Comprehensive monitoring dashboard

## 🔔 Intelligent Notification System

### Features
- **Multi-channel Delivery**: Email, SMS, push notifications, in-app
- **Priority-based Routing**: Critical, high, medium, low priorities
- **Automatic Retry Logic**: Configurable retry attempts with exponential backoff
- **Template System**: HTML email templates with branding
- **Bulk Notifications**: Efficient mass notification delivery
- **Delivery Tracking**: Read receipts and delivery confirmation

### Notification Types
```javascript
// GPS-related alerts
'route_deviation'      - Bus deviating from planned route
'speed_violation'      - Speed limit violations
'geofence_entry'       - Entering defined zones
'geofence_exit'        - Exiting defined zones

// Operational alerts
'emergency_alert'      - Emergency situations
'maintenance_reminder' - Vehicle maintenance due
'passenger_alert'      - Passenger-related notifications
'driver_shift'         - Driver shift changes
'breakdown'            - Vehicle breakdown
'delay_alert'          - Schedule delays
```

### Auto-generated Alerts
- Route deviation detection (configurable threshold)
- Speed violation alerts with location data
- Geofence entry/exit notifications
- Poor GPS quality warnings
- Extended idle time alerts

## 📊 Advanced Analytics Engine

### Features
- **Fleet Performance Metrics**: Comprehensive operational analytics
- **Route Optimization**: Data-driven route analysis and recommendations
- **Predictive Analytics**: Future pattern prediction and insights
- **Real-time Dashboard**: Live system monitoring
- **Historical Trends**: Long-term pattern analysis
- **Export Capabilities**: CSV and JSON data export

### Analytics Endpoints
```
GET /api/v1/analytics/fleet/performance     - Fleet performance metrics
GET /api/v1/analytics/routes/:id/performance - Route-specific analytics
GET /api/v1/analytics/dashboard             - Real-time dashboard data
GET /api/v1/analytics/trends                - Historical trend analysis
GET /api/v1/analytics/predictions           - Predictive insights
GET /api/v1/analytics/buses/:id/analytics   - Bus-specific analytics
GET /api/v1/analytics/system/health         - System health monitoring
GET /api/v1/analytics/export                - Data export
```

### Key Metrics
- **Operational**: Distance traveled, average speed, route adherence
- **Passenger**: Boarding/alighting patterns, occupancy rates
- **Safety**: Alert frequency, incident patterns
- **Efficiency**: Fuel consumption, schedule adherence
- **Quality**: Data accuracy, system uptime

## 🗺️ Geofencing System

### Features
- **Flexible Geometry**: Support for circular and polygon geofences
- **Smart Alerts**: Configurable entry/exit notifications
- **Dwell Time Monitoring**: Track time spent in zones
- **Analytics Integration**: Geofence usage analytics
- **Route Association**: Link geofences to specific routes
- **Schedule-based Activation**: Time and day-specific geofences

### Geofence Types
- `bus_stop` - Official bus stop locations
- `depot` - Bus depot and maintenance areas
- `restricted_area` - No-go zones
- `school_zone` - School areas with speed restrictions
- `maintenance_area` - Maintenance facilities
- `checkpoint` - Route checkpoints

### Management Endpoints
```
POST /api/v1/locations/v2/geofences    - Create geofence
GET  /api/v1/locations/v2/geofences    - List geofences
PUT  /api/v1/locations/v2/geofences/:id - Update geofence
DELETE /api/v1/locations/v2/geofences/:id - Delete geofence
```

## 🔧 Environment Configuration

### Required Environment Variables
```bash
# Database
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/margSetu

# Server Configuration
PORT=5000
NODE_ENV=production
FRONTEND_URL=https://your-frontend-domain.com

# Authentication
JWT_SECRET=your-super-secure-jwt-secret-key
JWT_REFRESH_SECRET=your-refresh-token-secret
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=30d

# Email Service
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=MargSetu <noreply@margsetu.com>

# SMS Service (optional)
SMS_SERVICE=twilio
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_PHONE_NUMBER=+1234567890

# Security
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100

# Features
ENABLE_GEOFENCING=true
ENABLE_PREDICTIVE_ANALYTICS=true
ENABLE_NOTIFICATIONS=true

# API Configuration
API_VERSION=v1
```

## 🚀 Installation & Setup

### Prerequisites
- Node.js 16+ 
- MongoDB Atlas account or local MongoDB
- Gmail account (for email service)
- Git

### Step-by-Step Installation

1. **Clone and Install Dependencies**
```bash
cd Backend
npm install
```

2. **Environment Configuration**
```bash
# Copy example environment file
cp .env.example .env

# Edit environment variables
nano .env
```

3. **Database Setup**
```bash
# The app will automatically connect to MongoDB
# Ensure your MongoDB URI is correct in .env
```

4. **Start the Server**
```bash
# Development mode
npm run dev

# Production mode
npm start
```

5. **Verify Installation**
```bash
# Check health endpoint
curl http://localhost:5000/health

# Check enhanced features
curl http://localhost:5000/api/v1/locations/v2/health
curl http://localhost:5000/api/v1/analytics/health
```

## 📚 API Reference

### Authentication Headers
```javascript
// For protected endpoints, include:
Headers: {
  'Authorization': 'Bearer your-jwt-token',
  'Content-Type': 'application/json'
}
```

### Response Format
```javascript
// Success Response
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully"
}

// Error Response
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error information"
}
```

### Rate Limiting
- Authentication endpoints: 5 requests per 15 minutes
- Location updates: 100 requests per minute per driver
- Analytics endpoints: 100 requests per 15 minutes
- General API: 1000 requests per 15 minutes

## 🔍 Monitoring & Debugging

### Health Check Endpoints
```
GET /health                           - Basic server health
GET /api/v1/locations/v2/health      - GPS services health
GET /api/v1/analytics/health         - Analytics services health
GET /api/v1/analytics/system/health  - Detailed system metrics
```

### Logging
- All requests are logged with Morgan
- Error logging with detailed stack traces
- Performance monitoring for slow queries
- Authentication events logging

### Performance Optimization
- Database indexes on frequently queried fields
- Geospatial indexes for location queries
- Connection pooling for database connections
- Compression middleware for responses
- Rate limiting to prevent abuse

## 🛡️ Security Features

### Data Protection
- HTTPS enforcement (in production)
- CORS configuration
- Helmet.js security headers
- Input validation and sanitization
- SQL injection prevention (using Mongoose)

### Authentication Security
- Secure password hashing
- JWT token rotation
- Session management
- Account lockout protection
- Rate limiting on auth endpoints

### API Security
- Request validation
- Authorization middleware
- Role-based access control
- API versioning
- Error handling without information leakage

## 🎯 Best Practices

### Development
- Use environment variables for configuration
- Implement proper error handling
- Follow RESTful API conventions
- Use middleware for cross-cutting concerns
- Implement comprehensive logging

### Production
- Enable HTTPS
- Use process managers (PM2)
- Implement monitoring and alerting
- Regular security updates
- Database backup strategies
- Load balancing for high availability

## 📞 Support

For technical support or questions about the enhanced MargSetu backend:

- **Issues**: Create GitHub issues for bug reports
- **Feature Requests**: Submit enhancement proposals
- **Documentation**: Refer to inline code comments
- **API Testing**: Use provided Postman collection

## 🔄 Version History

### v2.0.0 (Current)
- Enhanced authentication with MFA
- Advanced GPS tracking with geofencing
- Comprehensive analytics engine
- Intelligent notification system
- Real-time monitoring capabilities

### v1.0.0 (Legacy)
- Basic GPS tracking
- Simple authentication
- Basic alert system
- Limited analytics

---

**MargSetu Enhanced Backend** - Making public transportation smarter, safer, and more efficient.