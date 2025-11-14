package com.margsetu.driver

import android.Manifest
import android.content.Intent
import android.content.SharedPreferences
import android.content.pm.PackageManager
import android.os.Bundle
import android.util.Log
import android.view.View
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationServices
import com.margsetu.driver.databinding.ActivityMainBinding
import com.margsetu.driver.network.ApiClient
import com.margsetu.driver.network.LocationUpdateRequest
import com.margsetu.driver.utils.SMSUtils
import com.margsetu.driver.config.AppConfig
import com.margsetu.driver.network.SOSRequest
import com.margsetu.driver.services.LocationTrackingService
import com.margsetu.driver.utils.LanguageUtils
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*

class MainActivity : AppCompatActivity() {
    
    private lateinit var binding: ActivityMainBinding
    private lateinit var sharedPreferences: SharedPreferences
    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private var isJourneyActive = false
    private var lastUpdateTime: String = "Never"
    
    companion object {
        private const val PREFS_NAME = "MargSetuDriverPrefs"
        private const val PREF_DRIVER_ID = "driver_id"
        private const val PREF_BUS_ID = "bus_id"
        private const val PREF_IS_LOGGED_IN = "is_logged_in"
        private const val PREF_JOURNEY_ACTIVE = "journey_active"
        private const val PREF_TRIP_ID = "trip_id"
        
        private const val REQUEST_LOCATION_PERMISSIONS = 100
        private const val REQUEST_SMS_PERMISSION = 101
        private const val REQUEST_NOTIFICATION_PERMISSION = 102
        private const val REQUEST_BACKGROUND_LOCATION_PERMISSION = 103
    }
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        Log.d("MainActivity", "🚀 MainActivity onCreate() called")
        Toast.makeText(this, "App starting - check logs for debug info", Toast.LENGTH_LONG).show()
        
