package com.margsetu.passenger.utils

import android.content.Context
import android.location.Address
import android.location.Geocoder
import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.util.*

/**
 * Utility class for converting latitude/longitude coordinates to human-readable addresses
 */
class LocationUtils {
    
    companion object {
        private const val TAG = "LocationUtils"
        
        /**
         * Convert latitude/longitude to address using Android Geocoder
         * @param context Android context
         * @param latitude Latitude coordinate
         * @param longitude Longitude coordinate
         * @return Formatted address string or fallback coordinates
         */
        suspend fun getAddressFromCoordinates(
            context: Context, 
            latitude: Double, 
            longitude: Double
        ): String = withContext(Dispatchers.IO) {
            try {
                // Check if Geocoder is available
                if (!Geocoder.isPresent()) {
                    Log.w(TAG, "Geocoder not available on this device")
                    return@withContext formatCoordinates(latitude, longitude)
                }
                
                val geocoder = Geocoder(context, Locale.getDefault())
                val addresses: List<Address>? = try {
                    @Suppress("DEPRECATION")
                    geocoder.getFromLocation(latitude, longitude, 1)
                } catch (e: Exception) {
                    Log.e(TAG, "Geocoder getFromLocation failed: ${e.message}")
                    null
                }
                
                if (addresses?.isNotEmpty() == true) {
                    val address = addresses[0]
                    val addressLine = address.getAddressLine(0)
                    
                    if (!addressLine.isNullOrEmpty()) {
                        Log.d(TAG, "Geocoded address: $addressLine")
                        return@withContext addressLine
                    }
                    
                    // Fallback: construct address from components
                    val components = mutableListOf<String>()
                    address.featureName?.let { components.add(it) }
                    address.thoroughfare?.let { components.add(it) }
                    address.locality?.let { components.add(it) }
                    address.adminArea?.let { components.add(it) }
                    
                    if (components.isNotEmpty()) {
                        val constructedAddress = components.joinToString(", ")
                        Log.d(TAG, "Constructed address: $constructedAddress")
                        return@withContext constructedAddress
                    }
                }
                
                Log.w(TAG, "No address found for coordinates: $latitude, $longitude")
                return@withContext formatCoordinates(latitude, longitude)
                
            } catch (e: Exception) {
                Log.e(TAG, "Error getting address from coordinates", e)
                return@withContext formatCoordinates(latitude, longitude)
            }
        }
        
        /**
         * Format coordinates as a readable string (fallback)
         */
        private fun formatCoordinates(latitude: Double, longitude: Double): String {
            return String.format(Locale.getDefault(), "%.4f°N, %.4f°E", latitude, longitude)
        }
        
        /**
         * Get approximate location name for common Mumbai-Pune route coordinates
         */
        fun getMumbaiPuneLocationName(latitude: Double, longitude: Double): String {
            return when {
                // Mumbai area (19.0-19.2, 72.8-73.0)
                latitude >= 19.0 && latitude <= 19.2 && longitude >= 72.8 && longitude <= 73.0 -> {
                    when {
                        latitude >= 19.05 && longitude <= 72.9 -> "Mumbai Central"
                        latitude >= 19.0 && longitude >= 72.9 -> "Thane"
                        else -> "Mumbai Metropolitan Area"
                    }
                }
                // Kalyan-Lonavala area (18.8-19.0, 73.0-73.4)
                latitude >= 18.8 && latitude <= 19.0 && longitude >= 73.0 && longitude <= 73.4 -> {
                    when {
                        longitude <= 73.2 -> "Kalyan"
                        longitude <= 73.35 -> "Lonavala"
                        else -> "Khandala Hills"
                    }
                }
                // Pune area (18.4-18.7, 73.6-73.9)
                latitude >= 18.4 && latitude <= 18.7 && longitude >= 73.6 && longitude <= 73.9 -> {
                    when {
                        latitude >= 18.6 -> "Pimpri-Chinchwad"
                        latitude >= 18.5 -> "Pune City"
                        else -> "Pune Metropolitan Area"
                    }
                }
                else -> formatCoordinates(latitude, longitude)
            }
        }
        
        /**
         * Check if coordinates are valid
         */
        fun isValidCoordinates(latitude: Double, longitude: Double): Boolean {
            return latitude != 0.0 && longitude != 0.0 && 
                   latitude >= -90.0 && latitude <= 90.0 &&
                   longitude >= -180.0 && longitude <= 180.0
        }
    }
}