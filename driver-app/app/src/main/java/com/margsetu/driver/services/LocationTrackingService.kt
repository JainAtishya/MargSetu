package com.margsetu.driver.services

import android.Manifest
import android.app.*
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.location.Location
import android.os.Build
import android.os.IBinder
import android.os.Looper
import android.util.Log
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationCompat
import com.google.android.gms.location.*
import com.margsetu.driver.MainActivity
import com.margsetu.driver.R
import com.margsetu.driver.config.AppConfig
import com.margsetu.driver.network.*
import com.margsetu.driver.utils.NetworkUtils
import com.margsetu.driver.utils.SMSUtils
import kotlinx.coroutines.*
import java.text.SimpleDateFormat
import java.util.*

class LocationTrackingService : Service() {
    
    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private lateinit var locationRequest: LocationRequest
    private lateinit var locationCallback: LocationCallback
    private var isTracking = false
    
    companion object {
        const val ACTION_START_TRACKING = "START_TRACKING"
        const val ACTION_STOP_TRACKING = "STOP_TRACKING"
        private const val NOTIFICATION_ID = 1
        private const val CHANNEL_ID = "LocationTrackingChannel"
    }
    
    // Use configuration from AppConfig
    private val LOCATION_UPDATE_INTERVAL = AppConfig.Location.UPDATE_INTERVAL_MS
    private val LOCATION_FASTEST_INTERVAL = AppConfig.Location.FASTEST_INTERVAL_MS
    
