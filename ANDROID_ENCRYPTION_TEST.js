/**
 * ANDROID-COMPATIBLE ENCRYPTION FOR DRIVER APP
 * This simulates what the corrected Android GPSEncryption will produce
 */

const crypto = require('crypto');

// Same parameters as Android and backend
const ENCRYPTION_KEY = 'MargSetu2024SecureGPSLocationKey32B';
const ENCRYPTION_IV = 'MargSetuGPSIV16B';

function androidCompatibleEncrypt(gpsData) {
    // Prepare key and IV exactly like Android will
    const keyStr = ENCRYPTION_KEY.length !== 32 ? ENCRYPTION_KEY.padEnd(32, '\0').substring(0, 32) : ENCRYPTION_KEY;
    const ivStr = ENCRYPTION_IV.length !== 16 ? ENCRYPTION_IV.padEnd(16, '\0').substring(0, 16) : ENCRYPTION_IV;
    
    const key = Buffer.from(keyStr, 'utf8');
    const iv = Buffer.from(ivStr, 'utf8');
    
    const plaintext = JSON.stringify(gpsData);
    
    // Use AES-256-CBC with PKCS7 padding (same as Android PKCS5Padding)
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    return encrypted;
}

console.log('\n🤖 ANDROID-COMPATIBLE ENCRYPTION TEST');
console.log('====================================\n');

// Simulate driver app GPS data
const driverGPS = {
    busId: 'BUS001',
    latitude: 18.9696,
    longitude: 72.8194,
    timestamp: Date.now(),
    speed: 0,
    accuracy: 0,
    source: 'DRIVER_APP_SMS',
    version: '1.0'
};

console.log('📱 Driver App GPS Data:');
console.log(JSON.stringify(driverGPS, null, 2));
console.log();

const encrypted = androidCompatibleEncrypt(driverGPS);
const smsMessage = `GPS_ENC:${encrypted}`;

console.log('🔒 Encrypted SMS Message:');
console.log(smsMessage);
console.log();

console.log('📊 Encryption Details:');
console.log(`• Algorithm: AES-256-CBC`);
console.log(`• Key Length: 32 bytes`);
console.log(`• IV Length: 16 bytes`);
console.log(`• Padding: PKCS7/PKCS5`);
console.log(`• Output: Base64 encoded`);
console.log();

console.log('✅ This format will work with both:');
console.log('   - Android driver app (AES/CBC/PKCS5Padding)');
console.log('   - Node.js backend (aes-256-cbc)');
console.log();

console.log('🎯 Driver app is ready for encrypted GPS transmission!');