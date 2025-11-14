package com.margsetu.driver.utils

import android.util.Base64
import android.util.Log
import org.json.JSONObject
import javax.crypto.Cipher
import javax.crypto.spec.SecretKeySpec
import javax.crypto.spec.IvParameterSpec

/**
 * GPS Encryption Utility for Driver App
 * Provides AES-256-ECB encryption for GPS coordinates before transmission
 */
class GPSEncryption {
    
    companion object {
        private const val TAG = "GPSEncryption"
        private const val ALGORITHM = "AES"
        private const val TRANSFORMATION = "AES/CBC/PKCS5Padding"
        
        // Default encryption key and IV (should match backend)
        private const val DEFAULT_ENCRYPTION_KEY = "MargSetu2024SecureGPSLocationKey32B"
        private const val DEFAULT_ENCRYPTION_IV = "MargSetuGPSIV16B"
        
        @Volatile
        private var INSTANCE: GPSEncryption? = null
        
        fun getInstance(): GPSEncryption {
            return INSTANCE ?: synchronized(this) {
                INSTANCE ?: GPSEncryption().also { INSTANCE = it }
            }
        }
    }
    
    private val encryptionKey: String = DEFAULT_ENCRYPTION_KEY
    private val encryptionIV: String = DEFAULT_ENCRYPTION_IV
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
     * @param busNumber Bus identifier
     * @param latitude GPS latitude
     * @param longitude GPS longitude
     * @param metadata Additional metadata
     * @return Encrypted GPS data as base64 string
     */
    fun encryptGPSLocation(
        busNumber: String,
        latitude: Double,
        longitude: Double,
        metadata: Map<String, Any> = emptyMap()
    ): String {
        if (!isEncryptionEnabled) {
            return createPlainGPSMessage(busNumber, latitude, longitude)
        }
        
        try {
            val gpsData = JSONObject().apply {
                put("busId", busNumber)
                put("latitude", latitude)
                put("longitude", longitude)
                put("timestamp", System.currentTimeMillis())
                put("speed", metadata["speed"] ?: 0)
                put("accuracy", metadata["accuracy"] ?: 0)
                put("source", metadata["source"] ?: "DRIVER_APP")
                put("version", "1.0")
            }
            
            val plaintext = gpsData.toString()
            val encryptedData = encrypt(plaintext)
            
            Log.d(TAG, "GPS data encrypted for $busNumber")
            return encryptedData
            
        } catch (e: Exception) {
            Log.e(TAG, "GPS encryption failed", e)
            // Fallback to plain message
            return createPlainGPSMessage(busNumber, latitude, longitude)
        }
    }
    
    /**
     * Create encrypted SMS message for GPS
     * @param busNumber Bus identifier
     * @param latitude GPS latitude
     * @param longitude GPS longitude
     * @return SMS-ready encrypted GPS message
     */
    fun createEncryptedSMSMessage(busNumber: String, latitude: Double, longitude: Double): String {
        val encryptedData = encryptGPSLocation(
            busNumber = busNumber,
            latitude = latitude,
            longitude = longitude,
            metadata = mapOf(
                "timestamp" to System.currentTimeMillis(),
                "source" to "DRIVER_APP_SMS"
            )
        )
        
        return if (isEncryptionEnabled) {
            "GPS_ENC:$encryptedData"
        } else {
            encryptedData // Already formatted as plain GPS message
        }
    }
    
    /**
     * Create encrypted HTTP payload for GPS
     * @param busNumber Bus identifier
     * @param latitude GPS latitude
     * @param longitude GPS longitude
     * @param driverName Driver name
     * @return Encrypted GPS data for HTTP transmission
     */
    fun createEncryptedHTTPPayload(
        busNumber: String, 
        latitude: Double, 
        longitude: Double,
        driverName: String = "Unknown"
    ): String {
        return encryptGPSLocation(
            busNumber = busNumber,
            latitude = latitude,
            longitude = longitude,
            metadata = mapOf(
                "timestamp" to System.currentTimeMillis(),
                "source" to "DRIVER_APP_HTTP",
                "driverName" to driverName
            )
        )
    }
    
    /**
     * Encrypt string data using AES-CBC
     */
    private fun encrypt(plaintext: String): String {
        try {
            val key = prepareKey(encryptionKey)
            val iv = prepareIV(encryptionIV)
            val cipher = Cipher.getInstance(TRANSFORMATION)
            cipher.init(Cipher.ENCRYPT_MODE, key, iv)
            
            val encryptedBytes = cipher.doFinal(plaintext.toByteArray(Charsets.UTF_8))
            return Base64.encodeToString(encryptedBytes, Base64.NO_WRAP)
            
        } catch (e: Exception) {
            Log.e(TAG, "Encryption failed", e)
            throw e
        }
    }
    
    /**
     * Prepare encryption key to correct length (same as Node.js backend)
     */
    private fun prepareKey(key: String): SecretKeySpec {
        // Use same logic as Node.js: pad with '0' character, not null bytes
        val keyStr = if (key.length != 32) {
            key.padEnd(32, '0').substring(0, 32)
        } else {
            key
        }
        
        val keyBytes = keyStr.toByteArray(Charsets.UTF_8)
        return SecretKeySpec(keyBytes, ALGORITHM)
    }
    
    /**
     * Prepare IV to correct length (same as Node.js backend)
     */
    private fun prepareIV(iv: String): IvParameterSpec {
        // Use same logic as Node.js: pad with '0' character, not null bytes
        val ivStr = if (iv.length != 16) {
            iv.padEnd(16, '0').substring(0, 16)
        } else {
            iv
        }
        
        val ivBytes = ivStr.toByteArray(Charsets.UTF_8)
        return IvParameterSpec(ivBytes)
    }
    
    /**
     * Create plain GPS message (fallback)
     */
    private fun createPlainGPSMessage(busNumber: String, latitude: Double, longitude: Double): String {
        return "GPS:$busNumber,$latitude,$longitude,0.0,0,${System.currentTimeMillis()}"
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
            
            val success = encrypted.isNotEmpty()
            Log.d(TAG, "Encryption test: ${if (success) "PASSED" else "FAILED"}")
            success
            
        } catch (e: Exception) {
            Log.e(TAG, "Encryption test failed", e)
            false
        }
    }
}