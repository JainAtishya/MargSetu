// Quick network test for MargSetu app debugging
const axios = require('axios');

async function testConnectivity() {
    console.log('🧪 Testing MargSetu Backend Connectivity...\n');
    
    // Test 1: Localhost
    try {
        console.log('1️⃣ Testing localhost:5000/health...');
        const response = await axios.get('http://localhost:5000/health', { timeout: 5000 });
        console.log('✅ Localhost works:', response.data);
    } catch (error) {
        console.log('❌ Localhost failed:', error.message);
    }
    
    // Test 2: WiFi IP
    try {
        console.log('\n2️⃣ Testing WiFi IP (10.50.4.235:5000/health)...');
        const response = await axios.get('http://10.50.4.235:5000/health', { timeout: 5000 });
        console.log('✅ WiFi IP works:', response.data);
    } catch (error) {
        console.log('❌ WiFi IP failed:', error.message);
    }
    
    // Test 3: USB Tethering IP
    try {
        console.log('\n3️⃣ Testing current IP (172.20.10.11:5000/health)...');
        const response = await axios.get('http://172.20.10.11:5000/health', { timeout: 5000 });
        console.log('✅ USB tethering works:', response.data);
    } catch (error) {
        console.log('❌ USB tethering failed:', error.message);
    }
    
    // Test 4: Login API
    try {
        console.log('\n4️⃣ Testing login API...');
        const loginData = {
            driverId: 'DRV0001',
            password: 'driver123',
            busId: 'BUS001'
        };
        const response = await axios.post('http://localhost:5000/api/auth/driver-login', loginData, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 5000
        });
        console.log('✅ Login API works:', response.data);
    } catch (error) {
        console.log('❌ Login API failed:', error.response?.data || error.message);
    }
    
    console.log('\n🔍 Network Analysis Complete!');
}

testConnectivity();