const axios = require('axios');

async function testLocationUpdate() {
    try {
        console.log('🧪 Testing location update API...');

        // 1. Login to get token
        console.log('1️⃣ Logging in...');
        const loginRes = await axios.post('http://localhost:5000/api/auth/driver-login', {
            driverId: 'DRV1001',
            password: 'pass1234',
            busId: 'BUS001'
        });

        const token = loginRes.data.token;
        console.log('✅ Login successful');

        // 2. Send location update
        console.log('2️⃣ Sending location update...');
        const locationPayload = {
            busId: 'BUS001',
            latitude: 37.4219983,
            longitude: -122.084,
            speed: 0.0,
            heading: 0.0,
            accuracy: 5.0
            // Remove tripId field entirely instead of setting to null
        };

        const updateRes = await axios.post('http://localhost:5000/api/locations/update', locationPayload, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('✅ Location update successful!');
        console.log('📍 Response:', updateRes.data);
        console.log('');
        console.log('🎉 GPS LOCATION UPDATES NOW WORKING!');
        console.log('   Install your new APK and test "Start Journey"');

    } catch (error) {
        console.error('❌ Error:', error.response?.status, error.response?.data || error.message);
    }
}

testLocationUpdate();