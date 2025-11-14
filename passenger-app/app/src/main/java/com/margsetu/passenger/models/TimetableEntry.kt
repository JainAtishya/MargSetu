package com.margsetu.passenger.models

import org.json.JSONObject

data class TimetableEntry(
    val busNumber: String,
    val routeName: String,
    val fromStation: String,
    val toStation: String,
    val departureTime: String,
    val arrivalTime: String,
    val frequency: String
) {
    
    companion object {
        // Create TimetableEntry object from JSON (matches backend API response format)
        fun fromJson(json: JSONObject): TimetableEntry {
            return TimetableEntry(
                busNumber = json.optString("busNumber", ""),
                routeName = json.optString("routeName", ""),
                fromStation = json.optString("fromStation", ""),
                toStation = json.optString("toStation", ""),
                departureTime = json.optString("departureTime", "00:00"),
                arrivalTime = json.optString("arrivalTime", "00:00"),
                frequency = json.optString("frequency", "On demand")
            )
        }
    }
    
    // Helper methods
    fun getRouteDescription(): String = "$fromStation → $toStation"
    
    fun getDuration(): String {
        return try {
            val depParts = departureTime.split(":")
            val arrParts = arrivalTime.split(":")
            
            val depMinutes = depParts[0].toInt() * 60 + depParts[1].toInt()
            val arrMinutes = arrParts[0].toInt() * 60 + arrParts[1].toInt()
            
            val durationMinutes = if (arrMinutes >= depMinutes) {
                arrMinutes - depMinutes
            } else {
                (24 * 60) - depMinutes + arrMinutes // Next day arrival
            }
            
            val hours = durationMinutes / 60
            val minutes = durationMinutes % 60
            
            if (hours > 0) {
                "${hours}h ${minutes}m"
            } else {
                "${minutes}m"
            }
        } catch (e: Exception) {
            "Unknown"
        }
    }
    
    fun isFrequent(): Boolean {
        return frequency.contains("minute", ignoreCase = true) || 
               frequency.contains("frequent", ignoreCase = true)
    }
}