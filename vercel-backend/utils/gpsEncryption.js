const crypto = require('crypto');

/**
 * GPS Location Encryption Utility for Vercel Backend
 * Provides AES-256-CBC encryption/decryption for sensitive GPS coordinates
 */
class GPSEncryption {
    constructor() {
        // Get encryption key and IV from environment or use defaults
        this.encryptionKey = process.env.GPS_ENCRYPTION_KEY || 'MargSetu2024SecureGPSLocationKey32B';
        this.encryptionIV = process.env.GPS_ENCRYPTION_IV || 'MargSetuGPSIV16B';
        this.encryptionEnabled = process.env.GPS_ENCRYPTION_ENABLED !== 'false'; // Default to enabled
        
        // Ensure key is exactly 32 bytes for AES-256
        if (this.encryptionKey.length !== 32) {
            this.encryptionKey = this.encryptionKey.padEnd(32, '0').substring(0, 32);
        }
        
        // Ensure IV is exactly 16 bytes
        if (this.encryptionIV.length !== 16) {
            this.encryptionIV = this.encryptionIV.padEnd(16, '0').substring(0, 16);
        }
        
        console.log(`📡 GPS Encryption: ${this.encryptionEnabled ? 'ENABLED' : 'DISABLED'}`);
    }
    
    /**
     * Encrypt GPS coordinates
     * @param {Object} gpsData - GPS data object {busId, latitude, longitude, timestamp}
     * @returns {String} - Encrypted GPS data as base64 string
     */
    encryptGPS(gpsData) {
        if (!this.encryptionEnabled) {
            return JSON.stringify(gpsData);
        }
        
        try {
            const plaintext = JSON.stringify(gpsData);
            
            // Use modern crypto API with explicit key and IV
            const key = Buffer.from(this.encryptionKey, 'utf8');
            const iv = Buffer.from(this.encryptionIV, 'utf8');
            
            const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
            
            let encrypted = cipher.update(plaintext, 'utf8', 'base64');
            encrypted += cipher.final('base64');
            
            console.log(`🔒 GPS data encrypted for ${gpsData.busId}`);
            return encrypted;
            
        } catch (error) {
            console.error('❌ GPS encryption failed:', error);
            // Fallback to unencrypted if encryption fails
            return JSON.stringify(gpsData);
        }
    }
    
