package com.margsetu.passenger.models

import android.os.Parcelable
import kotlinx.parcelize.Parcelize
import org.json.JSONObject

@Parcelize
data class Station(
    val id: String,
    val name: String,
    val latitude: Double,
    val longitude: Double,
    val address: String
) : Parcelable {
    
    companion object {
        // Create Station object from JSON (matches backend API response format)
        fun fromJson(json: JSONObject): Station {
            return Station(
                id = json.optString("id", ""),
                name = json.optString("name", ""),
                latitude = json.optDouble("latitude", 0.0),
                longitude = json.optDouble("longitude", 0.0),
                address = json.optString("address", "")
            )
        }
    }
    
    // Helper methods
    fun getDisplayName(): String {
        return if (address.isNotEmpty()) {
            "$name, $address"
        } else {
            name
        }
    }
    
    fun getCoordinates(): Pair<Double, Double> {
        return Pair(latitude, longitude)
    }
}