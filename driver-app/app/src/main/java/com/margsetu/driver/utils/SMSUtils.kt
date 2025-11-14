package com.margsetu.driver.utils

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.telephony.SmsManager
import androidx.core.content.ContextCompat

object SMSUtils {
    
    // SMS Gateway Phone Number - Match AppConfig.Network.SMS_GATEWAY_NUMBER
    private const val BACKEND_SMS_NUMBER = "7876935991"  // ✅ SMS Gateway device number
    
    fun sendLocationSMS(context: Context, message: String): Boolean {
        if (!hasSMSPermission(context)) {
            println("❌ SMS permission not granted")
            return false
        }
        
        println("📱 Sending SMS to: $BACKEND_SMS_NUMBER")
        println("📄 SMS content: $message")
        
        return try {
            val smsManager = SmsManager.getDefault()
            
            // For long messages, split into multiple parts
            val parts = smsManager.divideMessage(message)
            if (parts.size > 1) {
                println("📨 Sending multipart SMS (${parts.size} parts)")
                smsManager.sendMultipartTextMessage(
                    BACKEND_SMS_NUMBER,
                    null,
                    parts,
                    null,
                    null
                )
            } else {
                println("📨 Sending single SMS")
                smsManager.sendTextMessage(
                    BACKEND_SMS_NUMBER,
                    null,
                    message,
                    null,
                    null
                )
            }
            
            println("✅ SMS sent successfully to $BACKEND_SMS_NUMBER: $message")
            true
        } catch (e: Exception) {
            println("❌ Failed to send SMS to $BACKEND_SMS_NUMBER: ${e.message}")
            e.printStackTrace()
            false
        }
    }
    
    fun sendSOSSMS(context: Context, driverId: String, busId: String, latitude: Double, longitude: Double): Boolean {
        if (!hasSMSPermission(context)) {
            return false
        }
        
        val message = "MARGSETU:SOS:$busId:$driverId:$latitude:$longitude:EMERGENCY"
        return sendLocationSMS(context, message)
    }
    
    fun formatLocationSMS(
        busId: String,
        driverId: String,
        latitude: Double,
        longitude: Double,
        accuracy: Float,
        timestamp: String
    ): String {
        return "MARGSETU:LOC:$busId:$driverId:$latitude:$longitude:$accuracy:$timestamp"
    }
    
    private fun hasSMSPermission(context: Context): Boolean {
        return ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.SEND_SMS
        ) == PackageManager.PERMISSION_GRANTED
    }
}