const crypto = require('crypto');
require('dotenv').config();

/**
 * GPS Location Encryption Utility
 * Provides AES-256-CBC encryption/decryption for sensitive GPS coordinates
 */
class GPSEncryption {
    constructor() {
        // Get encryption key and IV from environment
        this.encryptionKey = process.env.GPS_ENCRYPTION_KEY || 'MargSetu2024SecureGPSLocationKey32B';
        this.encryptionIV = process.env.GPS_ENCRYPTION_IV || 'MargSetuGPSIV16B';
        this.encryptionEnabled = process.env.GPS_ENCRYPTION_ENABLED === 'true';
        
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
                console.error('❌ Failed to parse unencrypted GPS data:', e);
                return null;
            }
        }
        
        try {
            // Use modern crypto API with explicit key and IV
            const key = Buffer.from(this.encryptionKey, 'utf8');
            const iv = Buffer.from(this.encryptionIV, 'utf8');
            
            const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
            
            let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
            decrypted += decipher.final('utf8');
            
            const gpsData = JSON.parse(decrypted);
            console.log(`🔓 GPS data decrypted for ${gpsData.busId || 'unknown'}`);
            
            return gpsData;
            
        } catch (error) {
            console.error('❌ GPS decryption failed:', error);
            console.error('❌ Encrypted data:', encryptedData.substring(0, 50) + '...');
            
            // Try to parse as unencrypted fallback
            try {
                return JSON.parse(encryptedData);
            } catch (e) {
                console.error('❌ Fallback parsing also failed');
                return null;
            }
        }
    }
    
    /**
     * Encrypt GPS coordinates with additional metadata
     * @param {String} busId - Bus identifier
     * @param {Number} latitude - GPS latitude
     * @param {Number} longitude - GPS longitude
     * @param {Object} metadata - Additional metadata (timestamp, speed, etc.)
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
            source: metadata.source || 'SMS',
            version: '1.0'
        };
        
        return this.encryptGPS(gpsPackage);
    }
    
    /**
     * Validate decrypted GPS data
     * @param {Object} gpsData - Decrypted GPS data
     * @returns {Boolean} - Whether data is valid
     */
    validateGPSData(gpsData) {
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
     * Create encrypted GPS message for SMS
     * @param {String} busId - Bus identifier
     * @param {Number} latitude - GPS latitude
     * @param {Number} longitude - GPS longitude
     * @returns {String} - SMS-ready encrypted GPS message
     */
    createEncryptedSMSMessage(busId, latitude, longitude) {
        const encryptedData = this.encryptGPSLocation(busId, latitude, longitude, {
            timestamp: Date.now(),
            source: 'SMS_GATEWAY'
        });
        
        // Format: GPS_ENC:encrypted_data
        return `GPS_ENC:${encryptedData}`;
    }
    
    /**
     * Parse encrypted GPS message from SMS
     * @param {String} smsMessage - SMS message content
     * @returns {Object|null} - Parsed GPS data or null if invalid
     */
    parseEncryptedSMSMessage(smsMessage) {
        // Check for encrypted GPS format
        if (smsMessage.startsWith('GPS_ENC:')) {
            const encryptedData = smsMessage.substring(8); // Remove "GPS_ENC:" prefix
            const decryptedData = this.decryptGPS(encryptedData);
            
            if (this.validateGPSData(decryptedData)) {
                return decryptedData;
            }
        }
        
        // Fallback: try to parse as plain GPS format
        const plainGPSMatch = smsMessage.match(/^GPS:([A-Z0-9]+),(-?\d+\.?\d*),(-?\d+\.?\d*)/i);
        if (plainGPSMatch) {
            const [, busId, lat, lng] = plainGPSMatch;
            return {
                busId: busId,
                latitude: parseFloat(lat),
                longitude: parseFloat(lng),
                timestamp: Date.now(),
                source: 'SMS_PLAIN',
                version: '1.0'
            };
        }
        
        return null;
    }
}

// Export singleton instance
const gpsEncryption = new GPSEncryption();
module.exports = gpsEncryption;

// Export class for testing
module.exports.GPSEncryption = GPSEncryption;