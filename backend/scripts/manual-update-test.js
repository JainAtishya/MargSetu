// Quick manual test for /api/locations/update
// Usage: node scripts/manual-update-test.js [BASE_URL]

const axios = require('axios');

const BASE = process.argv[2] || 'http://localhost:5000/api';

async function main() {
    try {
        console.log('BASE:', BASE);
        // 1) Login
        const loginRes = await axios.post(`${BASE}/auth/driver-login`, {
            driverId: 'DRV1001',
            password: 'pass1234',
            busId: 'BUS001'
        });
        const token = loginRes.data.token;
        if (!token) throw new Error('No token in login response');
        console.log('Login OK');

        const headers = { Authorization: `Bearer ${token}` };

        // 2) Get or create tripId
        const tripRes = await axios.post(`${BASE}/locations/trip-id`, { busId: 'BUS001' }, { headers });
        const tripId = tripRes.data?.data?.tripId || tripRes.data?.tripId;
        console.log('TripId:', tripId);

        // 3) Post location update
        const payload = {
            busId: 'BUS001',
            latitude: 28.6139,
            longitude: 77.2090,
            speed: 10,
            heading: 90,
            accuracy: 5,
            tripId,
            timestamp: new Date().toISOString(),
            status: 'in_transit'
        };
        const upd = await axios.post(`${BASE}/locations/update`, payload, { headers });
        console.log('Update response:', upd.data);
    } catch (err) {
        if (err.response) {
            console.error('HTTP Error:', err.response.status, err.response.data);
        } else {
            console.error('Error:', err.message);
        }
        process.exit(1);
    }
}

main();
