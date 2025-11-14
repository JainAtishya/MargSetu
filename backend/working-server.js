// 🚀 Working Server for MargSetu - Easy Testing
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

console.log('🚀 Starting MargSetu Working Server...');

// Middleware
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Enhanced body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Debug middleware to log requests
app.use((req, res, next) => {
    console.log(`📨 ${req.method} ${req.url}`);
    console.log('📦 Headers:', req.headers);
    if (req.body && Object.keys(req.body).length > 0) {
        console.log('📄 Body:', req.body);
    }
    next();
});

// Basic health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'MargSetu Server is running!',
        timestamp: new Date().toISOString(),
        port: PORT
    });
});

// Driver login endpoint
app.post('/api/auth/driver-login', async (req, res) => {
    try {
        console.log('🔐 Login request received');
        console.log('📦 Request body:', req.body);
        console.log('📄 Content-Type:', req.headers['content-type']);
        
        // Check if body exists
        if (!req.body || Object.keys(req.body).length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Request body is empty or invalid',
                received: req.body
            });
        }
        
        const { driverId, password, busId } = req.body;
        
        console.log(`🔐 Login attempt: Driver ${driverId} with Bus ${busId}`);
        
        // Simple validation for testing
        if (driverId === 'DRV0001' && password === 'driver123' && busId === 'BUS001') {
            res.json({
                success: true,
                message: 'Login successful',
                driver: {
                    driverId: 'DRV0001',
                    name: 'Rajesh Kumar',
                    busId: 'BUS001'
                },
                token: 'sample-jwt-token-for-testing'
            });
        } else {
            res.status(401).json({
                success: false,
                error: 'Invalid credentials or bus assignment'
            });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error during login'
        });
    }
});

// GPS location update endpoint
app.post('/api/locations/update', (req, res) => {
    try {
        console.log('📍 GPS update request received');
        console.log('📦 Request body:', req.body);
        
        // Check if body exists
        if (!req.body || Object.keys(req.body).length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Request body is empty or invalid',
                received: req.body
            });
        }
        
        const { driverId, latitude, longitude, timestamp } = req.body;
        
        console.log(`📍 GPS Update: Driver ${driverId} at ${latitude}, ${longitude}`);
        
        res.json({
            success: true,
            message: 'Location updated successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('GPS update error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update location'
        });
    }
});

// Test endpoints for Android
app.get('/api/test/android', (req, res) => {
    res.json({
        message: 'Android connection test successful!',
        features: [
            'Enhanced login with bus validation',
            'GPS location tracking', 
            'Real-time updates every 10 seconds',
            'JWT authentication'
        ],
        status: 'ready'
    });
});

// Start server
async function startServer() {
    try {
        // Try to connect to MongoDB (optional for basic testing)
        if (process.env.MONGODB_URI) {
            console.log('🍃 Connecting to MongoDB...');
            await mongoose.connect(process.env.MONGODB_URI);
            console.log('✅ MongoDB connected successfully');
        } else {
            console.log('⚠️  MongoDB URI not found - running without database');
        }
        
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`\n🎉 MargSetu Server Started Successfully!`);
            console.log(`📍 Server running on: http://localhost:${PORT}`);
            console.log(`🌐 Network access: http://0.0.0.0:${PORT}`);
            console.log(`\n📱 Test endpoints:`);
            console.log(`   Health: GET http://localhost:${PORT}/health`);
            console.log(`   Login: POST http://localhost:${PORT}/api/auth/driver-login`);
            console.log(`   GPS: POST http://localhost:${PORT}/api/locations/update`);
            console.log(`   Android Test: GET http://localhost:${PORT}/api/test/android`);
            console.log(`\n✅ Your driver app can now connect!`);
        });
        
    } catch (error) {
        console.error('❌ Server startup failed:', error.message);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down server...');
    if (mongoose.connection.readyState === 1) {
        await mongoose.connection.close();
        console.log('🔌 Database connection closed');
    }
    process.exit(0);
});

startServer();