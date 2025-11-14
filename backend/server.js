const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const axios = require('axios');
const { rateLimit } = require('express-rate-limit');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "*",
    methods: ["GET", "POST"]
  }
});

// Database connection
const connectDB = require('./config/database');
connectDB();

// Middleware
app.use(helmet());
app.use(cors());

// Custom request logger for Android API
app.use('/api/android', (req, res, next) => {
  console.log('\n🤖 === ANDROID API REQUEST ===');
  console.log(`📱 Method: ${req.method}`);
  console.log(`🌐 URL: ${req.originalUrl}`);
  console.log(`📧 Headers: ${JSON.stringify(req.headers, null, 2)}`);
  console.log(`📋 Query: ${JSON.stringify(req.query, null, 2)}`);
  console.log(`📦 Body: ${JSON.stringify(req.body, null, 2)}`);
  try {
    const mongoose = require('mongoose');
    const stateNames = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    console.log(`🍃 DB State: ${stateNames[mongoose.connection.readyState]}`);
  } catch (_) { }
  console.log(`⏰ Time: ${new Date().toISOString()}`);
  console.log('🤖 ========================\n');
  next();
});

// Unified request log for debugging production issues
app.use(morgan(':remote-addr :method :url :status :res[content-length] - :response-time ms'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Focused logger for location APIs to aid Android debugging
app.use('/api/locations', (req, res, next) => {
  try {
    const h = req.headers || {};
    const bodyPreview = typeof req.body === 'object' ? JSON.stringify(req.body).slice(0, 500) : String(req.body).slice(0, 200);
    console.log(`\n📍 [LOC-REQ] ${req.method} ${req.originalUrl}`);
    console.log(`🔐 auth=${h['authorization'] ? 'yes' : 'no'} content-type=${h['content-type'] || ''}`);
    console.log(`📦 body=${bodyPreview}`);
    console.log(`⏰ at=${new Date().toISOString()}\n`);
  } catch (_) { }
  next();
});

// Socket.IO connection
const WebSocketService = require('./services/webSocketService');
const webSocketService = new WebSocketService(io);

// Legacy socket handlers for backward compatibility
io.on('connection', (socket) => {
  console.log('Legacy socket connection for compatibility');

  socket.on('join-bus-room', (busId) => {
    socket.join(`bus-${busId}`);
    console.log(`Client joined legacy room: bus-${busId}`);
  });

  socket.on('join-authority-room', () => {
    socket.join('authority-dashboard');
    console.log('Authority joined dashboard room');
  });

  // Alert-specific socket handlers
  socket.on('join-authority-dashboard', () => {
    socket.join('authority-dashboard');
    console.log('Authority joined dashboard room');
  });

  socket.on('leave-authority-dashboard', () => {
    socket.leave('authority-dashboard');
    console.log('Authority left dashboard room');
  });

  socket.on('join-driver-alerts', (driverId) => {
    socket.join(`driver-${driverId}`);
    console.log(`Driver ${driverId} joined alerts room`);
  });

  socket.on('leave-driver-alerts', (driverId) => {
    socket.leave(`driver-${driverId}`);
    console.log(`Driver ${driverId} left alerts room`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected from legacy handler');
  });
});

// Make io and services accessible to routes and modules
app.set('io', io);
app.set('webSocketService', webSocketService);
module.exports.io = io;
module.exports.webSocketService = webSocketService;

// Start Bus Location Simulation (for prototype)
const busLocationService = require('./services/busLocationService');
busLocationService.startSimulation(30); // Update every 30 seconds

// Start Alert Scheduler (if exists)
let alertScheduler = null;
try {
  alertScheduler = require('./services/alertScheduler');
  alertScheduler.start();
  console.log('✅ Alert Scheduler started successfully');
} catch (error) {
  console.log('ℹ️ Alert scheduler not available, continuing without it...');
}

// Routes
app.use('/api/authority', require('./routes/authority'));
app.use('/api/driver', require('./routes/driver'));
app.use('/api/stations', require('./routes/stations'));
// Provide auth and locations routes for driver app compatibility
app.use('/api/auth', require('./routes/auth'));
app.use('/api/locations', require('./routes/locations'));
// SMS routes (Twilio/webhook + tools)
app.use('/api/sms', require('./routes/sms'));
app.use('/api/smssync', require('./routes/smsSync'));
app.use('/api/buses', require('./routes/simpleBuses'));
app.use('/api/routes', require('./routes/simpleRoutes'));
app.use('/api/dashboard', require('./routes/dashboard'));

// Android App API Routes (optimized for Kotlin app)
app.use('/api/android', require('./routes/androidApi'));

// Simple raster tile proxy to avoid external host blocks on devices
app.get('/tiles/osm/:z/:x/:y.png', async (req, res) => {
  const { z, x, y } = req.params;
  const urls = [
    `https://a.tile.openstreetmap.org/${z}/${x}/${y}.png`,
    `https://b.tile.openstreetmap.org/${z}/${x}/${y}.png`,
    `https://c.tile.openstreetmap.org/${z}/${x}/${y}.png`
  ];
  for (const url of urls) {
    try {
      const r = await axios.get(url, { responseType: 'arraybuffer', timeout: 5000 });
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.status(200).send(Buffer.from(r.data));
    } catch (e) {
      // try next
    }
  }
  return res.status(502).send('Tile fetch failed');
});

app.get('/tiles/carto/:z/:x/:y.png', async (req, res) => {
  const { z, x, y } = req.params;
  const urls = [
    `https://a.basemaps.cartocdn.com/light_all/${z}/${x}/${y}.png`,
    `https://b.basemaps.cartocdn.com/light_all/${z}/${x}/${y}.png`,
    `https://c.basemaps.cartocdn.com/light_all/${z}/${x}/${y}.png`
  ];
  for (const url of urls) {
    try {
      const r = await axios.get(url, { responseType: 'arraybuffer', timeout: 5000 });
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.status(200).send(Buffer.from(r.data));
    } catch (e) {
      // try next
    }
  }
  return res.status(502).send('Tile fetch failed');
});

// Health check endpoint
app.get('/health', (req, res) => {
  const stateNames = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  const mongoose = require('mongoose');
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      database: stateNames[mongoose.connection.readyState] || 'unknown',
      alertScheduler: alertScheduler && typeof alertScheduler.getStatus === 'function' && alertScheduler.getStatus().isRunning ? 'running' : 'stopped'
    }
  });
});

// Compatibility alias for driver app: /api/emergency/sos -> alerts SOS
try {
  const { authenticateDriver } = require('./middleware/auth');
  const { createSOSAlert } = require('./controllers/alertController');
  app.post('/api/emergency/sos', authenticateDriver, createSOSAlert);
} catch (e) {
  console.warn('Emergency SOS alias not registered:', e.message);
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'production' ? {} : err.stack
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚍 MargSetu Backend Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);

  // Show alert scheduler status if available
  if (alertScheduler) {
    try {
      console.log(`🔔 Alert Scheduler: ${alertScheduler.getStatus().isRunning ? 'Running' : 'Stopped'}`);
    } catch (error) {
      console.log('🔔 Alert Scheduler: Status unavailable');
    }
  } else {
    console.log('🔔 Alert Scheduler: Not loaded');
  }

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    alertScheduler.stop();
    server.close(() => {
      console.log('Process terminated');
    });
  });

  process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    alertScheduler.stop();
    server.close(() => {
      console.log('Process terminated');
    });
  });
});