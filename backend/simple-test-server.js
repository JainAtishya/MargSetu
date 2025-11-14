// Simple test server for mobile app connection
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 5000;

console.log('🚀 Starting Simple MargSetu Test Server...');

// Middleware
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Debug middleware
app.use((req, res, next) => {
    console.log(`📨 ${req.method} ${req.url}`);
    console.log('📦 Headers:', req.headers);
    if (req.body && Object.keys(req.body).length > 0) {
        console.log('📄 Body:', req.body);
    }
    next();
});

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Simple MargSetu Server is running!',
        timestamp: new Date().toISOString(),
        port: PORT
    });
});

// Simple login endpoint
app.post('/api/auth/driver-login', (req, res) => {
    console.log('🔐 Login request received');
    console.log('📦 Request body:', req.body);
    
    const { driverId, password, busId } = req.body;
    
    if (driverId === 'DRV0001' && password === 'driver123' && busId === 'BUS001') {
        res.json({
            success: true,
            message: 'Login successful',
            driver: {
                driverId: 'DRV0001',
                name: 'Test Driver',
                busId: 'BUS001'
            },
            token: 'test-token-12345'
        });
    } else {
        res.status(401).json({
            success: false,
            error: 'Invalid credentials'
        });
    }
});

// Emergency SOS Alert endpoint
app.post('/api/emergency/sos', (req, res) => {
    console.log('🚨 EMERGENCY SOS ALERT RECEIVED!');
    console.log('📦 SOS Request body:', req.body);
    
    const { driverId, busId, latitude, longitude, timestamp, message } = req.body;
    
    // Log the emergency alert details
    console.log('🆘 EMERGENCY DETAILS:');
    console.log(`   Driver ID: ${driverId}`);
    console.log(`   Bus ID: ${busId}`);
    console.log(`   Location: ${latitude}, ${longitude}`);
    console.log(`   Time: ${timestamp}`);
    console.log(`   Message: ${message || 'Emergency alert'}`);
    
    // Generate unique alert ID
    const alertId = `SOS_${Date.now()}_${driverId}`;
    
    // Simulate alert processing
    console.log(`✅ Emergency alert processed with ID: ${alertId}`);
    
    res.json({
        success: true,
        message: 'Emergency alert received and processed successfully',
        alertId: alertId,
        timestamp: new Date().toISOString()
    });
});

// Location update endpoint
app.post('/api/locations/update', (req, res) => {
    console.log('📍 Location update received');
    console.log('📦 Location data:', req.body);
    
    const { busId, latitude, longitude, speed, heading, accuracy, timestamp, status } = req.body;
    
    res.json({
        success: true,
        message: 'Location updated successfully',
        timestamp: new Date().toISOString()
    });
});

// Start server on all interfaces
app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n✅ Simple Server Running!`);
    console.log(`📍 Localhost: http://localhost:${PORT}`);
    console.log(`🌐 Network: http://0.0.0.0:${PORT}`);
    console.log(`🔗 Current IP: http://172.20.10.11:${PORT}`);
    console.log(`📱 WiFi: http://10.50.4.235:${PORT}`);
    console.log(`\n🧪 Test URLs:`);
    console.log(`   Health: GET http://172.20.10.11:${PORT}/health`);
    console.log(`   Login: POST http://172.20.10.11:${PORT}/api/auth/driver-login`);
    console.log(`   SOS Alert: POST http://172.20.10.11:${PORT}/api/emergency/sos`);
    console.log(`   Location: POST http://172.20.10.11:${PORT}/api/locations/update`);
});

console.log('🎯 Server will stay running - use Ctrl+C to stop');