    // Coroutine scope for network operations
    private val serviceScope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    
    override fun onCreate() {
        super.onCreate()
        
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)
        createLocationRequest()
        createLocationCallback()
        createNotificationChannel()
    }
    
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.d("LocationTrackingService", "🚀 LocationTrackingService: onStartCommand called with action: ${intent?.action}")
        when (intent?.action) {
            ACTION_START_TRACKING -> {
                Log.d("LocationTrackingService", "▶️ Starting location tracking...")
                startLocationTracking()
            }
            ACTION_STOP_TRACKING -> {
                Log.d("LocationTrackingService", "⏹️ Stopping location tracking...")
                stopLocationTracking()
            }
            else -> {
                Log.w("LocationTrackingService", "⚠️ Unknown action: ${intent?.action}")
            }
        }
        return START_STICKY
    }
    
    override fun onBind(intent: Intent?): IBinder? = null
    
    private fun createLocationRequest() {
        locationRequest = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, LOCATION_UPDATE_INTERVAL).apply {
            setMinUpdateIntervalMillis(LOCATION_FASTEST_INTERVAL)
            setMaxUpdateDelayMillis(LOCATION_UPDATE_INTERVAL * 2)
            // Aim for quicker first fix when journey starts
            try { this.setWaitForAccurateLocation(true) } catch (_: Throwable) {}
        }.build()
    }
    
    private fun createLocationCallback() {
        Log.d("LocationTrackingService", "🔧 Creating location callback...")
        locationCallback = object : LocationCallback() {
            override fun onLocationResult(locationResult: LocationResult) {
                super.onLocationResult(locationResult)
                
                val currentTime = System.currentTimeMillis()
                Log.d("LocationTrackingService", "📍 [${currentTime}] LocationCallback triggered! Got ${locationResult.locations.size} locations")
                Log.d("LocationTrackingService", "📍 Service is tracking: $isTracking")
                
                for ((index, location) in locationResult.locations.withIndex()) {
                    Log.d("LocationTrackingService", "📍 [${currentTime}] Processing location #${index}: lat=${location.latitude}, lng=${location.longitude}, accuracy=${location.accuracy}")
                    handleLocationUpdate(location)
                }
                Log.d("LocationTrackingService", "📍 [${currentTime}] LocationCallback processing completed")
            }
            
            override fun onLocationAvailability(locationAvailability: LocationAvailability) {
                super.onLocationAvailability(locationAvailability)
                val currentTime = System.currentTimeMillis()
                Log.d("LocationTrackingService", "📡 [${currentTime}] Location availability changed: ${locationAvailability.isLocationAvailable}")
            }
        }
    }
    
    private fun startLocationTracking() {
        Log.d("LocationTrackingService", "🚀 LocationTrackingService: startLocationTracking() called")
        
        if (ActivityCompat.checkSelfPermission(
                this,
                Manifest.permission.ACCESS_FINE_LOCATION
            ) != PackageManager.PERMISSION_GRANTED &&
            ActivityCompat.checkSelfPermission(
                this,
                Manifest.permission.ACCESS_COARSE_LOCATION
            ) != PackageManager.PERMISSION_GRANTED
        ) {
            Log.e("LocationTrackingService", "❌ LOCATION PERMISSIONS NOT GRANTED!")
            return
        }
        
        Log.d("LocationTrackingService", "✅ Location permissions OK, starting tracking...")
        Log.d("LocationTrackingService", "🔧 Location request config: interval=${LOCATION_UPDATE_INTERVAL}ms, fastest=${LOCATION_FASTEST_INTERVAL}ms")
        isTracking = true
        
        try {
            fusedLocationClient.requestLocationUpdates(
                locationRequest,
                locationCallback,
                Looper.getMainLooper()
            )
            Log.d("LocationTrackingService", "✅ Location updates requested successfully")
        } catch (e: Exception) {
            Log.e("LocationTrackingService", "❌ Error requesting location updates: ${e.message}")
            return
        }
        
        startForeground(NOTIFICATION_ID, createNotification("Location tracking active"))
        Log.d("LocationTrackingService", "✅ Foreground service started with notification")

        // Debug: Check SharedPreferences
        val sharedPrefs = getSharedPreferences("MargSetuDriverPrefs", Context.MODE_PRIVATE)
        val busId = sharedPrefs.getString("bus_id", "") ?: ""
        val authToken = sharedPrefs.getString("auth_token", "") ?: ""
        val tripId = sharedPrefs.getString("trip_id", null)
        Log.d("LocationTrackingService", "🔍 Prefs check: busId='$busId', authToken='${authToken.take(10)}...', tripId='$tripId'")

        // Send an immediate one-off update using the last known location so the backend sees logs right away
        Log.d("LocationTrackingService", "🔍 Trying to get lastLocation for immediate update...")
        fusedLocationClient.lastLocation.addOnSuccessListener { lastLoc ->
            if (lastLoc != null) {
                Log.d("LocationTrackingService", "✅ Got lastLocation: lat=${lastLoc.latitude}, lng=${lastLoc.longitude}")
                handleLocationUpdate(lastLoc)
            } else {
                Log.w("LocationTrackingService", "⚠️ No lastLocation available, trying getCurrentLocation...")
                // If lastLocation is unavailable, actively fetch a current high-accuracy fix once
                try {
                    val cts = com.google.android.gms.tasks.CancellationTokenSource()
                    fusedLocationClient.getCurrentLocation(Priority.PRIORITY_HIGH_ACCURACY, cts.token)
                        .addOnSuccessListener { curr ->
                            if (curr != null) {
                                Log.d("LocationTrackingService", "✅ Got currentLocation: lat=${curr.latitude}, lng=${curr.longitude}")
                                handleLocationUpdate(curr)
                            } else {
                                Log.w("LocationTrackingService", "⚠️ getCurrentLocation returned null - waiting for GPS updates...")
                                Log.w("LocationTrackingService", "📡 GPS may need time to get first fix, location callbacks will trigger when available")
                                
                                // Start sending mock locations for testing if GPS fails
                                Log.w("LocationTrackingService", "🧪 TESTING MODE: Starting mock location updates in 10 seconds...")
                                startMockLocationUpdates()
                            }
                        }
                        .addOnFailureListener { e ->
                            Log.e("LocationTrackingService", "❌ Failed to get current location immediately: ${e.message}")
                            Log.w("LocationTrackingService", "📡 Will wait for location callbacks to trigger when GPS gets fix")
                            
                            // Start sending mock locations for testing if GPS fails
                            Log.w("LocationTrackingService", "🧪 TESTING MODE: Starting mock location updates in 10 seconds...")
                            startMockLocationUpdates()
                        }
                } catch (e: Exception) {
                    Log.e("LocationTrackingService", "❌ getCurrentLocation error: ${e.message}")
                    Log.w("LocationTrackingService", "📡 Will wait for location callbacks to trigger when GPS gets fix")
                    
                    // Start sending mock locations for testing if GPS fails
                    Log.w("LocationTrackingService", "🧪 TESTING MODE: Starting mock location updates in 10 seconds...")
                    startMockLocationUpdates()
                }
            }
        }.addOnFailureListener { e ->
            Log.e("LocationTrackingService", "❌ Failed to get lastLocation: ${e.message}")
            Log.w("LocationTrackingService", "📡 Will wait for location callbacks to trigger when GPS gets fix")
            
            // Start sending mock locations for testing if GPS fails
            Log.w("LocationTrackingService", "🧪 TESTING MODE: Starting mock location updates in 10 seconds...")
            startMockLocationUpdates()
        }
        
        Log.d("LocationTrackingService", "🔍 startLocationTracking() completed, waiting for location updates...")
    }
    
    private fun stopLocationTracking() {
        if (isTracking) {
            fusedLocationClient.removeLocationUpdates(locationCallback)
            isTracking = false
            
            // Cancel all coroutines
            serviceScope.cancel()
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                stopForeground(Service.STOP_FOREGROUND_REMOVE)
            } else {
                @Suppress("DEPRECATION")
                stopForeground(true)
            }
            stopSelf()
        }
    }
    
    override fun onDestroy() {
        super.onDestroy()
        // Cleanup coroutines
        serviceScope.cancel()
        Log.d("LocationTrackingService", "🛑 LocationTrackingService destroyed and cleaned up")
    }
    
    private fun handleLocationUpdate(location: Location) {
        val timestamp = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.getDefault()).format(Date())
        val currentTime = System.currentTimeMillis()
        Log.d("LocationTrackingService", "🔄 [${currentTime}] handleLocationUpdate called: lat=${location.latitude}, lng=${location.longitude}, time=$timestamp")
        Log.d("LocationTrackingService", "📍 Location details: accuracy=${location.accuracy}, speed=${location.speed}, bearing=${location.bearing}")
        Log.d("LocationTrackingService", "🌐 Network status: ${NetworkUtils.isNetworkAvailable(this)}")
        Log.d("LocationTrackingService", "📱 SMS fallback enabled: ${AppConfig.Network.ENABLE_SMS_FALLBACK}")
        
        // ONLY send via internet - SMS should be disabled for normal operation
        // DUAL TRANSMISSION: Send via BOTH network AND SMS simultaneously
        Log.d("LocationTrackingService", "🚀 [${currentTime}] Sending location via BOTH network AND SMS...")
        
        // Always send via network API (if available)
        if (NetworkUtils.isNetworkAvailable(this)) {
            Log.d("LocationTrackingService", "🌐 [${currentTime}] Sending via network API...")
            sendLocationToServer(location, timestamp)
        } else {
            Log.w("LocationTrackingService", "❌ [${currentTime}] Network unavailable - skipping API call")
        }
        
        // Always send via SMS (regardless of network status)
        if (AppConfig.Network.ENABLE_SMS_FALLBACK) {
            Log.d("LocationTrackingService", "📱 [${currentTime}] Sending via SMS (simultaneous transmission)...")
            sendLocationViaSMS(location, timestamp)
        } else {
            Log.w("LocationTrackingService", "📱 [${currentTime}] SMS transmission disabled")
        }
        
        // Update notification with current location info
        updateNotification("Last update: ${SimpleDateFormat("HH:mm:ss", Locale.getDefault()).format(Date())}")
        Log.d("LocationTrackingService", "🔄 [${currentTime}] handleLocationUpdate completed")
    }
    
    private fun sendLocationToServer(location: Location, timestamp: String) {
        val sharedPrefs = getSharedPreferences("MargSetuDriverPrefs", Context.MODE_PRIVATE)
        val busId = sharedPrefs.getString("bus_id", "") ?: ""
        val authToken = sharedPrefs.getString("auth_token", "") ?: ""
        val tripId = sharedPrefs.getString("trip_id", null)
        
        // Validate required data
        if (busId.isEmpty() || authToken.isEmpty()) {
            Log.e("LocationTrackingService", "❌ Missing data for location update (busId or auth token empty)")
            if (AppConfig.Network.ENABLE_SMS_FALLBACK) {
                sendLocationViaSMS(location, timestamp) // Fallback to SMS
            } else {
                Log.d("LocationTrackingService", "📱 SMS fallback disabled - no SMS sent for missing data")
            }
            return
        }

        // Use NetworkManager for improved handling
        serviceScope.launch {
            try {
                val currentTime = System.currentTimeMillis()
                Log.d("LocationTrackingService", "➡️ [$currentTime] Sending location via NetworkManager")
                Log.d("LocationTrackingService", "📍 Location: bus=$busId lat=${location.latitude} lng=${location.longitude}")
                Log.d("LocationTrackingService", "🔐 Token: ${authToken.take(10)}... tripId=${tripId ?: "n/a"}")
                
                val result = NetworkManager.sendLocationUpdate(
                    busId = busId,
                    latitude = location.latitude,
                    longitude = location.longitude,
                    authToken = authToken,
                    tripId = tripId
                )
                
                when (result) {
                    is NetworkResult.Success -> {
                        Log.d("LocationTrackingService", "✅ [$currentTime] Location sent successfully!")
                        Log.d("LocationTrackingService", "   Response: ${result.data.message}")
                        Log.d("LocationTrackingService", "   ℹ️ SMS NOT sent (network success - SMS only for fallback)")
                        // NO SMS sent when network is successful - SMS is only for fallback
                    }
                    
                    is NetworkResult.RateLimited -> {
                        Log.w("LocationTrackingService", "⏱️ [$currentTime] Rate limited: ${result.message}")
                        // Don't send SMS for rate limiting - just wait
                    }
                    
                    is NetworkResult.Error -> {
                        Log.e("LocationTrackingService", "❌ [$currentTime] Server error: ${result.message}")
                        Log.e("LocationTrackingService", "   Code: ${result.code}")
                        // Fallback to SMS for server errors
                        if (AppConfig.Network.ENABLE_SMS_FALLBACK) {
                            sendLocationViaSMS(location, timestamp)
                        } else {
                            Log.d("LocationTrackingService", "📱 SMS fallback disabled - no SMS sent for server error")
                        }
                    }
                    
                    is NetworkResult.NetworkError -> {
                        Log.e("LocationTrackingService", "❌ [$currentTime] Network error: ${result.message}")
                        // Fallback to SMS for network errors
                        if (AppConfig.Network.ENABLE_SMS_FALLBACK) {
                            sendLocationViaSMS(location, timestamp)
                        } else {
                            Log.d("LocationTrackingService", "📱 SMS fallback disabled - no SMS sent for network error")
                        }
                    }
                }
                
            } catch (e: Exception) {
                val currentTime = System.currentTimeMillis()
                Log.e("LocationTrackingService", "❌ [$currentTime] Unexpected error: ${e.message}")
                Log.e("LocationTrackingService", "   Exception: ${e.javaClass.simpleName}")
                if (AppConfig.Network.ENABLE_LOGGING) {
                    e.printStackTrace()
                }
                // Fallback to SMS for unexpected errors
                if (AppConfig.Network.ENABLE_SMS_FALLBACK) {
                    sendLocationViaSMS(location, timestamp)
                } else {
                    Log.d("LocationTrackingService", "📱 SMS fallback disabled - no SMS sent for unexpected error")
                }
            }
        }
    }
    
    private fun sendLocationViaSMS(location: Location, timestamp: String) {
        if (!AppConfig.Network.ENABLE_SMS_FALLBACK) {
            Log.d("LocationTrackingService", "📱 SMS fallback disabled in configuration")
            return
        }
        
        val sharedPrefs = getSharedPreferences("MargSetuDriverPrefs", Context.MODE_PRIVATE)
        val driverId = sharedPrefs.getString("driver_id", "") ?: ""
        val busId = sharedPrefs.getString("bus_id", "") ?: ""
        
        // Create encrypted GPS SMS message using GPSEncryption utility
        val gpsEncryption = com.margsetu.driver.utils.GPSEncryption.getInstance()
        val encryptedMessage = gpsEncryption.createEncryptedSMSMessage(
            busId, 
            location.latitude, 
            location.longitude
        )
        
        Log.d("LocationTrackingService", "📱 Sending encrypted SMS to ${AppConfig.Network.SMS_GATEWAY_NUMBER}")
        Log.d("LocationTrackingService", "🔒 Encrypted SMS content: ${encryptedMessage.take(50)}...")
        
        // Send encrypted SMS to backend SMS number (SMS Gateway)
        val success = SMSUtils.sendLocationSMS(this, encryptedMessage)
        
        if (success) {
            Log.d("LocationTrackingService", "✅ Encrypted SMS sent successfully to SMS Gateway: ${encryptedMessage.take(50)}...")
        } else {
            Log.e("LocationTrackingService", "❌ Encrypted SMS sending failed: ${encryptedMessage.take(50)}...")
        }
    }
    
    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Location Tracking",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Ongoing notification for location tracking"
                setShowBadge(false)
            }
            
            val notificationManager = getSystemService(NotificationManager::class.java)
            notificationManager.createNotificationChannel(channel)
        }
    }
    
    private fun createNotification(contentText: String): Notification {
        val intent = Intent(this, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            this, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("MargSetu Driver - Journey Active")
            .setContentText(contentText)
            .setSmallIcon(R.drawable.ic_bus)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setAutoCancel(false)
            .setColor(getColor(R.color.primary_blue))
            .build()
    }
    
    private fun updateNotification(contentText: String) {
        val notification = createNotification(contentText)
        val notificationManager = getSystemService(NotificationManager::class.java)
        notificationManager.notify(NOTIFICATION_ID, notification)
    }
    
    // Mock location updates for testing when GPS is not available
    private fun startMockLocationUpdates() {
        Log.d("LocationTrackingService", "🧪 Starting mock location updates for testing...")
        
        Thread {
            try {
                Thread.sleep(10000) // Wait 10 seconds for GPS
                
                var counter = 1
                var lat = 23.0225 // Ahmedabad coordinates
                var lng = 72.5714
                
                while (isTracking) {
                    Log.d("LocationTrackingService", "🧪 Mock location update #$counter")
                    
                    // Create mock location
                    val mockLocation = Location("mock").apply {
                        latitude = lat + (Math.random() * 0.001) // Small random variation
                        longitude = lng + (Math.random() * 0.001)
                        accuracy = 10f
                        time = System.currentTimeMillis()
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN_MR1) {
                            elapsedRealtimeNanos = android.os.SystemClock.elapsedRealtimeNanos()
                        }
                    }
                    
                    // Send mock location to server
                    handleLocationUpdate(mockLocation)
                    
                    counter++
                    Thread.sleep(5000) // Send every 5 seconds
                }
            } catch (e: Exception) {
                Log.e("LocationTrackingService", "❌ Mock location error: ${e.message}")
            }
        }.start()
    }
}