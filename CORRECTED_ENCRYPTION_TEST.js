/**
 * CORRECTED GPS ENCRYPTION TEST - Node.js Compatible
 * This creates encryption that matches exactly what the backend expects
 */

const crypto = require('crypto');

// Exact same parameters as backend
const ENCRYPTION_KEY = 'MargSetu2024SecureGPSLocationKey32B';
const ENCRYPTION_IV = 'MargSetuGPSIV16B';

// Ensure exact 32 bytes for key and 16 bytes for IV (same as backend logic)
function prepareKey(key) {
    if (key.length !== 32) {
        return key.padEnd(32, '0').substring(0, 32);
    }
    return key;
}

function prepareIV(iv) {
    if (iv.length !== 16) {
        return iv.padEnd(16, '0').substring(0, 16);
    }
    return iv;
}

function encryptGPSData(gpsData) {
    const key = Buffer.from(prepareKey(ENCRYPTION_KEY), 'utf8');
    const iv = Buffer.from(prepareIV(ENCRYPTION_IV), 'utf8');
    
    console.log('Key length:', key.length);
    console.log('IV length:', iv.length);
    console.log('Key (hex):', key.toString('hex'));
    console.log('IV (hex):', iv.toString('hex'));
    
    const plaintext = JSON.stringify(gpsData);
    console.log('Plaintext:', plaintext);
    console.log('Plaintext length:', plaintext.length);
    
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    console.log('Encrypted:', encrypted);
    console.log('Encrypted length:', encrypted.length);
    
    // Verify it can be decrypted
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    console.log('Verification decrypt:', decrypted);
    
    return encrypted;
}

console.log('\n🔧 CORRECTED GPS ENCRYPTION TEST');
console.log('=================================\n');

// Test GPS data
const gpsData = {
    busId: 'BUS001',
    latitude: 18.9696,
    longitude: 72.8194,
    timestamp: Date.now(),
    speed: 0.0,
    accuracy: 0,
    source: 'DRIVER_APP_SMS',
    version: '1.0'
};

console.log('📍 Original GPS Data:');
console.log(JSON.stringify(gpsData, null, 2));
console.log();

const encrypted = encryptGPSData(gpsData);
const smsMessage = `GPS_ENC:${encrypted}`;

console.log();
console.log('📱 SMS Message Format:');
console.log(smsMessage);
console.log();
console.log('🎯 This should work with the backend!');