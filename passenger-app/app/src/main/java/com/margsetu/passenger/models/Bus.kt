package com.margsetu.passenger.models

import android.os.Parcelable
import kotlinx.parcelize.Parcelize
import org.json.JSONObject

@Parcelize
data class Bus(
    val id: String,
    val number: String,
    val route: String,
    val driverName: String,
    val driverPhone: String,
    val departureTime: String,
    val arrivalTime: String,
    val seatsAvailable: Int,
    val totalSeats: Int,
    val currentLocation: String,
    val occupancy: String, // Low, Medium, High
    val status: String, // Online, Offline, Idle
    val estimatedArrival: String,
    val latitude: Double = 0.0,
    val longitude: Double = 0.0
) : Parcelable {
    
    companion object {
        // Create Bus object from JSON (matches backend API response format)
        fun fromJson(json: JSONObject): Bus {
            // Extract location information from nested currentLocation object
            var locationAddress = "Moving"
            var lat = 0.0
            var lng = 0.0
            
            if (json.has("currentLocation")) {
                val locationObj = json.optJSONObject("currentLocation")
                if (locationObj != null) {
                    // Extract address from nested object
                    locationAddress = locationObj.optString("address", "Moving")
                    lat = locationObj.optDouble("latitude", 0.0)
                    lng = locationObj.optDouble("longitude", 0.0)
                } else {
                    // Fallback: currentLocation might be a simple string
                    locationAddress = json.optString("currentLocation", "Moving")
                }
            }
            
            // Also check for direct latitude/longitude fields (fallback)
            if (lat == 0.0) lat = json.optDouble("latitude", 0.0)
            if (lng == 0.0) lng = json.optDouble("longitude", 0.0)
            
            return Bus(
                id = json.optString("busId", json.optString("id", "")),
                // Support both 'busNumber' and 'number'
                number = json.optString("busNumber",
                    json.optString("number", "")),
                // Support both 'routeName' and 'route'
                route = json.optString("routeName",
                    json.optString("route", "")),
                driverName = json.optString("driverName", ""),
                driverPhone = json.optString("driverPhone", ""),
                departureTime = json.optString("departureTime", "00:00"),
                arrivalTime = json.optString("arrivalTime", "00:00"),
                seatsAvailable = json.optInt("seatsAvailable", 
                    json.optInt("capacity", 40) - json.optInt("currentPassengers", 0)),
                totalSeats = json.optInt("totalSeats", json.optInt("capacity", 40)),
                currentLocation = locationAddress, // Now properly extracted from nested object
                occupancy = json.optString("occupancy", "Medium"),
                status = json.optString("status", "ACTIVE"),
                estimatedArrival = json.optString("estimatedArrival", "5 mins"),
                latitude = lat,
                longitude = lng
            )
        }
    }
    
    // Convert Bus object to JSON string for safe intent passing fallback
    fun toJson(): JSONObject {
        val json = JSONObject()
        json.put("id", id)
        json.put("number", number)
        json.put("route", route)
        json.put("driverName", driverName)
        json.put("driverPhone", driverPhone)
        json.put("departureTime", departureTime)
        json.put("arrivalTime", arrivalTime)
        json.put("seatsAvailable", seatsAvailable)
        json.put("totalSeats", totalSeats)
        json.put("currentLocation", currentLocation)
        json.put("occupancy", occupancy)
        json.put("status", status)
        json.put("estimatedArrival", estimatedArrival)
        json.put("latitude", latitude)
        json.put("longitude", longitude)
        return json
    }

    // Helper methods
    fun isOnline(): Boolean = status.equals("Online", ignoreCase = true)
    
    fun hasLocation(): Boolean = latitude != 0.0 && longitude != 0.0
    
    fun getOccupancyPercentage(): Int {
        return if (totalSeats > 0) {
            ((totalSeats - seatsAvailable) * 100) / totalSeats
        } else 0
    }
    
    fun isAlmostFull(): Boolean = getOccupancyPercentage() >= 80
    
    fun getStatusColor(): String {
        return when (status.lowercase()) {
            "online" -> "#4CAF50" // Green
            "idle" -> "#FF9800"   // Orange
            else -> "#F44336"     // Red (Offline)
        }
    }
}