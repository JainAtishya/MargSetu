const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
    console.log('🌐 =====================================');
    console.log(`📞 ${new Date().toISOString()} - ${req.method} ${req.path}`);
    console.log(`📱 From IP: ${req.ip}`);
    console.log(`📋 Headers: ${JSON.stringify(req.headers, null, 2)}`);
    console.log(`🔍 Query: ${JSON.stringify(req.query)}`);
    console.log('🌐 =====================================');
    next();
});

// Mock data - same as we used in database seeding
const mockStations = [
    {
        "id": "station001",
        "name": "Mumbai Central",
        "latitude": 19.076,
        "longitude": 72.8777
    },
    {
        "id": "station002", 
        "name": "Pune Railway Station",
        "latitude": 18.529,
        "longitude": 73.8740
    },
    {
        "id": "station003",
        "name": "Nashik Road",
        "latitude": 19.9975,
        "longitude": 73.7898
    },
    {
        "id": "station004",
        "name": "Aurangabad",
        "latitude": 19.8762,
        "longitude": 75.3433
    }
];

const mockBuses = [
    {
        "id": "bus001",
        "number": "MH12GH3456",
        "route": "Mumbai Central - Pune Express",
        "driverName": "Prakash Desai",
        "driverPhone": "+91 9876543210",
        "currentLocation": "Lonavala",
        "status": "Online",
        "seatsAvailable": 25,
        "totalSeats": 40,
        "fare": 300,
        "estimatedArrival": "15 mins",
        "latitude": 18.7537,
        "longitude": 73.4135
    },
    {
        "id": "bus002", 
        "number": "MH14AB7890",
        "route": "Mumbai Central - Pune Express",
        "driverName": "Suresh Patil",
        "driverPhone": "+91 9876543211",
        "currentLocation": "Pune",
        "status": "Online",
        "seatsAvailable": 12,
        "totalSeats": 40,
        "fare": 300,
        "estimatedArrival": "Arrived",
        "latitude": 18.529,
        "longitude": 73.8740
    },
    {
        "id": "bus003",
        "number": "MH12CD1234", 
        "route": "Mumbai Central - Nashik Road",
        "driverName": "Ramesh Sharma",
        "driverPhone": "+91 9876543212",
        "currentLocation": "Thane",
        "status": "Online",
        "seatsAvailable": 30,
        "totalSeats": 45,
        "fare": 400,
        "estimatedArrival": "45 mins",
        "latitude": 19.2183,
        "longitude": 72.9781
    }
];

// API Endpoints
app.get('/api/android/stations', (req, res) => {
    console.log('✅ Stations API called successfully!');
    res.json({
        success: true,
        stations: mockStations
    });
});

app.get('/api/android/buses/search', (req, res) => {
    const { from, to } = req.query;
    console.log(`🚌 Bus search API called: ${from} → ${to}`);
    
    // Simple search logic
    const filteredBuses = mockBuses.filter(bus => {
        const routeLower = bus.route.toLowerCase();
        const fromLower = (from || '').toLowerCase();
        const toLower = (to || '').toLowerCase();
        
        return routeLower.includes(fromLower) || routeLower.includes(toLower) ||
               fromLower.includes('mumbai') || fromLower.includes('pune') ||
               toLower.includes('mumbai') || toLower.includes('pune');
    });
    
    console.log(`📊 Found ${filteredBuses.length} buses`);
    
    res.json({
        success: true,
        buses: filteredBuses,
        message: filteredBuses.length > 0 ? 'Buses found' : 'No buses available for this route'
    });
});

app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'Mock server running for API testing' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log('🚀 ================================');
    console.log('🚀 MOCK API SERVER STARTED');
    console.log('🚀 ================================');
    console.log(`🌐 Server running on ALL interfaces port ${PORT}`);
    console.log('📱 Test URLs for your phone:');
    console.log(`   📍 Stations: http://10.148.173.6:${PORT}/api/android/stations`);
    console.log(`   🚌 Buses: http://10.148.173.6:${PORT}/api/android/buses/search?from=Mumbai&to=Pune`);
    console.log('🌐 Also available on:');
    console.log(`   � Localhost: http://localhost:${PORT}/api/android/stations`);
    console.log(`   📍 127.0.0.1: http://127.0.0.1:${PORT}/api/android/stations`);
    console.log('�🚀 SAME IP AS DRIVER APP: 10.148.173.6');
    console.log('🚀 ================================');
});

// Keep server alive
process.on('SIGINT', () => {
    console.log('\n🛑 Graceful shutdown...');
    process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('💥 Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
});