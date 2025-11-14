package com.margsetu.smsgateway

import android.util.Base64
import android.util.Log
import org.json.JSONObject
import javax.crypto.Cipher
import javax.crypto.spec.SecretKeySpec

/**
 * GPS Encryption Utility for Android SMS Gateway
 * Provides AES-256-ECB encryption for GPS coordinates before transmission
 */
class GPSEncryption {
    
    companion object {
        private const val TAG = "GPSEncryption"
        private const val ALGORITHM = "AES"
        private const val TRANSFORMATION = "AES"
        
        // Default encryption key (should match backend)
        private const val DEFAULT_ENCRYPTION_KEY = "MargSetu2024SecureGPSLocationKey32B"
        
        @Volatile
        private var INSTANCE: GPSEncryption? = null
        
        fun getInstance(): GPSEncryption {
            return INSTANCE ?: synchronized(this) {
                INSTANCE ?: GPSEncryption().also { INSTANCE = it }
            }
        }
    }
    
    private val encryptionKey: String = DEFAULT_ENCRYPTION_KEY
    private var isEncryptionEnabled: Boolean = true
    
    init {
        Log.d(TAG, "GPS Encryption initialized: ${if (isEncryptionEnabled) "ENABLED" else "DISABLED"}")
    }
    
    /**
     * Enable or disable GPS encryption
     */
    fun setEncryptionEnabled(enabled: Boolean) {
        isEncryptionEnabled = enabled
        Log.d(TAG, "GPS Encryption: ${if (enabled) "ENABLED" else "DISABLED"}")
    }
    
    /**
     * Encrypt GPS coordinates
     * @param busId Bus identifier
     * @param latitude GPS latitude
     * @param longitude GPS longitude
     * @param metadata Additional metadata
     * @return Encrypted GPS data as base64 string
     */
    fun encryptGPSLocation(
        busId: String,
        latitude: Double,
        longitude: Double,
        metadata: Map<String, Any> = emptyMap()
    ): String {
        if (!isEncryptionEnabled) {
            return createPlainGPSMessage(busId, latitude, longitude)
        }
        
        try {
            val gpsData = JSONObject().apply {
                put("busId", busId)
                put("latitude", latitude)
                put("longitude", longitude)
                put("timestamp", System.currentTimeMillis())
                put("speed", metadata["speed"] ?: 0)
                put("accuracy", metadata["accuracy"] ?: 0)
                put("source", metadata["source"] ?: "SMS_GATEWAY")
                put("version", "1.0")
            }
            
            val plaintext = gpsData.toString()
            val encryptedData = encrypt(plaintext)
            
            Log.d(TAG, "GPS data encrypted for $busId")
            return encryptedData
            
        } catch (e: Exception) {
            Log.e(TAG, "GPS encryption failed", e)
            // Fallback to plain message
            return createPlainGPSMessage(busId, latitude, longitude)
        }
    }
    
    /**
     * Create encrypted SMS message for GPS
     * @param busId Bus identifier
     * @param latitude GPS latitude
     * @param longitude GPS longitude
     * @return SMS-ready encrypted GPS message
     */
    fun createEncryptedSMSMessage(busId: String, latitude: Double, longitude: Double): String {
        val encryptedData = encryptGPSLocation(
            busId = busId,
            latitude = latitude,
            longitude = longitude,
            metadata = mapOf(
                "timestamp" to System.currentTimeMillis(),
                "source" to "SMS_GATEWAY"
            )
        )
        
        return if (isEncryptionEnabled) {
            "GPS_ENC:$encryptedData"
        } else {
            encryptedData // Already formatted as plain GPS message
        }
    }
    
    /**
     * Encrypt string data using AES
     */
    private fun encrypt(plaintext: String): String {
        try {
            val key = prepareKey(encryptionKey)
            val cipher = Cipher.getInstance(TRANSFORMATION)
            cipher.init(Cipher.ENCRYPT_MODE, key)
            
            val encryptedBytes = cipher.doFinal(plaintext.toByteArray(Charsets.UTF_8))
            return Base64.encodeToString(encryptedBytes, Base64.NO_WRAP)
            
        } catch (e: Exception) {
            Log.e(TAG, "Encryption failed", e)
            throw e
        }
    }
    
    /**
     * Decrypt string data using AES
     */
    private fun decrypt(encryptedData: String): String {
        try {
            val key = prepareKey(encryptionKey)
            val cipher = Cipher.getInstance(TRANSFORMATION)
            cipher.init(Cipher.DECRYPT_MODE, key)
            
            val encryptedBytes = Base64.decode(encryptedData, Base64.NO_WRAP)
            val decryptedBytes = cipher.doFinal(encryptedBytes)
            
            return String(decryptedBytes, Charsets.UTF_8)
            
        } catch (e: Exception) {
            Log.e(TAG, "Decryption failed", e)
            throw e
        }
    }
    
    /**
     * Prepare encryption key to correct length
     */
    private fun prepareKey(key: String): SecretKeySpec {
        var keyBytes = key.toByteArray(Charsets.UTF_8)
        
        // Ensure key is exactly 32 bytes for AES-256
        if (keyBytes.size < 32) {
            val paddedKey = ByteArray(32)
            System.arraycopy(keyBytes, 0, paddedKey, 0, keyBytes.size)
            // Pad remaining bytes with zeros
            keyBytes = paddedKey
        } else if (keyBytes.size > 32) {
            val truncatedKey = ByteArray(32)
            System.arraycopy(keyBytes, 0, truncatedKey, 0, 32)
            keyBytes = truncatedKey
        }
        
        return SecretKeySpec(keyBytes, ALGORITHM)
    }
    
    /**
     * Create plain GPS message (fallback)
     */
    private fun createPlainGPSMessage(busId: String, latitude: Double, longitude: Double): String {
        return "GPS:$busId,$latitude,$longitude,0.0,0,${System.currentTimeMillis()}"
    }
    
    /**
     * Validate GPS coordinates
     */
    fun validateCoordinates(latitude: Double, longitude: Double): Boolean {
        return latitude >= -90.0 && latitude <= 90.0 && 
               longitude >= -180.0 && longitude <= 180.0
    }
    
    /**
     * Test encryption/decryption functionality
     */
    fun testEncryption(): Boolean {
        return try {
            val testData = "Test GPS data for encryption"
            val encrypted = encrypt(testData)
            val decrypted = decrypt(encrypted)
            
            val success = testData == decrypted
            Log.d(TAG, "Encryption test: ${if (success) "PASSED" else "FAILED"}")
            success
            
        } catch (e: Exception) {
            Log.e(TAG, "Encryption test failed", e)
            false
        }
    }
}