    /**
     * Decrypt GPS coordinates
     * @param {String} encryptedData - Encrypted GPS data as base64 string
     * @returns {Object} - Decrypted GPS data object
     */
    decryptGPS(encryptedData) {
        if (!this.encryptionEnabled) {
            try {
                return JSON.parse(encryptedData);
            } catch (e) {
                // Quiet: treat as unprocessable without error spam
                console.log('ℹ️ Unencrypted GPS parse failed; skipping');
                return null;
            }
        }
        
        try {
            // Ensure key is exactly 32 bytes and IV is exactly 16 bytes
            const keyStr = this.encryptionKey.length !== 32 ? this.encryptionKey.padEnd(32, '0').substring(0, 32) : this.encryptionKey;
            const ivStr = this.encryptionIV.length !== 16 ? this.encryptionIV.padEnd(16, '0').substring(0, 16) : this.encryptionIV;
            
            const key = Buffer.from(keyStr, 'utf8');
            const iv = Buffer.from(ivStr, 'utf8');
            
            // Normalize common SMS/Base64 issues (+ replaced with space, urlsafe variants)
            let normalized = String(encryptedData || '').trim();
            normalized = normalized.replace(/\s/g, '+'); // spaces -> '+'
            normalized = normalized.replace(/-/g, '+').replace(/_/g, '/'); // urlsafe -> std
            // pad '=' if needed
            const padNeeded = (4 - (normalized.length % 4)) % 4;
            if (padNeeded) normalized = normalized + '='.repeat(padNeeded);

            console.log(`🔧 Decryption attempt - length: ${normalized.length}`);
            
            // Check for SMS truncation (108 bytes = missing 4 bytes)
            const encryptedBuffer = Buffer.from(normalized, 'base64');
            const byteLength = encryptedBuffer.length;
            console.log(`🔧 Base64 decoded to ${byteLength} bytes`);
            
            if (byteLength % 16 !== 0) {
                const missingBytes = 16 - (byteLength % 16);
                console.log(`⚠️ SMS truncation detected: missing ${missingBytes} bytes`);
                
                // Method 1: Try padding with null bytes (common truncation recovery)
                try {
                    const paddedBuffer = Buffer.concat([encryptedBuffer, Buffer.alloc(missingBytes, 0)]);
                    const decipher1 = crypto.createDecipheriv('aes-256-cbc', key, iv);
                    decipher1.setAutoPadding(false);
                    
                    let decryptedBuffer = Buffer.concat([
                        decipher1.update(paddedBuffer),
                        decipher1.final()
                    ]);
                    
                    // Remove PKCS7 padding
                    const paddingLength = decryptedBuffer[decryptedBuffer.length - 1];
                    if (paddingLength > 0 && paddingLength <= 16) {
                        decryptedBuffer = decryptedBuffer.slice(0, decryptedBuffer.length - paddingLength);
                    }
                    
                    const decrypted = decryptedBuffer.toString('utf8');
                    const gpsData = JSON.parse(decrypted);
                    console.log(`✅ SMS truncation recovery successful for ${gpsData.busId || 'unknown'}`);
                    return gpsData;
                } catch (e1) {
                    console.log(`⚠️ Null padding recovery failed: ${e1.message}`);
                }
                
                // Method 2: Try different padding bytes
                for (let padByte of [0x20, 0x00, 0x10]) { // space, null, or padding marker
                    try {
                        const paddedBuffer = Buffer.concat([encryptedBuffer, Buffer.alloc(missingBytes, padByte)]);
                        const decipher2 = crypto.createDecipheriv('aes-256-cbc', key, iv);
                        let decrypted = Buffer.concat([
                            decipher2.update(paddedBuffer),
                            decipher2.final()
                        ]).toString('utf8');
                        
                        const gpsData = JSON.parse(decrypted);
                        console.log(`✅ Padding recovery (0x${padByte.toString(16)}) successful for ${gpsData.busId || 'unknown'}`);
                        return gpsData;
                    } catch (e2) {
                        // Continue to next padding method
                    }
                }
                
                // Final fallback: don't throw; return a soft failure to avoid error logs
                console.log(`⏭️ Truncated ciphertext not recoverable; skipping without error`);
                return null;
            }
            
            // Standard decryption for properly aligned data
            const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
            let decrypted = decipher.update(normalized, 'base64', 'utf8');
            decrypted += decipher.final('utf8');
            
            const gpsData = JSON.parse(decrypted);
            console.log(`✅ Standard decryption successful for ${gpsData.busId || 'unknown'}`);
            return gpsData;
            
        } catch (error) {
            // Quiet errors for operational logs; just mark unprocessed
            console.log('⏭️ Decryption failed; treating as unprocessable without error spam');
            
            // Try to parse as unencrypted fallback
            try {
                return JSON.parse(encryptedData);
            } catch (e) {
                // Silent fallback failure
                return null;
            }
        }
    }
    
