const crypto = require('crypto');

// Test the current backend with properly formatted encrypted GPS data
async function testCurrentEncryption() {
    console.log('🧪 Testing current encryption with backend...\n');
    
    // Use same encryption parameters as Android app
    const encryptionKey = 'MargSetuSecureTransportKey2024';
    const encryptionIV = 'MargSetuVector16';
    
    // Create GPS data that matches Android format
    const gpsData = {
        latitude: 18.9696,
        longitude: 72.8194,
        busId: 'MH02AB1234',
        timestamp: Date.now()
    };
    
    console.log('📍 Original GPS data:', gpsData);
    
    // Encrypt using the EXACT same method as backend expects
    const keyStr = encryptionKey.padEnd(32, '0').substring(0, 32);
    const ivStr = encryptionIV.padEnd(16, '0').substring(0, 16);
    
    const key = Buffer.from(keyStr, 'utf8');
    const iv = Buffer.from(ivStr, 'utf8');
    
    console.log('🔧 Key preparation:');
    console.log('  Key string:', JSON.stringify(keyStr));
    console.log('  IV string:', JSON.stringify(ivStr));
    console.log('  Key length:', key.length);
    console.log('  IV length:', iv.length);
    
    try {
        // Encrypt the GPS data
        const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
        let encrypted = cipher.update(JSON.stringify(gpsData), 'utf8', 'base64');
        encrypted += cipher.final('base64');
        
        console.log('\n🔐 Encrypted GPS data:');
        console.log('  Encrypted length:', encrypted.length);
        console.log('  Encrypted data:', encrypted);
        
        // Create SMS message in the format that Android sends
        const smsMessage = `GPS_ENC:${encrypted}`;
        console.log('\n📱 SMS message format:', smsMessage);
        
        // Test backend webhook
        console.log('\n🚀 Testing backend webhook...');
        
        const webhookUrl = 'https://vercel-backend-vert-psi.vercel.app/api/sms/webhook';
        
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-gateway-api-key': 'demo'
            },
            body: JSON.stringify({
                type: 'sms_raw',
                sender: '+917876935991',
                message: smsMessage,
                timestamp: Date.now()
            })
        });
        
        const result = await response.text();
        console.log('\n📥 Backend response:', result);
        
        if (response.ok) {
            console.log('✅ SUCCESS: Backend processed encrypted GPS data!');
        } else {
            console.log('❌ FAILED: Backend returned error');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Run the test
testCurrentEncryption().catch(console.error);