        // Apply saved language before setting content view
        val savedLanguage = LanguageUtils.getAppLanguage(this)
        LanguageUtils.updateAppLocale(this, savedLanguage)
        
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)
        
        sharedPreferences = getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)
        
        // Debug: Check auth data
        val authToken = sharedPreferences.getString("auth_token", "")
        val driverId = sharedPreferences.getString(PREF_DRIVER_ID, "")
        val busId = sharedPreferences.getString(PREF_BUS_ID, "")
        val isLoggedIn = sharedPreferences.getBoolean(PREF_IS_LOGGED_IN, false)
        
        Log.d("MainActivity", "🔍 Auth data check:")
        Log.d("MainActivity", "   - authToken exists: ${!authToken.isNullOrEmpty()}")
        Log.d("MainActivity", "   - driverId: $driverId")  
        Log.d("MainActivity", "   - busId: $busId")
        Log.d("MainActivity", "   - isLoggedIn: $isLoggedIn")
        
        // Check if user is logged in
        if (!isUserLoggedIn()) {
            Log.w("MainActivity", "❌ User not logged in, navigating to login")
            navigateToLogin()
            return
        }
        
        Log.d("MainActivity", "✅ User is logged in, setting up UI...")
        setupUI()
        updateUI()
        requestPermissions()
    }
    
    override fun onResume() {
        super.onResume()
        updateUI()
        updateStatusIndicators()
    }
    
    private fun setupUI() {
        val driverId = sharedPreferences.getString(PREF_DRIVER_ID, "Unknown")
        val busId = sharedPreferences.getString(PREF_BUS_ID, "Unknown")
        isJourneyActive = sharedPreferences.getBoolean(PREF_JOURNEY_ACTIVE, false)
        
        Log.d("MainActivity", "🔧 setupUI() - driverId=$driverId, busId=$busId")
        Log.d("MainActivity", "🔧 setupUI() - isJourneyActive from SharedPrefs = $isJourneyActive")
        
        binding.tvDriverInfo.text = getString(R.string.driver_info, driverId)
        binding.tvBusInfo.text = getString(R.string.bus_info, busId)
        
        binding.btnJourneyToggle.setOnClickListener {
            Log.d("MainActivity", "🔘 Journey toggle button CLICKED!")
            Toast.makeText(this, "BUTTON CLICKED - Check logs!", Toast.LENGTH_SHORT).show()
            toggleJourney()
        }
        
        binding.btnSos.setOnClickListener {
            showSOSConfirmationDialog()
        }
        
        binding.btnLogout.setOnClickListener {
            showLogoutConfirmationDialog()
        }
        
        // Language selection button
        binding.btnLanguage.setOnClickListener {
            showLanguageSelectionDialog()
        }
        
        updateJourneyButton()
        
        Log.d("MainActivity", "🔧 setupUI() completed, button text should be updated")
    }
    
    private fun toggleJourney() {
        Log.d("MainActivity", "🔘 BUTTON CLICKED! toggleJourney() called")
        
        // Also write to internal storage for debugging
        try {
            val debugFile = java.io.File(getExternalFilesDir(null), "debug_log.txt")
            debugFile.appendText("${java.util.Date()}: BUTTON CLICKED! toggleJourney() called\n")
        } catch (e: Exception) { /* ignore */ }
        
        Log.d("MainActivity", "🔍 Current isJourneyActive = $isJourneyActive")
        
        if (isJourneyActive) {
            Log.d("MainActivity", "🛑 Journey is active, calling stopJourney()")
            try {
                val debugFile = java.io.File(getExternalFilesDir(null), "debug_log.txt")
                debugFile.appendText("${java.util.Date()}: Journey is active, calling stopJourney()\n")
            } catch (e: Exception) { /* ignore */ }
            stopJourney()
        } else {
            Log.d("MainActivity", "▶️ Journey is NOT active, calling startJourney()")
            try {
                val debugFile = java.io.File(getExternalFilesDir(null), "debug_log.txt")
                debugFile.appendText("${java.util.Date()}: Journey is NOT active, calling startJourney()\n")
            } catch (e: Exception) { /* ignore */ }
            startJourney()
        }
    }
    
    private fun startJourney() {
        Log.d("MainActivity", "🚀 startJourney() called")
        
        if (!hasLocationPermissions()) {
            Log.w("MainActivity", "❌ No location permissions, requesting...")
            requestLocationPermissions()
            return
        }
        
        // Check for background location permission
        if (!hasBackgroundLocationPermission() && android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q) {
            Log.d("MainActivity", "ℹ️ Requesting background location permission...")
            AlertDialog.Builder(this)
                .setTitle("Background Location Needed")
                .setMessage("For continuous tracking, please grant background location permission. This ensures tracking continues even when the app is minimized.")
                .setPositiveButton("Grant Permission") { _, _ ->
                    requestBackgroundLocationPermission()
                }
                .setNegativeButton("Continue Anyway") { _, _ ->
                    proceedWithJourneyStart()
                }
                .show()
            return
        }
        
        proceedWithJourneyStart()
    }
    
    private fun proceedWithJourneyStart() {
        Log.d("MainActivity", "🚀 MainActivity: proceedWithJourneyStart() called")
        showLoading(true)
        
        // Try to fetch or create a tripId first
        val authToken = sharedPreferences.getString("auth_token", "")
        val busId = sharedPreferences.getString(PREF_BUS_ID, "") ?: ""
        Log.d("MainActivity", "🔍 MainActivity: authToken='${authToken?.take(10)}...', busId='$busId'")
        
        if (!authToken.isNullOrEmpty() && busId.isNotEmpty()) {
            Log.d("MainActivity", "✅ Have auth data, fetching tripId...")
            lifecycleScope.launch {
                try {
                    Log.d("MainActivity", "🔍 Calling getTripId API...")
                    val resp = ApiClient.apiService.getTripId("Bearer $authToken", com.margsetu.driver.network.TripIdRequest(busId))
                    if (resp.isSuccessful && resp.body()?.success == true) {
                        val tid = resp.body()?.data?.tripId
                        if (!tid.isNullOrBlank()) {
                            Log.d("MainActivity", "✅ Got tripId: $tid")
                            sharedPreferences.edit().putString(PREF_TRIP_ID, tid).apply()
                        } else {
                            Log.d("MainActivity", "⚠️ API returned empty tripId")
                        }
                    } else {
                        Log.e("MainActivity", "❌ getTripId API failed: ${resp.code()} ${resp.message()}")
                    }
                } catch (e: Exception) { 
                    Log.e("MainActivity", "❌ Exception calling getTripId: ${e.message}")
                }
                startTrackingService()
            }
            return
        } else {
            Log.w("MainActivity", "⚠️ Missing auth data, proceeding without tripId fetch")
        }

        startTrackingService()
    }

    private fun startTrackingService() {
        Log.d("MainActivity", "🚀 MainActivity: Starting LocationTrackingService...")
        // Start location tracking service
        val intent = Intent(this, LocationTrackingService::class.java)
        intent.action = LocationTrackingService.ACTION_START_TRACKING
        
        // Debug: Check if we have the required data
        val busId = sharedPreferences.getString(PREF_BUS_ID, "") ?: ""
        val authToken = sharedPreferences.getString("auth_token", "") ?: ""
        val tripId = sharedPreferences.getString(PREF_TRIP_ID, null)
        Log.d("MainActivity", "🔍 MainActivity: About to start service with busId='$busId', authToken='${authToken.take(10)}...', tripId='$tripId'")
        
        try {
            startForegroundService(intent)
            Log.d("MainActivity", "✅ LocationTrackingService started successfully")
        } catch (e: Exception) {
            Log.e("MainActivity", "❌ Failed to start LocationTrackingService: ${e.message}")
        }
        
        isJourneyActive = true
        sharedPreferences.edit().putBoolean(PREF_JOURNEY_ACTIVE, true).apply()
        
        updateJourneyButton()
        updateStatusIndicators()
        showLoading(false)
        
        Toast.makeText(this, "Journey started", Toast.LENGTH_SHORT).show()
    }
    
    private fun stopJourney() {
        showLoading(true)
        
        // Stop location tracking service
        val intent = Intent(this, LocationTrackingService::class.java)
        intent.action = LocationTrackingService.ACTION_STOP_TRACKING
        startService(intent)
        
        isJourneyActive = false
        sharedPreferences.edit().putBoolean(PREF_JOURNEY_ACTIVE, false).apply()
        
        updateJourneyButton()
        updateStatusIndicators()
        showLoading(false)
        
        Toast.makeText(this, "Journey stopped", Toast.LENGTH_SHORT).show()
    }
    
    private fun updateJourneyButton() {
        if (isJourneyActive) {
            binding.btnJourneyToggle.text = getString(R.string.stop_journey)
            binding.btnJourneyToggle.setIconResource(R.drawable.ic_stop)
            binding.btnJourneyToggle.setBackgroundColor(getColor(R.color.warning_orange))
        } else {
            binding.btnJourneyToggle.text = getString(R.string.start_journey)
            binding.btnJourneyToggle.setIconResource(R.drawable.ic_play)
            binding.btnJourneyToggle.setBackgroundColor(getColor(R.color.primary_blue))
        }
    }
    
    private fun updateUI() {
        updateJourneyStatus()
        updateStatusIndicators()
    }
    
    private fun updateJourneyStatus() {
        if (isJourneyActive) {
            binding.tvJourneyStatus.text = getString(R.string.journey_active)
            binding.tvJourneyStatus.setTextColor(getColor(R.color.success_green))
            binding.tvJourneyStatus.setCompoundDrawablesWithIntrinsicBounds(R.drawable.ic_status_online, 0, 0, 0)
        } else {
            binding.tvJourneyStatus.text = getString(R.string.journey_inactive)
            binding.tvJourneyStatus.setTextColor(getColor(R.color.warning_orange))
            binding.tvJourneyStatus.setCompoundDrawablesWithIntrinsicBounds(R.drawable.ic_status_offline, 0, 0, 0)
        }
    }
    
    private fun updateStatusIndicators() {
        // Update GPS Status
        if (hasLocationPermissions() && isLocationEnabled()) {
            binding.tvGpsStatus.text = getString(R.string.gps_enabled)
            binding.tvGpsStatus.setTextColor(getColor(R.color.success_green))
            binding.tvGpsStatus.setCompoundDrawablesWithIntrinsicBounds(R.drawable.ic_gps_on, 0, 0, 0)
        } else {
            binding.tvGpsStatus.text = getString(R.string.gps_disabled)
            binding.tvGpsStatus.setTextColor(getColor(R.color.error_red))
            binding.tvGpsStatus.setCompoundDrawablesWithIntrinsicBounds(R.drawable.ic_gps_off, 0, 0, 0)
        }
        
        // Update Network Status (simplified for now)
        binding.tvNetworkStatus.text = getString(R.string.status_online)
        binding.tvNetworkStatus.setTextColor(getColor(R.color.success_green))
        binding.tvNetworkStatus.setCompoundDrawablesWithIntrinsicBounds(R.drawable.ic_network_on, 0, 0, 0)
        
        // Update Location Updates Status
        if (isJourneyActive) {
            binding.tvLocationUpdates.text = getString(R.string.location_sending)
            binding.tvLocationUpdates.setTextColor(getColor(R.color.success_green))
            binding.tvLocationUpdates.setCompoundDrawablesWithIntrinsicBounds(R.drawable.ic_location_on, 0, 0, 0)
            
            // Update last update time
            val currentTime = SimpleDateFormat("HH:mm:ss", Locale.getDefault()).format(Date())
            binding.tvLastUpdate.text = currentTime
        } else {
            binding.tvLocationUpdates.text = getString(R.string.location_stopped)
            binding.tvLocationUpdates.setTextColor(getColor(R.color.warning_orange))
            binding.tvLocationUpdates.setCompoundDrawablesWithIntrinsicBounds(R.drawable.ic_location_off, 0, 0, 0)
            
            binding.tvLastUpdate.text = lastUpdateTime
        }
    }
    
    private fun showSOSConfirmationDialog() {
        AlertDialog.Builder(this)
            .setTitle(getString(R.string.sos_title))
            .setMessage(getString(R.string.sos_message))
            .setPositiveButton(getString(R.string.sos_confirm)) { _, _ ->
                sendSOSAlert()
            }
            .setNegativeButton(getString(R.string.sos_cancel), null)
            .setIcon(R.drawable.ic_emergency)
            .show()
    }
    
    private fun sendSOSAlert() {
        showLoading(true)
        
        val driverId = sharedPreferences.getString(PREF_DRIVER_ID, "") ?: ""
        val busId = sharedPreferences.getString(PREF_BUS_ID, "") ?: ""
        
        // Get current location if available
        if (hasLocationPermissions()) {
            fusedLocationClient.lastLocation.addOnSuccessListener { location ->
                if (location != null) {
                    sendSOSToBackend(driverId, busId, location.latitude, location.longitude)
                } else {
                    sendSOSToBackend(driverId, busId, 0.0, 0.0)
                }
            }.addOnFailureListener {
                sendSOSToBackend(driverId, busId, 0.0, 0.0)
            }
        } else {
            sendSOSToBackend(driverId, busId, 0.0, 0.0)
        }
    }
    
    private fun sendSOSToBackend(driverId: String, busId: String, latitude: Double, longitude: Double) {
        lifecycleScope.launch {
            try {
                val authToken = sharedPreferences.getString("auth_token", "") ?: ""
                
                if (authToken.isEmpty()) {
                    showLoading(false)
                    Toast.makeText(this@MainActivity, "🚨 [EMG] No auth token found. Please login again.", Toast.LENGTH_LONG).show()
                    Log.e("MainActivity", "🚨 [EMG] SOS failed: No auth token available")
                    return@launch
                }
                
                val currentTime = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.getDefault()).format(Date())
                val sosRequest = SOSRequest(
                    driverId = driverId,
                    busId = busId,
                    latitude = latitude,
                    longitude = longitude,
                    timestamp = currentTime,
                    message = "Emergency alert from driver"
                )
                
                Log.d("MainActivity", "🚨 [EMG] Sending SOS with auth token: Bearer ${authToken.take(10)}...")
                Log.d("MainActivity", "🚨 [EMG] SOS Request - Driver: $driverId, Bus: $busId")
                Log.d("MainActivity", "🚨 [EMG] SOS Request - Location: $latitude, $longitude")
                val response = ApiClient.apiService.sendSOSAlert("Bearer $authToken", sosRequest)
                showLoading(false)
                
                Log.d("MainActivity", "🚨 [EMG] SOS Response - HTTP Success: ${response.isSuccessful}")
                Log.d("MainActivity", "🚨 [EMG] SOS Response - Code: ${response.code()}")
                Log.d("MainActivity", "🚨 [EMG] SOS Response - Body: ${response.body()}")
                Log.d("MainActivity", "🚨 [EMG] SOS Response - Body Success: ${response.body()?.success}")
                
                if (response.isSuccessful) {
                    val responseBody = response.body()
                    if (responseBody?.success == true) {
                        Toast.makeText(this@MainActivity, getString(R.string.sos_sent), Toast.LENGTH_LONG).show()
                        Log.d("MainActivity", "🚨 [EMG] SOS sent successfully - Alert ID: ${responseBody.alertId}")
                    } else {
                        // HTTP 200 but success=false
                        Toast.makeText(this@MainActivity, getString(R.string.sos_sent), Toast.LENGTH_LONG).show()
                        Log.d("MainActivity", "🚨 [EMG] SOS HTTP OK but backend reported issue: ${responseBody?.message}")
                    }
                } else {
                    Toast.makeText(this@MainActivity, getString(R.string.sos_failed), Toast.LENGTH_LONG).show()
                    Log.e("MainActivity", "🚨 [EMG] SOS HTTP failed: ${response.code()} - ${response.message()}")
                }
            } catch (e: Exception) {
                showLoading(false)
                Toast.makeText(this@MainActivity, "SOS failed: Network error", Toast.LENGTH_LONG).show()
                Log.e("MainActivity", "🚨 [EMG] SOS network error: ${e.message}", e)
            }
        }
    }
    
    // Method to send location updates to backend
    private fun sendLocationUpdate(latitude: Double, longitude: Double, accuracy: Float, speed: Float) {
        lifecycleScope.launch {
            try {
                val busId = sharedPreferences.getString(PREF_BUS_ID, "") ?: ""
                val authToken = sharedPreferences.getString("auth_token", "")
                val currentTime = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.getDefault()).format(Date())
                
                if (authToken.isNullOrEmpty()) {
                    Log.e("MainActivity", "No authentication token available")
                    return@launch
                }
                
                val locationRequest = LocationUpdateRequest(
                    busId = busId,
                    latitude = latitude,
                    longitude = longitude,
                    accuracy = accuracy,
                    speed = speed,
                    heading = 0f, // Add heading if available from GPS
                    tripId = sharedPreferences.getString(PREF_TRIP_ID, null)
                    // Removed timestamp parameter as backend validation doesn't accept it
                )
                
                val response = ApiClient.apiService.updateLocation("Bearer $authToken", locationRequest)
                
                if (response.isSuccessful && response.body()?.success == true) {
                    lastUpdateTime = SimpleDateFormat("HH:mm:ss", Locale.getDefault()).format(Date())
                    Log.d("MainActivity", "Location update sent successfully at $lastUpdateTime")
                    // Update UI to show online status
                    binding.tvNetworkStatus.text = "ONLINE + SMS (PROTOTYPE)"
                    binding.tvNetworkStatus.setTextColor(getColor(R.color.success_green))
                } else {
                    Log.e("MainActivity", "Location update failed: ${response.body()?.message}")
                    // Update UI to show API failed status
                    binding.tvNetworkStatus.text = "API FAILED - SMS ONLY"
                    binding.tvNetworkStatus.setTextColor(getColor(R.color.warning_orange))
                    
                    // Only send SMS when API fails
                    if (AppConfig.Network.ENABLE_SMS_FALLBACK) {
                        sendLocationViaSMS(latitude, longitude, speed)
                    } else {
                        Log.d("MainActivity", "📱 SMS fallback disabled - no SMS sent on API failure")
                    }
                }
                
                // NO SMS sent when API is successful - SMS only for fallback
            } catch (e: Exception) {
                Log.e("MainActivity", "Location update network error: ${e.message}", e)
                // Update UI to show network error
                binding.tvNetworkStatus.text = "NETWORK ERROR - SMS ONLY"
                binding.tvNetworkStatus.setTextColor(getColor(R.color.warning_orange))
                
                // Only send SMS when network fails
                if (AppConfig.Network.ENABLE_SMS_FALLBACK) {
                    sendLocationViaSMS(latitude, longitude, speed)
                } else {
                    Log.d("MainActivity", "📱 SMS fallback disabled - no SMS sent on network error")
                }
            }
        }
    }
    
    private fun sendLocationViaSMS(latitude: Double, longitude: Double, speed: Float) {
        try {
            val busId = sharedPreferences.getString(PREF_BUS_ID, "") ?: ""
            val timestamp = System.currentTimeMillis()
            val smsText = "GPS:$busId,$latitude,$longitude,$speed,0,$timestamp"
            
            Log.d("MainActivity", "🔍 DEBUG: Attempting to send SMS: $smsText")
            
            // Check SMS permission first
            if (!hasSMSPermissions()) {
                Log.e("MainActivity", "❌ SMS permission not granted!")
                Toast.makeText(this, "SMS permission required to send location updates", Toast.LENGTH_LONG).show()
                return
            }
            
            Log.d("MainActivity", "✅ SMS permission granted, sending SMS...")
            
            // PROTOTYPE: Actually send the SMS using SMSUtils
            val smsSent = SMSUtils.sendLocationSMS(this, smsText)
            
            if (smsSent) {
                Log.d("MainActivity", "✅ SMS sent successfully to SMS Gateway: $smsText")
                Toast.makeText(this, "📱 Location SMS sent!", Toast.LENGTH_SHORT).show()
            } else {
                Log.e("MainActivity", "❌ SMS sending failed: $smsText")
                Toast.makeText(this, "❌ SMS sending failed!", Toast.LENGTH_SHORT).show()
            }
            
        } catch (e: Exception) {
            Log.e("MainActivity", "SMS fallback failed: ${e.message}", e)
            Toast.makeText(this, "SMS error: ${e.message}", Toast.LENGTH_LONG).show()
        }
    }
    
    private fun showLogoutConfirmationDialog() {
        AlertDialog.Builder(this)
            .setTitle("Logout")
            .setMessage("Are you sure you want to logout? This will stop your current journey if active.")
            .setPositiveButton("Logout") { _, _ ->
                performLogout()
            }
            .setNegativeButton("Cancel", null)
            .show()
    }
    
    private fun showLanguageSelectionDialog() {
        val languages = LanguageUtils.getSupportedLanguages()
        val languageNames = languages.map { it.second }.toTypedArray()
        val currentLanguage = LanguageUtils.getAppLanguage(this)
        val currentIndex = languages.indexOfFirst { it.first == currentLanguage }
        
        AlertDialog.Builder(this)
            .setTitle(getString(R.string.select_language))
            .setSingleChoiceItems(languageNames, currentIndex) { dialog, which ->
                val selectedLanguage = languages[which].first
                if (selectedLanguage != currentLanguage) {
                    LanguageUtils.setAppLanguage(this, selectedLanguage)
                    
                    // Show loading and restart to main activity
                    AlertDialog.Builder(this)
                        .setMessage(getString(R.string.changing_language))
                        .setCancelable(false)
                        .show()
                    
                    // Restart to MainActivity after a brief delay
                    android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
                        LanguageUtils.restartToActivity(this, MainActivity::class.java)
                    }, 1000)
                }
                dialog.dismiss()
            }
            .setNegativeButton(getString(R.string.cancel), null)
            .show()
    }
    
    private fun performLogout() {
        // Stop journey if active
        if (isJourneyActive) {
            stopJourney()
        }
        
        // Clear preferences
        sharedPreferences.edit().clear().apply()
        
        // Navigate to login
        navigateToLogin()
    }
    
    private fun showLoading(show: Boolean) {
        binding.progressLoading.visibility = if (show) View.VISIBLE else View.GONE
    }
    
    private fun isUserLoggedIn(): Boolean {
        return sharedPreferences.getBoolean(PREF_IS_LOGGED_IN, false)
    }
    
    private fun navigateToLogin() {
        val intent = Intent(this, LanguageSelectionActivity::class.java)
        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        startActivity(intent)
        finish()
    }
    
    // Permission handling
    private fun requestPermissions() {
        // Request permissions step by step for better user experience
        if (!hasNotificationPermission()) {
            requestNotificationPermission()
        } else if (!hasLocationPermissions()) {
            requestLocationPermissions()
        } else if (!hasSMSPermissions()) {
            requestSMSPermissions()
        }
    }
    
    private fun hasLocationPermissions(): Boolean {
        return ContextCompat.checkSelfPermission(
            this, Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED &&
        ContextCompat.checkSelfPermission(
            this, Manifest.permission.ACCESS_COARSE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED
    }
    
    private fun hasBackgroundLocationPermission(): Boolean {
        return if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q) {
            ContextCompat.checkSelfPermission(
                this, Manifest.permission.ACCESS_BACKGROUND_LOCATION
            ) == PackageManager.PERMISSION_GRANTED
        } else {
            true // Not needed on older versions
        }
    }
    
    private fun hasSMSPermissions(): Boolean {
        return ContextCompat.checkSelfPermission(
            this, Manifest.permission.SEND_SMS
        ) == PackageManager.PERMISSION_GRANTED
    }
    
    private fun hasNotificationPermission(): Boolean {
        return if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
            ContextCompat.checkSelfPermission(
                this, Manifest.permission.POST_NOTIFICATIONS
            ) == PackageManager.PERMISSION_GRANTED
        } else {
            true // Not needed on older versions
        }
    }
    
    private fun requestLocationPermissions() {
        if (ActivityCompat.shouldShowRequestPermissionRationale(this, Manifest.permission.ACCESS_FINE_LOCATION)) {
            // Show explanation dialog
            AlertDialog.Builder(this)
                .setTitle("Location Permission Required")
                .setMessage("This app needs location access to track your journey and provide GPS-based services.")
                .setPositiveButton("Grant Permission") { _, _ ->
                    ActivityCompat.requestPermissions(
                        this,
                        arrayOf(
                            Manifest.permission.ACCESS_FINE_LOCATION,
                            Manifest.permission.ACCESS_COARSE_LOCATION
                        ),
                        REQUEST_LOCATION_PERMISSIONS
                    )
                }
                .setNegativeButton("Cancel") { _, _ ->
                    Toast.makeText(this, "Location permission is required for tracking", Toast.LENGTH_LONG).show()
                }
                .show()
        } else {
            ActivityCompat.requestPermissions(
                this,
                arrayOf(
                    Manifest.permission.ACCESS_FINE_LOCATION,
                    Manifest.permission.ACCESS_COARSE_LOCATION
                ),
                REQUEST_LOCATION_PERMISSIONS
            )
        }
    }
    
    private fun requestBackgroundLocationPermission() {
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q) {
            if (ActivityCompat.shouldShowRequestPermissionRationale(this, Manifest.permission.ACCESS_BACKGROUND_LOCATION)) {
                AlertDialog.Builder(this)
                    .setTitle("Background Location Permission")
                    .setMessage("For continuous tracking, this app needs to access location in the background. Please select 'Allow all the time' in the next dialog.")
                    .setPositiveButton("Continue") { _, _ ->
                        ActivityCompat.requestPermissions(
                            this,
                            arrayOf(Manifest.permission.ACCESS_BACKGROUND_LOCATION),
                            REQUEST_BACKGROUND_LOCATION_PERMISSION
                        )
                    }
                    .setNegativeButton("Skip") { _, _ ->
                        Toast.makeText(this, "Background location will improve tracking accuracy", Toast.LENGTH_LONG).show()
                    }
                    .show()
            } else {
                ActivityCompat.requestPermissions(
                    this,
                    arrayOf(Manifest.permission.ACCESS_BACKGROUND_LOCATION),
                    REQUEST_BACKGROUND_LOCATION_PERMISSION
                )
            }
        }
    }
    
    private fun requestSMSPermissions() {
        if (ActivityCompat.shouldShowRequestPermissionRationale(this, Manifest.permission.SEND_SMS)) {
            AlertDialog.Builder(this)
                .setTitle("SMS Permission Required")
                .setMessage("This app needs SMS permission to send emergency alerts when internet is not available.")
                .setPositiveButton("Grant Permission") { _, _ ->
                    ActivityCompat.requestPermissions(
                        this,
                        arrayOf(Manifest.permission.SEND_SMS),
                        REQUEST_SMS_PERMISSION
                    )
                }
                .setNegativeButton("Cancel") { _, _ ->
                    Toast.makeText(this, "SMS permission helps with emergency alerts", Toast.LENGTH_LONG).show()
                }
                .show()
        } else {
            ActivityCompat.requestPermissions(
                this,
                arrayOf(Manifest.permission.SEND_SMS),
                REQUEST_SMS_PERMISSION
            )
        }
    }
    
    private fun requestNotificationPermission() {
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
            if (ActivityCompat.shouldShowRequestPermissionRationale(this, Manifest.permission.POST_NOTIFICATIONS)) {
                AlertDialog.Builder(this)
                    .setTitle("Notification Permission")
                    .setMessage("This app needs notification permission to show tracking status and alerts.")
                    .setPositiveButton("Allow") { _, _ ->
                        ActivityCompat.requestPermissions(
                            this,
                            arrayOf(Manifest.permission.POST_NOTIFICATIONS),
                            REQUEST_NOTIFICATION_PERMISSION
                        )
                    }
                    .setNegativeButton("Cancel") { _, _ ->
                        // Continue with other permissions
                        if (!hasLocationPermissions()) {
                            requestLocationPermissions()
                        } else if (!hasSMSPermissions()) {
                            requestSMSPermissions()
                        }
                    }
                    .show()
            } else {
                ActivityCompat.requestPermissions(
                    this,
                    arrayOf(Manifest.permission.POST_NOTIFICATIONS),
                    REQUEST_NOTIFICATION_PERMISSION
                )
            }
        } else {
            // Continue with other permissions on older Android versions
            if (!hasLocationPermissions()) {
                requestLocationPermissions()
            } else if (!hasSMSPermissions()) {
                requestSMSPermissions()
            }
        }
    }
    
    private fun isLocationEnabled(): Boolean {
        // Simplified check - in production, you'd check if GPS/location services are enabled
        return hasLocationPermissions()
    }
    
    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        
        when (requestCode) {
            REQUEST_NOTIFICATION_PERMISSION -> {
                if (grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                    Toast.makeText(this, "Notification permission granted", Toast.LENGTH_SHORT).show()
                } else {
                    Toast.makeText(this, "Notification permission denied - some features may not work", Toast.LENGTH_LONG).show()
                }
                // Continue with location permissions
                if (!hasLocationPermissions()) {
                    requestLocationPermissions()
                } else if (!hasSMSPermissions()) {
                    requestSMSPermissions()
                }
            }
            REQUEST_LOCATION_PERMISSIONS -> {
                if (grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                    updateStatusIndicators()
                    Toast.makeText(this, "Location permission granted", Toast.LENGTH_SHORT).show()
                    
                    // Request background location permission if needed and available
                    if (!hasBackgroundLocationPermission() && android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q) {
                        // Small delay to avoid overwhelming the user
                        binding.root.postDelayed({
                            requestBackgroundLocationPermission()
                        }, 1000)
                    } else if (!hasSMSPermissions()) {
                        // Continue with SMS permission
                        binding.root.postDelayed({
                            requestSMSPermissions()
                        }, 500)
                    }
                } else {
                    Toast.makeText(this, "Location permission denied - GPS tracking won't work", Toast.LENGTH_LONG).show()
                    // Still continue with SMS permissions
                    if (!hasSMSPermissions()) {
                        binding.root.postDelayed({
                            requestSMSPermissions()
                        }, 500)
                    }
                }
                updateStatusIndicators()
            }
            REQUEST_BACKGROUND_LOCATION_PERMISSION -> {
                if (grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                    Toast.makeText(this, "Background location permission granted", Toast.LENGTH_SHORT).show()
                } else {
                    Toast.makeText(this, "Background location denied - tracking may stop when app is minimized", Toast.LENGTH_LONG).show()
                }
                // Continue with SMS permissions
                if (!hasSMSPermissions()) {
                    binding.root.postDelayed({
                        requestSMSPermissions()
                    }, 500)
                }
            }
            REQUEST_SMS_PERMISSION -> {
                if (grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                    Toast.makeText(this, "SMS permission granted", Toast.LENGTH_SHORT).show()
                } else {
                    Toast.makeText(this, "SMS permission denied - emergency SMS won't work", Toast.LENGTH_LONG).show()
                }
                updateStatusIndicators()
            }
        }
    }
}