    /**
     * Parse encrypted GPS message from SMS
     * @param {String} smsMessage - SMS message content
     * @returns {Object|null} - Parsed GPS data or null if invalid
     */
    parseEncryptedSMSMessage(smsMessage) {
        // Minimal logging to avoid noisy errors
        // console.log('🔍 Parsing SMS message:', smsMessage.substring(0, 50) + '...');
        
        // Check for encrypted GPS format: GPS_ENC:encrypted_data
        if (smsMessage.startsWith('GPS_ENC:')) {
            // console.log('📱 Detected encrypted GPS message');
            const encryptedData = smsMessage.substring(8); // Remove "GPS_ENC:" prefix
            
            // Validate encrypted data format (should be valid base64)
            if (!this.isValidBase64(encryptedData)) {
                // console.log('⚠️ Base64 validation uncertain, attempting decryption anyway...');
                // Don't return null - try to decrypt anyway as the validation might be too strict
            } else {
                // console.log('✅ Base64 format validated successfully');
            }
            
            const decryptedData = this.decryptGPS(encryptedData);
            
            if (this.validateGPSData(decryptedData)) {
                // console.log('✅ Encrypted GPS data validated successfully');
                return decryptedData;
            } else {
                // Quiet: invalid or truncated
            }
        }
        
        // Fallback: try to parse as plain GPS format
        // console.log('🔍 Trying plain GPS format...');
        const plainGPSMatch = smsMessage.match(/^GPS:([A-Z0-9]+),(-?\d+\.?\d*),(-?\d+\.?\d*)/i);
        if (plainGPSMatch) {
            // console.log('📱 Detected plain GPS message');
            const [, busId, lat, lng] = plainGPSMatch;
            const gpsData = {
                busId: busId,
                latitude: parseFloat(lat),
                longitude: parseFloat(lng),
                timestamp: Date.now(),
                source: 'SMS_PLAIN',
                version: '1.0'
            };
            
            if (this.validateGPSData(gpsData)) {
                // console.log('✅ Plain GPS data validated successfully');
                return gpsData;
            }
        }
        
        // Quiet: unable to parse
        return null;
    }
    
    /**
     * Check if string is valid base64
     * @param {String} str - String to check
     * @returns {Boolean} - Whether string is valid base64
     */
    isValidBase64(str) {
        try {
            // Base64 regex pattern - more permissive for encrypted data
            const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
            if (!base64Regex.test(str)) {
                return false;
            }
            
            // Try to decode and re-encode to verify
            const decoded = Buffer.from(str, 'base64');
            const reencoded = decoded.toString('base64');
            
            // Allow for slight padding differences
            return str === reencoded || str === reencoded.replace(/=+$/, '');
        } catch (e) {
            console.log('❌ Base64 validation error:', e.message);
            return false;
        }
    }
    
    /**
     * Validate decrypted GPS data
     * @param {Object} gpsData - Decrypted GPS data
     * @returns {Boolean} - Whether data is valid
     */
    validateGPSData(gpsData) {
        // Silent validation to avoid noisy logs
        if (!gpsData || typeof gpsData !== 'object') {
            return false;
        }

        const { busId, latitude, longitude } = gpsData;

        // Check required fields
        if (!busId || latitude === undefined || longitude === undefined) {
            return false;
        }

        // Validate coordinate ranges
        if (typeof latitude !== 'number' || typeof longitude !== 'number') {
            return false;
        }

        if (latitude < -90 || latitude > 90) {
            return false;
        }

        if (longitude < -180 || longitude > 180) {
            return false;
        }

        return true;
    }
    
    /**
     * Create encrypted GPS location object
     * @param {String} busId - Bus identifier
     * @param {Number} latitude - GPS latitude
     * @param {Number} longitude - GPS longitude
     * @param {Object} metadata - Additional metadata
     * @returns {String} - Encrypted GPS package
     */
    encryptGPSLocation(busId, latitude, longitude, metadata = {}) {
        const gpsPackage = {
            busId: busId,
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
            timestamp: metadata.timestamp || Date.now(),
            speed: metadata.speed || 0,
            accuracy: metadata.accuracy || 0,
            source: metadata.source || 'API',
            version: '1.0'
        };
        
        return this.encryptGPS(gpsPackage);
    }
}

// Export singleton instance
const gpsEncryption = new GPSEncryption();
module.exports = gpsEncryption;

// Export class for testing
module.exports.GPSEncryption = GPSEncryption;