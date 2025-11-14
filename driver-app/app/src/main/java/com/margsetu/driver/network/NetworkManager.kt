package com.margsetu.driver.network

import android.content.Context
import android.util.Log
import com.margsetu.driver.config.AppConfig
import kotlinx.coroutines.*
import java.util.concurrent.ConcurrentHashMap

object NetworkManager {
    
    // Rate limiting storage
    private val lastRequestTime = ConcurrentHashMap<String, Long>()
    private val requestCounts = ConcurrentHashMap<String, MutableList<Long>>()
    
    /**
     * Check if request is allowed based on rate limiting rules
     */
    fun isRequestAllowed(endpoint: String): Boolean {
        val now = System.currentTimeMillis()
        val key = "rate_limit_$endpoint"
        
        // Get recent requests for this endpoint
        val requests = requestCounts.getOrPut(key) { mutableListOf() }
        
        // Remove requests older than 1 minute
        requests.removeAll { now - it > 60000 }
        
        // Check if under rate limit
        if (requests.size >= AppConfig.RateLimit.MAX_REQUESTS_PER_MINUTE) {
            Log.w("NetworkManager", "⏱️ Rate limit exceeded for $endpoint. Requests: ${requests.size}")
            return false
        }
        
        // Check minimum time between requests
        val lastTime = lastRequestTime[key] ?: 0
        if (now - lastTime < AppConfig.RateLimit.REQUEST_COOLDOWN_MS) {
            Log.w("NetworkManager", "⏱️ Request too soon for $endpoint. Wait ${AppConfig.RateLimit.REQUEST_COOLDOWN_MS}ms")
            return false
        }
        
        // Allow request and record it
        requests.add(now)
        lastRequestTime[key] = now
        
        Log.d("NetworkManager", "✅ Request allowed for $endpoint. Count: ${requests.size}/${AppConfig.RateLimit.MAX_REQUESTS_PER_MINUTE}")
        return true
    }
    
    /**
     * Send location update with automatic retry and rate limiting
     */
    suspend fun sendLocationUpdate(
        busId: String,
        latitude: Double,
        longitude: Double,
        authToken: String,
        tripId: String? = null
    ): NetworkResult<LocationUpdateResponse> {
        
        // Check rate limiting
        if (!isRequestAllowed("location_update")) {
            return NetworkResult.RateLimited("Too many location updates. Please wait.")
        }
        
        // Encrypt GPS coordinates for network transmission
        val gpsEncryption = com.margsetu.driver.utils.GPSEncryption.getInstance()
        val encryptedPayload = gpsEncryption.createEncryptedHTTPPayload(
            busNumber = busId,
            latitude = latitude,
            longitude = longitude,
            driverName = "Driver" // Could be retrieved from preferences if needed
        )
        
        val locationRequest = LocationUpdateRequest(
            busId = busId,
            latitude = 0.0, // Send dummy coordinates
            longitude = 0.0, // Send dummy coordinates  
            speed = 0f,
            heading = 0f,
            accuracy = 10f,
            tripId = tripId,
            encryptedGPS = encryptedPayload // Add encrypted GPS data
        )
        
        return withRetry(
            maxRetries = AppConfig.Network.RETRY_COUNT,
            delayMs = AppConfig.Network.RETRY_DELAY_MS
        ) {
            try {
                Log.d("NetworkManager", "📡 Sending encrypted location: bus=$busId, encrypted=${encryptedPayload.take(50)}...")
                
                val response = ApiClient.apiService.updateLocation("Bearer $authToken", locationRequest)
                
                if (response.isSuccessful) {
                    val body = response.body()
                    Log.d("NetworkManager", "✅ Location update successful: ${body?.message}")
                    NetworkResult.Success(body ?: LocationUpdateResponse(true, "Location updated"))
                } else {
                    val errorBody = response.errorBody()?.string()
                    Log.e("NetworkManager", "❌ Location update failed: ${response.code()} - $errorBody")
                    NetworkResult.Error("Server error: ${response.code()}", response.code())
                }
            } catch (e: Exception) {
                Log.e("NetworkManager", "❌ Network error: ${e.message}")
                NetworkResult.NetworkError(e.message ?: "Network connection failed")
            }
        }
    }
    
