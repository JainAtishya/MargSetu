const mongoose = require('mongoose');

let reconnectTimer = null;
const RECONNECT_BASE_MS = 2000;
const RECONNECT_MAX_MS = 30000;
let reconnectAttempts = 0;

function scheduleReconnect() {
  const delay = Math.min(RECONNECT_BASE_MS * Math.pow(2, reconnectAttempts), RECONNECT_MAX_MS);
  reconnectAttempts++;
  if (reconnectTimer) clearTimeout(reconnectTimer);
  console.warn(`⚠️  Scheduling MongoDB reconnect in ${delay}ms (attempt ${reconnectAttempts})`);
  reconnectTimer = setTimeout(connectDB, delay);
}

async function connectDB() {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      console.error('❌ MONGODB_URI not set in environment');
      return;
    }

    mongoose.set('strictQuery', false);

    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 20000,
      family: 4,
      maxPoolSize: 10,
      minPoolSize: 1,
      heartbeatFrequencyMS: 10000
    });

    reconnectAttempts = 0; // reset backoff on success
    console.log(`🍃 MongoDB Connected: ${conn.connection.host}`);

    const stateNames = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    console.log(`🍃 Mongoose state: ${stateNames[mongoose.connection.readyState]}`);

    // Event listeners (idempotent)
    mongoose.connection.removeAllListeners('error');
    mongoose.connection.removeAllListeners('disconnected');
    mongoose.connection.removeAllListeners('connected');
    mongoose.connection.removeAllListeners('reconnected');

    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('🔌 MongoDB disconnected');
      scheduleReconnect();
    });

    mongoose.connection.on('connected', () => {
      console.log('✅ MongoDB connected');
    });

    // Periodic ping for visibility
    setInterval(async () => {
      try {
        if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
          await mongoose.connection.db.admin().ping();
          // console.log('🍃 MongoDB ping ok'); // keep quiet to avoid spam
        }
      } catch (e) {
        console.warn('⚠️  MongoDB ping failed:', e.message);
      }
    }, 30000);

    // Graceful shutdown
    process.on('SIGINT', async () => {
      try {
        await mongoose.connection.close();
        console.log('🛑 MongoDB connection closed.');
      } finally {
        process.exit(0);
      }
    });

  } catch (error) {
    console.error('❌ Initial database connection failed:', error.message);
    scheduleReconnect();
  }
}

module.exports = connectDB;