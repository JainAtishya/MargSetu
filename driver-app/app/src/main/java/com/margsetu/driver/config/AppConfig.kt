package com.margsetu.driver.config

import android.util.Log

object AppConfig {
    
    // Environment Configuration
    private const val USE_PRODUCTION = true // Set to true for production deployment
    
    // Server Configuration
    object Server {
        // Vercel Production Backend (Global Access) - Using alias URL without authentication
        private const val VERCEL_BASE_URL = "https://vercel-backend-vert-psi.vercel.app"
        
        // Local Development Backend (Network Dependent)
        private const val LOCAL_BASE_URL = "http://172.20.10.11:5000"
        
        // Choose base URL
        val BASE_URL = if (USE_PRODUCTION) VERCEL_BASE_URL else LOCAL_BASE_URL
        val API_BASE_URL = "$BASE_URL/api/"
        
        // Connection settings
        const val CONNECT_TIMEOUT = 15L // seconds
        const val READ_TIMEOUT = 15L    // seconds
        const val WRITE_TIMEOUT = 15L   // seconds
        
        fun logConfiguration() {
            Log.d("AppConfig", "🔧 Environment: ${if (USE_PRODUCTION) "PRODUCTION" else "DEVELOPMENT"}")
            Log.d("AppConfig", "🌐 Server: ${if (USE_PRODUCTION) "Vercel (HTTPS)" else "Local (HTTP)"}")
            Log.d("AppConfig", "📡 Base URL: $BASE_URL")
            Log.d("AppConfig", "🔗 API URL: $API_BASE_URL")
            Log.d("AppConfig", "🌍 Global Access: ${if (USE_PRODUCTION) "Yes (any network)" else "No (local network only)"}")
        }
    }
    
    // Location Tracking Configuration
    object Location {
        const val UPDATE_INTERVAL_MS = 10000L        // 10 seconds (optimized for Vercel rate limits)
        const val FASTEST_INTERVAL_MS = 5000L        // 5 seconds minimum
        const val MAX_UPDATE_DELAY_MS = 20000L       // 20 seconds maximum delay
        
        // Minimum distance for location updates (meters)
        const val MIN_DISPLACEMENT_METERS = 5.0f
        
        // Location accuracy threshold (meters)
        const val MIN_ACCURACY_METERS = 50.0f
    }
    
    // Rate Limiting (Client-side to match Vercel backend limits)
    object RateLimit {
        const val MAX_REQUESTS_PER_MINUTE = 6        // Matches Vercel backend rate limit
        const val REQUEST_COOLDOWN_MS = 10000L       // 10 seconds between requests
    }
    
    // Network Configuration
    object Network {
        const val ENABLE_LOGGING = true
        const val RETRY_COUNT = 3
        const val RETRY_DELAY_MS = 2000L
        
        // Fallback SMS settings
        const val SMS_GATEWAY_NUMBER = "7876935991"
        const val ENABLE_SMS_FALLBACK = true   // ENABLED: Send GPS to backend server via SMS when internet fails
    }
    
    // Security Configuration
    object Security {
        const val ENABLE_CERTIFICATE_PINNING = false // Disable for now, enable for production
        const val ENABLE_REQUEST_SIGNING = false     // Future security enhancement
        const val ENABLE_GPS_ENCRYPTION = false      // Future security enhancement
    }
    
    // Feature Flags
    object Features {
        const val ENABLE_MOCK_LOCATIONS = false      // Enable for testing without GPS
        const val ENABLE_BACKGROUND_SYNC = true      // Background location sync
        const val ENABLE_OFFLINE_MODE = true         // Store locations when offline
    }
    
    // Initialize configuration
    fun initialize() {
        Server.logConfiguration()
        Log.d("AppConfig", "📍 Location interval: ${Location.UPDATE_INTERVAL_MS}ms")
        Log.d("AppConfig", "⏱️ Rate limit: ${RateLimit.MAX_REQUESTS_PER_MINUTE} requests/minute")
        Log.d("AppConfig", "📱 SMS fallback: ${if (Network.ENABLE_SMS_FALLBACK) "Enabled" else "Disabled"}")
        Log.d("AppConfig", "🔒 Security features: ${if (Security.ENABLE_CERTIFICATE_PINNING) "Enhanced" else "Standard"}")
    }
}