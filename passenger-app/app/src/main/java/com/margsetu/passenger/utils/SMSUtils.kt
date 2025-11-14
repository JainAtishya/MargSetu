package com.margsetu.passenger.utils

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.telephony.SmsManager
import android.telephony.TelephonyManager
import android.widget.Toast
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import android.Manifest

object SMSUtils {
    
    private const val SMS_PERMISSION_REQUEST_CODE = 101
    // Default fallback number; prefer reading from resources
    private const val DEFAULT_SMS_NUMBER = "+919876543210"
    
    // SMS Gateway number for fallback communication (same as driver app)
    private const val MARGSETU_SMS_NUMBER = "+917876935991"
    
    // SMS Commands for MargSetu service
    private const val SMS_SEARCH_ROUTE = "ROUTE"
    private const val SMS_BUS_STATUS = "STATUS"
    private const val SMS_SCHEDULE = "SCHEDULE"
    private const val SMS_HELP = "HELP"
    
    fun hasPermission(context: Context): Boolean {
        return ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.SEND_SMS
        ) == PackageManager.PERMISSION_GRANTED
    }
    
    fun requestPermission(activity: Activity) {
        ActivityCompat.requestPermissions(
            activity,
            arrayOf(Manifest.permission.SEND_SMS),
            SMS_PERMISSION_REQUEST_CODE
        )
    }
    
    /**
     * Send SMS to get current location of a specific bus
     * Format: LOC BUS_NUMBER
     */
    fun sendLocationSMS(context: Context, message: String): Boolean {
        if (!hasPermission(context)) {
            if (context is Activity) {
                requestPermission(context)
            }
            return false
        }
        
        return sendSMS(context, message, "Querying bus location via SMS...")
    }
    
    /**
     * Send SMS query for a specific bus location - direct to SMS Gateway
     * This sends the SMS directly to the driver's phone/SMS Gateway
     * Format: LOC BUS_NUMBER (e.g., "LOC MH12AB1234")
     */
    fun sendBusLocationQuery(context: Context, busNumber: String): Boolean {
        if (!hasPermission(context)) {
            if (context is Activity) {
                requestPermission(context)
            }
            return false
        }
        
        val message = "LOC $busNumber"
        return sendSMS(context, message, "SMS query sent for bus $busNumber")
    }
    
    /**
     * Send SMS to search for buses between two locations
     * Format: ROUTE FROM_LOCATION TO_LOCATION
     */
    fun sendRouteSearchSMS(context: Context, fromLocation: String, toLocation: String): Boolean {
        if (!hasPermission(context)) {
            if (context is Activity) {
                requestPermission(context)
            }
            return false
        }
        
        val message = "$SMS_SEARCH_ROUTE $fromLocation TO $toLocation"
        return sendSMS(context, message, "Searching for buses via SMS...")
    }
    
    /**
     * Send SMS to get status of a specific bus
     * Format: STATUS BUS_NUMBER
     */
    fun sendBusStatusSMS(context: Context, busNumber: String): Boolean {
        if (!hasPermission(context)) {
            if (context is Activity) {
                requestPermission(context)
            }
            return false
        }
        
        val message = "$SMS_BUS_STATUS $busNumber"
        return sendSMS(context, message, "Getting bus status via SMS...")
    }
    
    /**
     * Send SMS to get schedule for a specific route
     * Format: SCHEDULE ROUTE_NAME
     */
    fun sendScheduleSMS(context: Context, routeName: String): Boolean {
        if (!hasPermission(context)) {
            if (context is Activity) {
                requestPermission(context)
            }
            return false
        }
        
        val message = "$SMS_SCHEDULE $routeName"
        return sendSMS(context, message, "Getting schedule via SMS...")
    }
    
    /**
     * Send help SMS to get available commands
     * Format: HELP
     */
    fun sendHelpSMS(context: Context): Boolean {
        if (!hasPermission(context)) {
            if (context is Activity) {
                requestPermission(context)
            }
            return false
        }
        
        return sendSMS(context, SMS_HELP, "Getting help via SMS...")
    }
    
    private fun sendSMS(context: Context, message: String, toastMessage: String): Boolean {
        return try {
            // Use the SMS Gateway phone number directly for passenger queries
            val gatewayNumber = MARGSETU_SMS_NUMBER

            // If device cannot send SMS (no SIM), open SMS app to let user send manually
            if (!canSendSMS(context)) {
                openSMSAppWithMessage(context, message, gatewayNumber)
                Toast.makeText(context, "Opening SMS app…", Toast.LENGTH_SHORT).show()
                return true
            }

            val smsManager = SmsManager.getDefault()
            smsManager.sendTextMessage(gatewayNumber, null, message, null, null)
            Toast.makeText(context, toastMessage, Toast.LENGTH_SHORT).show()
            true
        } catch (e: Exception) {
            Toast.makeText(context, "Failed to send SMS: ${e.message}", Toast.LENGTH_LONG).show()
            false
        }
    }
    
    /**
     * Open SMS app with pre-filled message for manual sending
     */
    fun openSMSAppWithMessage(context: Context, message: String, phoneNumber: String = MARGSETU_SMS_NUMBER) {
        try {
            val intent = Intent(Intent.ACTION_VIEW).apply {
                data = Uri.parse("sms:$phoneNumber")
                putExtra("sms_body", message)
            }
            context.startActivity(intent)
        } catch (e: Exception) {
            Toast.makeText(context, "No SMS app found", Toast.LENGTH_SHORT).show()
        }
    }
    
    /**
     * Legacy method - maintained for compatibility
     */
    fun openSMSAppWithMessage(context: Context, message: String) {
        openSMSAppWithMessage(context, message, MARGSETU_SMS_NUMBER)
    }
    
    /**
     * Check if device can send SMS
     */
    fun canSendSMS(context: Context): Boolean {
        val telephonyManager = context.getSystemService(Context.TELEPHONY_SERVICE) as TelephonyManager
        return telephonyManager.simState == TelephonyManager.SIM_STATE_READY &&
                context.packageManager.hasSystemFeature(PackageManager.FEATURE_TELEPHONY)
    }
    
    /**
     * Get formatted SMS instructions for offline use
     */
    fun getSMSInstructions(): String {
        return """
            SMS Commands for MargSetu:
            
            Send SMS to: $MARGSETU_SMS_NUMBER
            
            Commands:
            • LOC [BUS_NUMBER] - Get bus current location
            • STATUS [BUS_NUMBER] - Get bus status  
            • ROUTE [FROM] TO [DESTINATION] - Search buses
            • SCHEDULE [ROUTE_NAME] - Get timetable
            • HELP - Get all commands
            
            Example:
            LOC MH12AB1234
            STATUS MH14AB7890
            ROUTE Pune TO Mumbai
            SCHEDULE Mumbai-Pune Express
        """.trimIndent()
    }
    
    /**
     * Show SMS fallback dialog with instructions
     */
    fun showSMSFallbackDialog(context: Context) {
        val instructions = getSMSInstructions()
        
        // This would typically show an AlertDialog with the instructions
        // and buttons to send SMS or open SMS app
        Toast.makeText(context, "Network is slow. Check SMS instructions.", Toast.LENGTH_LONG).show()
    }
    
    /**
     * Create emergency contact SMS
     */
    fun sendEmergencySMS(context: Context, location: String, busNumber: String? = null): Boolean {
        if (!hasPermission(context)) {
            if (context is Activity) {
                requestPermission(context)
            }
            return false
        }
        
        val message = buildString {
            append("EMERGENCY - Passenger needs help. ")
            append("Location: $location")
            busNumber?.let { append(" | Bus: $it") }
            append(" | Time: ${System.currentTimeMillis()}")
        }
        
        return sendSMS(context, message, "Emergency SMS sent")
    }
}