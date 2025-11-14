package com.margsetu.driver.services

import android.content.Context
import android.location.Location
import com.margsetu.driver.network.ApiClient
import com.margsetu.driver.network.SOSRequest
import com.margsetu.driver.utils.NetworkUtils
import com.margsetu.driver.utils.SMSUtils
import kotlinx.coroutines.*
import java.text.SimpleDateFormat
import java.util.*

object SOSService {
    
    fun sendEmergencyAlert(
        context: Context,
        driverId: String,
        busId: String,
        location: Location?,
        onResult: (success: Boolean, message: String) -> Unit
    ) {
        val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())
        
        scope.launch {
            try {
                val latitude = location?.latitude ?: 0.0
                val longitude = location?.longitude ?: 0.0
                val timestamp = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.getDefault()).format(Date())
                
                // Try to send via internet first
                if (NetworkUtils.isNetworkAvailable(context)) {
                    val success = sendSOSViaAPI(context, driverId, busId, latitude, longitude, timestamp)
                    if (success) {
                        onResult(true, "Emergency alert sent successfully")
                        return@launch
                    }
                }
                
                // Fallback to SMS
                val smsSuccess = SMSUtils.sendSOSSMS(context, driverId, busId, latitude, longitude)
                if (smsSuccess) {
                    onResult(true, "Emergency alert sent via SMS")
                } else {
                    onResult(false, "Failed to send emergency alert")
                }
                
            } catch (e: Exception) {
                onResult(false, "Error sending emergency alert: ${e.message}")
            }
        }
    }
    
    private suspend fun sendSOSViaAPI(
        context: Context,
        driverId: String,
        busId: String,
        latitude: Double,
        longitude: Double,
        timestamp: String
    ): Boolean {
        return withContext(Dispatchers.IO) {
            try {
                // Get auth token from SharedPreferences
                val sharedPrefs = context.getSharedPreferences("MargSetuDriverPrefs", Context.MODE_PRIVATE)
                val authToken = sharedPrefs.getString("auth_token", "") ?: ""
                
                val sosRequest = SOSRequest(
                    driverId = driverId,
                    busId = busId,
                    latitude = latitude,
                    longitude = longitude,
                    timestamp = timestamp
                )
                
                val response = ApiClient.apiService.sendSOSAlert("Bearer $authToken", sosRequest)
                response.isSuccessful && response.body()?.success == true
                
            } catch (e: Exception) {
                println("SOS API error: ${e.message}")
                false
            }
        }
    }
}