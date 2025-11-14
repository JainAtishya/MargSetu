package com.margsetu.smsgateway

import android.content.SharedPreferences
import android.content.Context

class GatewayConfig private constructor(context: Context) {
    
    private val prefs: SharedPreferences = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    
    companion object {
        private const val PREFS_NAME = "gateway_config"
        private const val KEY_SERVER_URL = "server_url"
        private const val KEY_API_KEY = "api_key"
        private const val KEY_GATEWAY_ENABLED = "gateway_enabled"
        private const val KEY_LAST_SMS_TIME = "last_sms_time"
        private const val KEY_TOTAL_SMS_COUNT = "total_sms_count"
        
        // Default values
        private const val DEFAULT_SERVER_URL = "https://vercel-backend-vert-psi.vercel.app"
        private const val DEFAULT_API_KEY = "margsetu-gateway-key-2024"
        
        @Volatile
        private var INSTANCE: GatewayConfig? = null
        
        fun getInstance(context: Context): GatewayConfig {
            return INSTANCE ?: synchronized(this) {
                INSTANCE ?: GatewayConfig(context.applicationContext).also { INSTANCE = it }
            }
        }
    }
    
    var serverUrl: String
        get() = prefs.getString(KEY_SERVER_URL, DEFAULT_SERVER_URL) ?: DEFAULT_SERVER_URL
        set(value) = prefs.edit().putString(KEY_SERVER_URL, value).apply()
    
    var apiKey: String
        get() = prefs.getString(KEY_API_KEY, DEFAULT_API_KEY) ?: DEFAULT_API_KEY
        set(value) = prefs.edit().putString(KEY_API_KEY, value).apply()
    
    var isGatewayEnabled: Boolean
        get() = prefs.getBoolean(KEY_GATEWAY_ENABLED, true)
        set(value) = prefs.edit().putBoolean(KEY_GATEWAY_ENABLED, value).apply()
    
    var lastSmsTime: Long
        get() = prefs.getLong(KEY_LAST_SMS_TIME, 0L)
        set(value) = prefs.edit().putLong(KEY_LAST_SMS_TIME, value).apply()
    
    var totalSmsCount: Int
        get() = prefs.getInt(KEY_TOTAL_SMS_COUNT, 0)
        set(value) = prefs.edit().putInt(KEY_TOTAL_SMS_COUNT, value).apply()
    
    fun getWebhookUrl(): String {
        return "${serverUrl.trimEnd('/')}/api/sms/webhook"
    }
    
    fun incrementSmsCount() {
        totalSmsCount += 1
        lastSmsTime = System.currentTimeMillis()
    }
    
    fun resetStats() {
        prefs.edit()
            .putInt(KEY_TOTAL_SMS_COUNT, 0)
            .putLong(KEY_LAST_SMS_TIME, 0L)
            .apply()
    }
    
    fun isConfigurationValid(): Boolean {
        return serverUrl.isNotBlank() && 
               apiKey.isNotBlank() && 
               (serverUrl.startsWith("http://") || serverUrl.startsWith("https://"))
    }
}