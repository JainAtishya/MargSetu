/**
 * GPS ENCRYPTION DEMONSTRATION FOR EVALUATORS
 * This script demonstrates AES-256-CBC encryption of GPS data
 * Run: node ENCRYPTION_DEMO.js
 */

const crypto = require('crypto');

// Import our GPS encryption utility with proper key sizing
const gpsEncryption = { 
    // Ensure exactly 32 bytes for AES-256
    encryptionKey: Buffer.from('MargSetu2024SecureGPSLocationKey32B'.padEnd(32, '0').substring(0, 32), 'utf8'),
    // Ensure exactly 16 bytes for IV
    encryptionIV: Buffer.from('MargSetuGPSIV16B'.padEnd(16, '0').substring(0, 16), 'utf8'),
    
    encryptGPS(gpsData) {
        try {
            const plaintext = JSON.stringify(gpsData);
            
            const cipher = crypto.createCipheriv('aes-256-cbc', this.encryptionKey, this.encryptionIV);
            let encrypted = cipher.update(plaintext, 'utf8', 'base64');
            encrypted += cipher.final('base64');
            
            return encrypted;
        } catch (error) {
            console.error('Encryption failed:', error);
            return null;
        }
    },
    
    decryptGPS(encryptedData) {
        try {
            const decipher = crypto.createDecipheriv('aes-256-cbc', this.encryptionKey, this.encryptionIV);
            let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
            decrypted += decipher.final('utf8');
            
            return JSON.parse(decrypted);
        } catch (error) {
            console.error('Decryption failed:', error);
            return null;
        }
    }
};

console.log('\n🔐 MARGSETU GPS ENCRYPTION DEMONSTRATION');
console.log('=========================================\n');

// Sample GPS data
const originalGPS = {
    busId: 'BUS001',
    latitude: 18.9696,
    longitude: 72.8194,
    timestamp: Date.now(),
    speed: 45.5,
    accuracy: 3.2,
    source: 'DRIVER_APP'
};

console.log('📍 ORIGINAL GPS DATA:');
console.log(JSON.stringify(originalGPS, null, 2));
console.log('\n' + '='.repeat(50) + '\n');

// Encrypt the GPS data
console.log('🔒 ENCRYPTING GPS DATA using AES-256-CBC...');
const encrypted = gpsEncryption.encryptGPS(originalGPS);
console.log('✅ ENCRYPTED DATA (Base64):');
console.log(encrypted);
console.log(`📊 Length: ${encrypted.length} characters`);
console.log('\n' + '='.repeat(50) + '\n');

// Show what SMS message looks like
const smsMessage = `GPS_ENC:${encrypted}`;
console.log('📱 SMS MESSAGE FORMAT:');
console.log(smsMessage);
console.log('\n' + '='.repeat(50) + '\n');

// Decrypt the GPS data
console.log('🔓 DECRYPTING GPS DATA...');
const decrypted = gpsEncryption.decryptGPS(encrypted);
console.log('✅ DECRYPTED DATA:');
console.log(JSON.stringify(decrypted, null, 2));
console.log('\n' + '='.repeat(50) + '\n');

// Verify integrity
console.log('🔍 INTEGRITY CHECK:');
const matches = JSON.stringify(originalGPS) === JSON.stringify(decrypted);
console.log(`Original latitude: ${originalGPS.latitude}`);
console.log(`Decrypted latitude: ${decrypted.latitude}`);
console.log(`Original longitude: ${originalGPS.longitude}`);
console.log(`Decrypted longitude: ${decrypted.longitude}`);
console.log(`✅ Data integrity: ${matches ? 'VERIFIED' : 'FAILED'}`);

console.log('\n🛡️  SECURITY FEATURES:');
console.log('• Algorithm: AES-256-CBC (Advanced Encryption Standard)');
console.log('• Key length: 256 bits (32 bytes)');
console.log('• Block size: 128 bits (16 bytes)');
console.log('• Initialization Vector: 16 bytes');
console.log('• Output format: Base64 encoded');
console.log('• Use case: GPS location privacy protection');

console.log('\n🎯 DEMONSTRATION COMPLETE!');