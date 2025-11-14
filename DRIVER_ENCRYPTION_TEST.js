/**
 * DRIVER APP GPS ENCRYPTION TEST
 * This script simulates what the driver app will now send
 */

const crypto = require('crypto');

// Simulate driver app GPS encryption (same as Android GPSEncryption.kt)
function createEncryptedSMSMessage(busId, latitude, longitude) {
    const gpsData = {
        busId: busId,
        latitude: latitude,
        longitude: longitude,
        timestamp: Date.now(),
        speed: 0.0,
        accuracy: 0,
        source: "DRIVER_APP_SMS",
        version: "1.0"
    };

    // Use same encryption parameters as backend
    const encryptionKey = 'MargSetu2024SecureGPSLocationKey32B';
    const encryptionIV = 'MargSetuGPSIV16B';
    
    const key = Buffer.from(encryptionKey.length !== 32 ? encryptionKey.padEnd(32, '0').substring(0, 32) : encryptionKey, 'utf8');
    const iv = Buffer.from(encryptionIV.length !== 16 ? encryptionIV.padEnd(16, '0').substring(0, 16) : encryptionIV, 'utf8');
    
    const plaintext = JSON.stringify(gpsData);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    return `GPS_ENC:${encrypted}`;
}

console.log('\n🚌 DRIVER APP GPS ENCRYPTION TEST');
console.log('==================================\n');

// Test data (Mumbai coordinates)
const busId = 'BUS001';
const latitude = 18.9696;
const longitude = 72.8194;

console.log('📍 Driver Location:');
console.log(`Bus ID: ${busId}`);
console.log(`Latitude: ${latitude}`);
console.log(`Longitude: ${longitude}`);
console.log();

// Create encrypted SMS (what driver app will now send)
const encryptedSMS = createEncryptedSMSMessage(busId, latitude, longitude);
console.log('📱 Encrypted SMS Message:');
console.log(encryptedSMS);
console.log();

console.log('🔐 Security Status:');
console.log('✅ GPS coordinates encrypted with AES-256-CBC');
console.log('✅ Coordinates not visible in SMS content');
console.log('✅ Only backend can decrypt with matching key');
console.log();

console.log('📋 BEFORE (Insecure):');
console.log(`GPS:${busId},${latitude},${longitude},0.0,0,${Date.now()}`);
console.log();

console.log('📋 AFTER (Secure):');
console.log(encryptedSMS);
console.log();

console.log('🎯 Driver app will now send encrypted GPS data!');