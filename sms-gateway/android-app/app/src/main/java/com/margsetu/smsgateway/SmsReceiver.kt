package com.margsetu.smsgateway

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.provider.Telephony
import android.telephony.SmsMessage
import android.util.Log
import kotlinx.coroutines.*
import java.util.regex.Pattern

class SmsReceiver : BroadcastReceiver() {
    
    companion object {
        private const val TAG = "SmsReceiver"
        
        // Regex patterns for SMS parsing
        private val DRIVER_LOCATION_PATTERN = Pattern.compile(
            "^(BUS\\d+):\\s*(-?\\d+\\.\\d+),\\s*(-?\\d+\\.\\d+)$",
            Pattern.CASE_INSENSITIVE
        )
        
        // GPS format pattern: GPS:BUS001,lat,lng,speed,bearing,timestamp
        private val GPS_LOCATION_PATTERN = Pattern.compile(
            "^GPS:(BUS\\d+),\\s*(-?\\d+\\.\\d+),\\s*(-?\\d+\\.\\d+),.*$",
            Pattern.CASE_INSENSITIVE
        )
        
        // More flexible passenger query patterns - but EXCLUDE GPS messages
        private val PASSENGER_QUERY_PATTERN = Pattern.compile(
            "^(?!GPS:).*(BUS\\d+).*",
            Pattern.CASE_INSENSITIVE
        )
    }
    
    private val receiverScope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    
    override fun onReceive(context: Context, intent: Intent) {
        Log.d(TAG, "SMS received, processing...")
        
        val config = GatewayConfig.getInstance(context)
        if (!config.isGatewayEnabled || !config.isConfigurationValid()) {
            Log.d(TAG, "Gateway disabled or not configured properly")
            return
        }
        
        try {
            val messages = extractSmsMessages(intent)
            if (messages.isNotEmpty()) {
                receiverScope.launch {
                    processSmsMessages(context, messages)
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error processing SMS", e)
            LogManager.getInstance(context).addLog("Error processing SMS: ${e.message}")
        }
    }
    
    private fun extractSmsMessages(intent: Intent): List<SmsMessage> {
        val messages = mutableListOf<SmsMessage>()
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
            // Use Telephony.Sms.Intents for KitKat+
            val smsMessages = Telephony.Sms.Intents.getMessagesFromIntent(intent)
            smsMessages?.let { messages.addAll(it) }
        } else {
            // Fallback for older versions
            val pdus = intent.extras?.get("pdus") as? Array<*>
            pdus?.forEach { pdu ->
                try {
                    val smsMessage = SmsMessage.createFromPdu(pdu as ByteArray)
                    messages.add(smsMessage)
                } catch (e: Exception) {
                    Log.e(TAG, "Error creating SMS message from PDU", e)
                }
            }
        }
        
        return messages
    }
    
    private suspend fun processSmsMessages(context: Context, messages: List<SmsMessage>) {
        val config = GatewayConfig.getInstance(context)
        val logManager = LogManager.getInstance(context)
        val networkService = NetworkService(context)
        
        for (message in messages) {
            try {
                val sender = message.originatingAddress ?: "Unknown"
                val body = message.messageBody ?: ""
                val timestamp = message.timestampMillis
                
                Log.d(TAG, "Processing SMS from $sender: $body")
                logManager.addLog("SMS received from $sender")
                
                // Parse the SMS content
                val smsType = parseSmsContent(body)
                
                when (smsType) {
                    is SmsType.DriverLocation -> {
                        Log.d(TAG, "Driver location SMS: ${smsType.busId} at ${smsType.latitude}, ${smsType.longitude}")
                        
                        val success = networkService.forwardDriverLocation(
                            busId = smsType.busId,
                            latitude = smsType.latitude,
                            longitude = smsType.longitude,
                            sender = sender,
                            timestamp = timestamp,
                            originalMessage = body
                        )
                        
                        if (success) {
                            logManager.addLog("Driver location forwarded: ${smsType.busId}")
                            config.incrementSmsCount()
                        } else {
                            logManager.addLog("Failed to forward driver location: ${smsType.busId}")
                        }
                    }
                    
                    is SmsType.PassengerQuery -> {
                        Log.d(TAG, "Passenger query SMS: ${smsType.busId}")
                        
                        val success = networkService.forwardPassengerQuery(
                            busId = smsType.busId,
                            sender = sender,
                            timestamp = timestamp,
                            originalMessage = body
                        )
                        
                        if (success) {
                            logManager.addLog("Passenger query forwarded: ${smsType.busId}")
                            config.incrementSmsCount()
                        } else {
                            logManager.addLog("Failed to forward passenger query: ${smsType.busId}")
                        }
                    }
                    
                    is SmsType.Unknown -> {
                        Log.d(TAG, "Unknown SMS format, forwarding raw: $body")
                        val success = networkService.forwardRawMessage(
                            sender = sender,
                            timestamp = timestamp,
                            message = body
                        )
                        if (success) {
                            logManager.addLog("Raw SMS forwarded for parsing")
                            config.incrementSmsCount()
                        } else {
                            logManager.addLog("Failed to forward raw SMS")
                        }
                    }
                }
                
            } catch (e: Exception) {
                Log.e(TAG, "Error processing individual SMS", e)
                logManager.addLog("Error processing SMS: ${e.message}")
            }
        }
    }
    
    private fun parseSmsContent(body: String): SmsType {
        val trimmedBody = body.trim()
        
        // Check for GPS format first: GPS:BUS001,lat,lng,speed,bearing,timestamp
        val gpsMatcher = GPS_LOCATION_PATTERN.matcher(trimmedBody)
        if (gpsMatcher.matches()) {
            val busId = gpsMatcher.group(1)!!
            val latitude = gpsMatcher.group(2)!!.toDouble()
            val longitude = gpsMatcher.group(3)!!.toDouble()
            return SmsType.DriverLocation(busId, latitude, longitude)
        }
        
        // Check for driver location pattern: BUS123:26.912345,75.123456
        val driverMatcher = DRIVER_LOCATION_PATTERN.matcher(trimmedBody)
        if (driverMatcher.matches()) {
            val busId = driverMatcher.group(1)!!
            val latitude = driverMatcher.group(2)!!.toDouble()
            val longitude = driverMatcher.group(3)!!.toDouble()
            return SmsType.DriverLocation(busId, latitude, longitude)
        }
        
        // Check for passenger query pattern: any message containing BUS123 but NOT starting with GPS:
        val passengerMatcher = PASSENGER_QUERY_PATTERN.matcher(trimmedBody)
        if (passengerMatcher.find()) {
            val busId = passengerMatcher.group(1)!!
            return SmsType.PassengerQuery(busId)
        }
        
        return SmsType.Unknown(trimmedBody)
    }
}

sealed class SmsType {
    data class DriverLocation(val busId: String, val latitude: Double, val longitude: Double) : SmsType()
    data class PassengerQuery(val busId: String) : SmsType()
    data class Unknown(val content: String) : SmsType()
}