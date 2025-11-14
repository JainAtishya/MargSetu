package com.margsetu.smsgateway

import android.content.Context
import android.util.Log
import com.google.gson.Gson
import com.google.gson.GsonBuilder
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.logging.HttpLoggingInterceptor
import java.io.IOException
import java.util.concurrent.TimeUnit
import kotlin.coroutines.resume
import kotlin.coroutines.suspendCoroutine

class NetworkService(private val context: Context) {
    
    companion object {
        private const val TAG = "NetworkService"
        private const val CONNECT_TIMEOUT = 30L
        private const val READ_TIMEOUT = 30L
        private const val WRITE_TIMEOUT = 30L
    }
    
    private val config = GatewayConfig.getInstance(context)
    private val gson: Gson = GsonBuilder().create()
    
    private val okHttpClient: OkHttpClient by lazy {
        val loggingInterceptor = HttpLoggingInterceptor { message ->
            Log.d(TAG, message)
        }.apply {
            level = HttpLoggingInterceptor.Level.BODY
        }
        
        OkHttpClient.Builder()
            .addInterceptor(loggingInterceptor)
            .connectTimeout(CONNECT_TIMEOUT, TimeUnit.SECONDS)
            .readTimeout(READ_TIMEOUT, TimeUnit.SECONDS)
            .writeTimeout(WRITE_TIMEOUT, TimeUnit.SECONDS)
            .build()
    }
    
    suspend fun forwardDriverLocation(
        busId: String,
        latitude: Double,
        longitude: Double,
        sender: String,
        timestamp: Long,
        originalMessage: String
    ): Boolean = suspendCoroutine { continuation ->
        
        val payload = mapOf(
            "type" to "driver_location",
            "busId" to busId,
            "latitude" to latitude,
            "longitude" to longitude,
            "sender" to sender,
            "timestamp" to timestamp,
            "originalMessage" to originalMessage,
            "receivedAt" to System.currentTimeMillis()
        )
        
        val jsonPayload = gson.toJson(payload)
        Log.d(TAG, "Forwarding driver location: $jsonPayload")
        
        val request = buildRequest(jsonPayload)
        
        okHttpClient.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                Log.e(TAG, "Failed to forward driver location", e)
                continuation.resume(false)
            }
            
            override fun onResponse(call: Call, response: Response) {
                val success = response.isSuccessful
                if (success) {
                    Log.d(TAG, "Driver location forwarded successfully: ${response.code}")
                } else {
                    Log.e(TAG, "Failed to forward driver location: ${response.code} - ${response.message}")
                }
                response.close()
                continuation.resume(success)
            }
        })
    }
    
    suspend fun forwardPassengerQuery(
        busId: String,
        sender: String,
        timestamp: Long,
        originalMessage: String
    ): Boolean = suspendCoroutine { continuation ->
        
        val payload = mapOf(
            "type" to "passenger_query",
            "busId" to busId,
            "sender" to sender,
            "timestamp" to timestamp,
            "originalMessage" to originalMessage,
            "receivedAt" to System.currentTimeMillis()
        )
        
        val jsonPayload = gson.toJson(payload)
        Log.d(TAG, "Forwarding passenger query: $jsonPayload")
        
        val request = buildRequest(jsonPayload)
        
        okHttpClient.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                Log.e(TAG, "Failed to forward passenger query", e)
                continuation.resume(false)
            }
            
            override fun onResponse(call: Call, response: Response) {
                val success = response.isSuccessful
                if (success) {
                    Log.d(TAG, "Passenger query forwarded successfully: ${response.code}")
                } else {
                    Log.e(TAG, "Failed to forward passenger query: ${response.code} - ${response.message}")
                }
                response.close()
                continuation.resume(success)
            }
        })
    }
    
    suspend fun testConnection(): Boolean = suspendCoroutine { continuation ->
        val payload = mapOf(
            "type" to "test",
            "timestamp" to System.currentTimeMillis(),
            "message" to "Gateway connection test",
            "from" to "android-gateway-app"
        )
        
        val jsonPayload = gson.toJson(payload)
        val webhookUrl = config.getWebhookUrl()
        Log.d(TAG, "Testing connection to: $webhookUrl")
        Log.d(TAG, "Test payload: $jsonPayload")
        Log.d(TAG, "API Key: ${config.apiKey}")
        
        val request = buildRequest(jsonPayload)
        Log.d(TAG, "Request URL: ${request.url}")
        Log.d(TAG, "Request headers: ${request.headers}")
        
        okHttpClient.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                Log.e(TAG, "Connection test failed - URL: $webhookUrl", e)
                Log.e(TAG, "Error type: ${e.javaClass.simpleName}")
                Log.e(TAG, "Error message: ${e.message}")
                continuation.resume(false)
            }
            
            override fun onResponse(call: Call, response: Response) {
                val success = response.isSuccessful
                val responseBody = response.body?.string()
                if (success) {
                    Log.d(TAG, "Connection test successful: ${response.code}")
                    Log.d(TAG, "Response: $responseBody")
                } else {
                    Log.e(TAG, "Connection test failed: ${response.code} - ${response.message}")
                    Log.e(TAG, "Response body: $responseBody")
                }
                response.close()
                continuation.resume(success)
            }
        })
    }
    
    private fun buildRequest(jsonPayload: String): Request {
        val mediaType = "application/json; charset=utf-8".toMediaType()
        val requestBody = jsonPayload.toRequestBody(mediaType)
        
        return Request.Builder()
            .url(config.getWebhookUrl())
            .post(requestBody)
            .addHeader("Content-Type", "application/json")
            .addHeader("x-gateway-api-key", config.apiKey)
            .addHeader("User-Agent", "MargSetu-SMS-Gateway/1.0")
            .build()
    }

    suspend fun forwardRawMessage(
        sender: String,
        timestamp: Long,
        message: String
    ): Boolean = suspendCoroutine { continuation ->
        val payload = mapOf(
            "type" to "sms_raw",
            "sender" to sender,
            "timestamp" to timestamp,
            "message" to message,
            "receivedAt" to System.currentTimeMillis()
        )

        val jsonPayload = gson.toJson(payload)
        Log.d(TAG, "Forwarding raw SMS: $jsonPayload")

        val request = buildRequest(jsonPayload)

        okHttpClient.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                Log.e(TAG, "Failed to forward raw SMS", e)
                continuation.resume(false)
            }

            override fun onResponse(call: Call, response: Response) {
                val success = response.isSuccessful
                if (success) {
                    Log.d(TAG, "Raw SMS forwarded successfully: ${response.code}")
                } else {
                    Log.e(TAG, "Failed to forward raw SMS: ${response.code} - ${response.message}")
                }
                response.close()
                continuation.resume(success)
            }
        })
    }
}