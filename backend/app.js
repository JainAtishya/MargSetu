const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const compression = require('compression');

// Load environment configuration
const { loadEnvironment } = require('./config/env');
const config = loadEnvironment();

console.log('🚀 Starting MargSetu Backend Server...');
console.log(`📍 Environment: ${config.NODE_ENV}`);
console.log(`🌐 Port: ${config.PORT}`);

const app = express();
const server = http.createServer(app);

// Socket.IO setup with proper CORS
const io = socketIo(server, {
  cors: {
    origin: config.FRONTEND_URL,
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Make io available to routes and services
app.set('io', io);
global.io = io;

// Database connection with retry logic
const connectDatabase = async () => {
  try {
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 2,
      bufferMaxEntries: 0
    };

    await mongoose.connect(config.MONGODB_URI, options);
    console.log('🍃 MongoDB Connected Successfully');
    
    // Setup connection event listeners
    mongoose.connection.on('error', (err) => {
      console.error('📢 MongoDB connection error:', err.message);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('📢 MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('🍃 MongoDB reconnected successfully');
    });

  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.log('🔄 Retrying connection in 5 seconds...');
    setTimeout(connectDatabase, 5000);
  }
};

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false
}));

// CORS configuration
app.use(cors({
  origin: config.FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-device-id', 'x-app-version']
}));

// Compression middleware
app.use(compression());

// Logging middleware
if (config.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW * 60 * 1000, // minutes
  max: config.RATE_LIMIT_MAX,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
    retryAfter: config.RATE_LIMIT_WINDOW
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ 
  limit: config.MAX_UPLOAD_SIZE,
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true, limit: config.MAX_UPLOAD_SIZE }));

// API routes
try {
  const authRoutes = require('./routes/auth');
  const enhancedAuthRoutes = require('./routes/enhancedAuth');
  const busRoutes = require('./routes/buses');
  const locationRoutes = require('./routes/locations');
  const enhancedLocationRoutes = require('./routes/enhancedLocations');
  const alertRoutes = require('./routes/alerts');
  const routeRoutes = require('./routes/routes');
  const analyticsRoutes = require('./routes/analytics');

  // Enhanced routes (v2 API)
  app.use(`/api/${config.API_VERSION}/auth`, enhancedAuthRoutes);
  app.use(`/api/${config.API_VERSION}/locations`, enhancedLocationRoutes);
  app.use(`/api/${config.API_VERSION}/analytics`, analyticsRoutes);
  app.use(`/api/${config.API_VERSION}/buses`, busRoutes);
  app.use(`/api/${config.API_VERSION}/alerts`, alertRoutes);
  app.use(`/api/${config.API_VERSION}/routes`, routeRoutes);

  // Legacy routes for backward compatibility
  app.use('/api/auth', authRoutes);
  app.use('/api/buses', busRoutes);
  app.use('/api/locations', locationRoutes);
  app.use('/api/alerts', alertRoutes);
  app.use('/api/routes', routeRoutes);

  console.log('✅ API routes loaded successfully');
  console.log('✅ Enhanced features available at /api/v1/ endpoints');
  console.log('✅ Advanced analytics available at /api/v1/analytics');
} catch (error) {
  console.error('❌ Error loading routes:', error.message);
}

// Health check endpoint
app.get('/health', (req, res) => {
  const healthCheck = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.NODE_ENV,
    version: config.API_VERSION,
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    memory: process.memoryUsage(),
    pid: process.pid
  };

  res.status(200).json(healthCheck);
});

// API documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    message: 'MargSetu Backend API',
    version: config.API_VERSION,
    documentation: '/api/docs',
    endpoints: {
      auth: `/api/${config.API_VERSION}/auth`,
      buses: `/api/${config.API_VERSION}/buses`,
      locations: `/api/${config.API_VERSION}/locations`,
      alerts: `/api/${config.API_VERSION}/alerts`,
      routes: `/api/${config.API_VERSION}/routes`
    },
    features: [
      'Real-time GPS tracking',
      'Driver authentication',
      'SOS alert system',
      'Bus management',
      'Route optimization',
      'WebSocket notifications'
    ]
  });
});

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  // Join bus tracking room
  socket.on('trackBus', (busId) => {
    socket.join(`bus-${busId}`);
    console.log(`📍 Client ${socket.id} tracking bus ${busId}`);
  });

  // Join authority dashboard
  socket.on('joinAuthority', () => {
    socket.join('authority-dashboard');
    console.log(`👮 Authority client ${socket.id} joined dashboard`);
  });

  // Leave tracking
  socket.on('stopTracking', (busId) => {
    socket.leave(`bus-${busId}`);
    console.log(`🛑 Client ${socket.id} stopped tracking bus ${busId}`);
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('🚨 Server error:', err);
  
  // Default error response
  let error = { ...err };
  error.message = err.message;

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message);
    error = { message: message.join(', '), statusCode: 400 };
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    error = { message, statusCode: 400 };
  }

  // JWT error
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = { message, statusCode: 401 };
  }

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Server Error',
    ...(config.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    availableEndpoints: '/api'
  });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT. Graceful shutdown...');
  
  try {
    await mongoose.connection.close();
    console.log('🍃 MongoDB connection closed');
    
    server.close(() => {
      console.log('🚪 HTTP server closed');
      process.exit(0);
    });
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});

// Start server
const startServer = async () => {
  try {
    await connectDatabase();
    
    server.listen(config.PORT, () => {
      console.log('\n🎉 MargSetu Backend Server Started!');
      console.log(`🌐 Server running on port ${config.PORT}`);
      console.log(`📍 Environment: ${config.NODE_ENV}`);
      console.log(`🔗 Health check: http://localhost:${config.PORT}/health`);
      console.log(`📚 API docs: http://localhost:${config.PORT}/api`);
      console.log(`🗺️ GPS endpoints: http://localhost:${config.PORT}/api/locations`);
      console.log(`🚨 SOS endpoints: http://localhost:${config.PORT}/api/alerts`);
      console.log('✅ Server ready for connections!\n');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();

module.exports = { app, server, io };