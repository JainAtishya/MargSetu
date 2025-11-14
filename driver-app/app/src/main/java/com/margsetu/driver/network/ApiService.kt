package com.margsetu.driver.network

import retrofit2.Response
import retrofit2.http.*

interface ApiService {
    
    // Driver login endpoint (matches Vercel backend)
    @POST("auth/driver-login")
    suspend fun login(@Body loginRequest: LoginRequest): Response<LoginResponse>
    
    // Additional endpoints for existing app functionality (with minimal implementation)
    @POST("locations/update")
    suspend fun updateLocation(
        @Header("Authorization") token: String,
        @Body locationData: LocationUpdateRequest
    ): Response<LocationUpdateResponse>
    
    // Fetch or create a tripId for a bus when starting a journey
    @POST("locations/trip-id")
    suspend fun getTripId(
        @Header("Authorization") token: String,
        @Body body: TripIdRequest
    ): Response<TripIdResponse>

    @POST("emergency/sos")
    suspend fun sendSOSAlert(
        @Header("Authorization") token: String,
        @Body sosRequest: SOSRequest
    ): Response<SOSResponse>
}

// Data models that match Vercel backend API
data class LoginRequest(
    val username: String,    // Changed from driverId to username
    val password: String,
    val driverId: String? = null,  // Optional driver ID
    val busId: String? = null      // Optional bus ID
)

data class LoginResponse(
    val success: Boolean,
    val message: String,
    val token: String,
    val driver: Driver? = null,
    val expiresIn: String? = null
)

data class Driver(
    val driverId: String,
    val name: String,
    val phone: String? = null,
    val bus: Bus? = null,
    val busId: String? = null  // Keep for backward compatibility
)

data class Bus(
    val busId: String,
    val registrationNumber: String? = null
)

// Minimal models for existing app functionality
data class LocationUpdateRequest(
    val busId: String,
    val latitude: Double, // Dummy coordinates for backward compatibility
    val longitude: Double, // Dummy coordinates for backward compatibility
    val speed: Float = 0f,
    val heading: Float = 0f,
    val accuracy: Float = 0f,
    val tripId: String? = null,
    val encryptedGPS: String? = null // AES-encrypted GPS coordinates
    // Removed timestamp and status fields as backend validation doesn't accept them
)

data class LocationUpdateResponse(
    val success: Boolean,
    val message: String
)

data class SOSRequest(
    val driverId: String,
    val busId: String,
    val latitude: Double,
    val longitude: Double,
    val timestamp: String = "",
    val message: String = "Emergency alert"
)

data class SOSResponse(
    val success: Boolean,
    val message: String,
    val alertId: String? = null
)

// Trip ID API models
data class TripIdRequest(
    val busId: String,
    val routeDirection: String? = "forward"
)

data class TripIdResponse(
    val success: Boolean,
    val data: TripIdData?
)

data class TripIdData(
    val tripId: String,
    val busId: String,
    val direction: String?
)