    /**
     * Authenticate driver with automatic retry
     */
    suspend fun authenticateDriver(
        username: String,
        password: String,
        driverId: String? = null
    ): NetworkResult<LoginResponse> {
        
        val loginRequest = LoginRequest(
            username = username,
            password = password,
            driverId = driverId
        )
        
        return withRetry(
            maxRetries = AppConfig.Network.RETRY_COUNT,
            delayMs = AppConfig.Network.RETRY_DELAY_MS
        ) {
            try {
                Log.d("NetworkManager", "🔐 Authenticating driver: $username")
                
                val response = ApiClient.apiService.login(loginRequest)
                
                if (response.isSuccessful) {
                    val body = response.body()
                    Log.d("NetworkManager", "✅ Login successful: ${body?.message}")
                    NetworkResult.Success(body ?: LoginResponse(false, "Login failed", ""))
                } else {
                    val errorBody = response.errorBody()?.string()
                    Log.e("NetworkManager", "❌ Login failed: ${response.code()} - $errorBody")
                    NetworkResult.Error("Authentication failed: ${response.code()}", response.code())
                }
            } catch (e: Exception) {
                Log.e("NetworkManager", "❌ Login network error: ${e.message}")
                NetworkResult.NetworkError(e.message ?: "Network connection failed")
            }
        }
    }
    
    /**
     * Generic retry wrapper
     */
    private suspend inline fun <T> withRetry(
        maxRetries: Int,
        delayMs: Long,
        crossinline action: suspend () -> NetworkResult<T>
    ): NetworkResult<T> {
        
        repeat(maxRetries) { attempt ->
            val result = action()
            
            when (result) {
                is NetworkResult.Success -> return result
                is NetworkResult.NetworkError -> {
                    if (attempt == maxRetries - 1) return result
                    Log.w("NetworkManager", "🔄 Retry ${attempt + 1}/$maxRetries after ${delayMs}ms")
                    delay(delayMs)
                }
                else -> return result // Don't retry rate limits or server errors
            }
        }
        
        return NetworkResult.NetworkError("Max retries exceeded")
    }
    
    /**
     * Check network connectivity and server reachability
     */
    suspend fun checkConnectivity(context: Context): ConnectivityStatus {
        return try {
            val isNetworkAvailable = com.margsetu.driver.utils.NetworkUtils.isNetworkAvailable(context)
            val connectionType = com.margsetu.driver.utils.NetworkUtils.getConnectionType(context)
            
            if (!isNetworkAvailable) {
                return ConnectivityStatus(false, "No Connection", false)
            }
            
            // Try to reach the server
            val response = ApiClient.apiService.javaClass.getDeclaredMethod("toString")
            
            ConnectivityStatus(
                isConnected = true,
                connectionType = connectionType,
                serverReachable = true
            )
        } catch (e: Exception) {
            Log.e("NetworkManager", "❌ Connectivity check failed: ${e.message}")
            ConnectivityStatus(
                isConnected = com.margsetu.driver.utils.NetworkUtils.isNetworkAvailable(context),
                connectionType = com.margsetu.driver.utils.NetworkUtils.getConnectionType(context),
                serverReachable = false
            )
        }
    }
}

/**
 * Network operation result wrapper
 */
sealed class NetworkResult<out T> {
    data class Success<T>(val data: T) : NetworkResult<T>()
    data class Error(val message: String, val code: Int? = null) : NetworkResult<Nothing>()
    data class NetworkError(val message: String) : NetworkResult<Nothing>()
    data class RateLimited(val message: String) : NetworkResult<Nothing>()
}

/**
 * Connectivity status data class
 */
data class ConnectivityStatus(
    val isConnected: Boolean,
    val connectionType: String,
    val serverReachable: Boolean
)