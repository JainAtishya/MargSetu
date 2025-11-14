const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Enhanced request logging
app.use((req, res, next) => {
    console.log('🌐 =====================================');
    console.log(`📞 ${new Date().toISOString()}`);
    console.log(`📞 ${req.method} ${req.originalUrl}`);
    console.log(`📱 From IP: ${req.ip}`);
    console.log(`🔍 Query: ${JSON.stringify(req.query)}`);
    console.log(`📋 User-Agent: ${req.get('User-Agent')}`);
    console.log('🌐 =====================================');
    next();
});

// Hardcoded bus data that matches the database structure
const hardcodedBuses = [
    {
        "id": "68cc0c21da283d4c1000a108",
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
        "departureTime": "02:00 PM",
        "arrivalTime": "05:30 PM",
        "occupancy": "Medium",
        "latitude": 18.7537,
        "longitude": 73.4135
    },
    {
        "id": "68cc0c21da283d4c1000a109",
        "number": "MH14AB7890",
        "route": "Mumbai Central - Pune Express",
        "driverName": "Suresh Patil",
        "driverPhone": "+91 9876543211",
        "currentLocation": "Pune Railway Station",
        "status": "Online",
        "seatsAvailable": 12,
        "totalSeats": 40,
        "fare": 300,
        "estimatedArrival": "Arrived",
        "departureTime": "04:00 PM",
        "arrivalTime": "05:30 PM",
        "occupancy": "Low",
        "latitude": 18.529,
        "longitude": 73.8740
    },
    {
        "id": "68cc0c21da283d4c1000a110",
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
        "departureTime": "01:30 PM",
        "arrivalTime": "03:45 PM",
        "occupancy": "High",
        "latitude": 19.2183,
        "longitude": 72.9781
    },
    {
        "id": "68cc0c21da283d4c1000a111",
        "number": "MH20EF5678",
        "route": "Pune - Aurangabad Express",
        "driverName": "Vijay Kumar",
        "driverPhone": "+91 9876543213",
        "currentLocation": "Ahmednagar",
        "status": "Offline",
        "seatsAvailable": 0,
        "totalSeats": 42,
        "fare": 350,
        "estimatedArrival": "Maintenance",
        "departureTime": "02:00 PM",
        "arrivalTime": "03:30 PM",
        "occupancy": "High",
        "latitude": 19.0948,
        "longitude": 74.7480
    }
];

const hardcodedStations = [
    {
        "id": "68cc0c21da283d4c1000a104",
        "name": "Mumbai Central",
        "latitude": 19.076,
        "longitude": 72.8777
    },
    {
        "id": "68cc0c21da283d4c1000a105",
        "name": "Pune Railway Station",
        "latitude": 18.529,
        "longitude": 73.8740
    },
    {
        "id": "68cc0c21da283d4c1000a106",
        "name": "Nashik Road",
        "latitude": 19.9975,
        "longitude": 73.7898
    },
    {
        "id": "68cc0c21da283d4c1000a107",
        "name": "Aurangabad",
        "latitude": 19.8762,
        "longitude": 75.3433
    }
];

// API Endpoints
app.get('/api/android/stations', (req, res) => {
    console.log('✅ STATIONS API CALLED - RETURNING HARDCODED DATA');
    res.json({
        success: true,
        stations: hardcodedStations,
        data: hardcodedStations
    });
});

app.get('/api/android/buses/search', (req, res) => {
    const { from, to } = req.query;
    console.log(`🚌 BUS SEARCH API CALLED: "${from}" → "${to}"`);
    
    // Filter buses based on route matching
    let filteredBuses = hardcodedBuses.filter(bus => {
        const routeLower = bus.route.toLowerCase();
        const fromLower = (from || '').toLowerCase();
        const toLower = (to || '').toLowerCase();
        
        // Check if route contains the search terms
        const matchesFrom = routeLower.includes(fromLower) || 
                           routeLower.includes('mumbai') && fromLower.includes('mumbai') ||
                           routeLower.includes('pune') && fromLower.includes('pune');
        
        const matchesTo = routeLower.includes(toLower) || 
                         routeLower.includes('mumbai') && toLower.includes('mumbai') ||
                         routeLower.includes('pune') && toLower.includes('pune');
        
        return matchesFrom || matchesTo;
    });
    
    // If no specific matches, return Mumbai-Pune buses for any search
    if (filteredBuses.length === 0) {
        filteredBuses = hardcodedBuses.filter(bus => 
            bus.route.includes('Mumbai') && bus.route.includes('Pune')
        );
    }
    
    console.log(`📊 RETURNING ${filteredBuses.length} BUSES`);
    filteredBuses.forEach(bus => {
        console.log(`   🚌 ${bus.number} - ${bus.route} (${bus.driverName})`);
    });
    
    // Provide fields compatible with multiple client schemas
    const mappedForClient = filteredBuses.map(b => ({
        ...b,
        // duplicate fields under alternative names the app may parse
        busNumber: b.number,
        routeName: b.route,
        currentLatitude: b.latitude,
        currentLongitude: b.longitude
    }));

    res.json({
        success: true,
        // Primary array used by current app code
        buses: mappedForClient,
        // Also provide a generic 'data' field for older parsers
        data: mappedForClient,
        message: mappedForClient.length > 0 ? 'Buses found' : 'No buses available for this route'
    });
});

app.get('/health', (req, res) => {
    console.log('💓 HEALTH CHECK CALLED');
    res.json({ 
        status: 'OK', 
        message: 'Working API server running',
        timestamp: new Date().toISOString()
    });
});

// Android friendly ping endpoints under /api/android
app.get('/api/android/ping', (req, res) => {
    res.json({ ok: true, ip: req.ip, ts: Date.now() });
});

app.get('/api/android/health', (req, res) => {
    res.json({ success: true, status: 'OK' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log('🚀 ========================================');
    console.log('🚀 WORKING API SERVER STARTED (NO MONGODB)');
    console.log('🚀 ========================================');
    console.log(`🌐 Server running on ALL interfaces port ${PORT}`);
    console.log('📱 Phone test URLs:');
    console.log(`   📍 Stations: http://10.148.173.6:${PORT}/api/android/stations`);
    console.log(`   🚌 Buses: http://10.148.173.6:${PORT}/api/android/buses/search?from=Mumbai&to=Pune`);
    console.log('🚀 HARDCODED DATA - NO DATABASE ISSUES!');
    console.log('🚀 ========================================');
});

// Handle shutdown gracefully
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down gracefully...');
    process.exit(0);
});

console.log('🎯 SERVER STARTING...');