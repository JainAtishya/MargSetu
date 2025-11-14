/**
 * UNIVERSAL GPS ENCRYPTION TEST
 * This creates Android-compatible encryption that the backend can decrypt
 */

const crypto = require('crypto');

// Use exact same logic as backend for key/IV preparation
class UniversalGPSEncryption {
    constructor() {
        this.encryptionKey = 'MargSetu2024SecureGPSLocationKey32B';
        this.encryptionIV = 'MargSetuGPSIV16B';
    }
    
    // Method 1: Standard backend approach
    encryptMethod1(gpsData) {
        // Ensure key is exactly 32 bytes
        const keyStr = this.encryptionKey.length !== 32 ? this.encryptionKey.padEnd(32, '0').substring(0, 32) : this.encryptionKey;
        const ivStr = this.encryptionIV.length !== 16 ? this.encryptionIV.padEnd(16, '0').substring(0, 16) : this.encryptionIV;
        
        const key = Buffer.from(keyStr, 'utf8');
        const iv = Buffer.from(ivStr, 'utf8');
        
        const plaintext = JSON.stringify(gpsData);
        const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
        let encrypted = cipher.update(plaintext, 'utf8', 'base64');
        encrypted += cipher.final('base64');
        
        return encrypted;
    }
    
    // Method 2: Android-compatible (with null padding)
    encryptMethod2(gpsData) {
        const keyStr = this.encryptionKey.length !== 32 ? this.encryptionKey.padEnd(32, '\0').substring(0, 32) : this.encryptionKey;
        const ivStr = this.encryptionIV.length !== 16 ? this.encryptionIV.padEnd(16, '\0').substring(0, 16) : this.encryptionIV;
        
        const key = Buffer.from(keyStr, 'utf8');
        const iv = Buffer.from(ivStr, 'utf8');
        
        const plaintext = JSON.stringify(gpsData);
        const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
        let encrypted = cipher.update(plaintext, 'utf8', 'base64');
        encrypted += cipher.final('base64');
        
        return encrypted;
    }
    
    // Method 3: Test decryption
    testDecrypt(encryptedData) {
        console.log('\n🧪 Testing Decryption Methods:');
        
        // Test with standard approach
        try {
            const keyStr = this.encryptionKey.length !== 32 ? this.encryptionKey.padEnd(32, '0').substring(0, 32) : this.encryptionKey;
            const ivStr = this.encryptionIV.length !== 16 ? this.encryptionIV.padEnd(16, '0').substring(0, 16) : this.encryptionIV;
            const key = Buffer.from(keyStr, 'utf8');
            const iv = Buffer.from(ivStr, 'utf8');
            const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
            let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
            decrypted += decipher.final('utf8');
            const parsed = JSON.parse(decrypted);
            console.log('✅ Method 1 (standard): SUCCESS');
            return parsed;
        } catch (e) {
            console.log('❌ Method 1 (standard):', e.message);
        }
        
        // Test with Android-compatible approach
        try {
            const keyStr = this.encryptionKey.length !== 32 ? this.encryptionKey.padEnd(32, '\0').substring(0, 32) : this.encryptionKey;
            const ivStr = this.encryptionIV.length !== 16 ? this.encryptionIV.padEnd(16, '\0').substring(0, 16) : this.encryptionIV;
            const key = Buffer.from(keyStr, 'utf8');
            const iv = Buffer.from(ivStr, 'utf8');
            const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
            let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
            decrypted += decipher.final('utf8');
            const parsed = JSON.parse(decrypted);
            console.log('✅ Method 2 (Android-compatible): SUCCESS');
            return parsed;
        } catch (e) {
            console.log('❌ Method 2 (Android-compatible):', e.message);
        }
        
        return null;
    }
}

const encryptor = new UniversalGPSEncryption();

console.log('🔄 UNIVERSAL GPS ENCRYPTION TEST');
console.log('=================================\n');

const gpsData = {
    busId: 'BUS001',
    latitude: 18.9696,
    longitude: 72.8194,
    timestamp: Date.now(),
    speed: 0,
    accuracy: 0,
    source: 'DRIVER_APP_SMS',
    version: '1.0'
};

console.log('📍 GPS Data:');
console.log(JSON.stringify(gpsData, null, 2));

// Test Method 1
console.log('\n🔧 Method 1 (Standard Backend):');
const encrypted1 = encryptor.encryptMethod1(gpsData);
console.log('Encrypted:', encrypted1.substring(0, 50) + '...');
const decrypted1 = encryptor.testDecrypt(encrypted1);

// Test Method 2  
console.log('\n🔧 Method 2 (Android Compatible):');
const encrypted2 = encryptor.encryptMethod2(gpsData);
console.log('Encrypted:', encrypted2.substring(0, 50) + '...');
const decrypted2 = encryptor.testDecrypt(encrypted2);

// Output working format
if (decrypted1) {
    console.log('\n✅ WORKING SMS FORMAT (Method 1):');
    console.log(`GPS_ENC:${encrypted1}`);
}

if (decrypted2) {
    console.log('\n✅ WORKING SMS FORMAT (Method 2):');
    console.log(`GPS_ENC:${encrypted2}`);
}

console.log('\n🎯 Use the working format with your Android app!');