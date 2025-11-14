package com.margsetu.passenger.activities

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.content.res.Resources
import android.location.Location
import android.os.Bundle
import android.view.MenuItem
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.ImageButton
import android.widget.Toast
import androidx.appcompat.app.ActionBarDrawerToggle
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.widget.Toolbar
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.drawerlayout.widget.DrawerLayout
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationServices
import com.google.android.material.navigation.NavigationView
import com.margsetu.passenger.R
import com.margsetu.passenger.utils.NetworkUtils
import com.margsetu.passenger.utils.SMSUtils

class MainActivity : AppCompatActivity(), NavigationView.OnNavigationItemSelectedListener {
    
    private lateinit var drawerLayout: DrawerLayout
    private lateinit var navigationView: NavigationView
    private lateinit var toolbar: Toolbar
    
    private lateinit var fromLocationInput: EditText
    private lateinit var toLocationInput: EditText
    private lateinit var searchButton: Button
    private lateinit var currentLocationButton: ImageButton
    private lateinit var swapLocationButton: ImageButton
    
    // Quick action buttons
    // private lateinit var smsMode: View
    // private lateinit var offlineSchedule: View
    
    private lateinit var fusedLocationClient: FusedLocationProviderClient
    
    companion object {
        private const val LOCATION_PERMISSION_REQUEST_CODE = 100
    }
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        try {
            android.util.Log.d("MainActivity", "MainActivity onCreate started")
            
            // Log launch details for debugging
            intent?.let { launchIntent ->
                android.util.Log.d("MainActivity", "Launch source: ${launchIntent.getStringExtra("login_source")}")
                android.util.Log.d("MainActivity", "Launch timestamp: ${launchIntent.getLongExtra("timestamp", 0)}")
            }
            
            android.util.Log.d("MainActivity", "Setting content view...")
            setContentView(R.layout.activity_main)
            android.util.Log.d("MainActivity", "Content view set successfully")
            
            android.util.Log.d("MainActivity", "Initializing views...")
            initViews()
            
            android.util.Log.d("MainActivity", "Setting up toolbar...")
            setupToolbar()
            
            android.util.Log.d("MainActivity", "Setting up drawer...")
            setupDrawer()
            
            android.util.Log.d("MainActivity", "Setting up click listeners...")
            setupClickListeners()
            
            android.util.Log.d("MainActivity", "Checking network status...")
            checkNetworkStatus()
            
            android.util.Log.d("MainActivity", "Creating location client...")
            fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)
            
            android.util.Log.d("MainActivity", "MainActivity onCreate completed successfully")
            
        } catch (e: Resources.NotFoundException) {
            android.util.Log.e("MainActivity", "Resource not found error: ${e.message}", e)
            showSpecificError("Missing resources", "Some app resources are missing. Please reinstall the app.")
        } catch (e: ClassCastException) {
            android.util.Log.e("MainActivity", "Class cast error: ${e.message}", e)
            showSpecificError("Layout Error", "There's an issue with the app layout. Please restart.")
        } catch (e: Exception) {
            android.util.Log.e("MainActivity", "General error in MainActivity onCreate: ${e.message}", e)
            android.util.Log.e("MainActivity", "Error type: ${e.javaClass.simpleName}")
            android.util.Log.e("MainActivity", "Stack trace: ${e.stackTrace.contentToString()}")
            
            // Show error to user and provide fallback
            showSpecificError("Initialization Error", "Error: ${e.message}")
        }
    }
    
    private fun showSpecificError(title: String, message: String) {
        try {
            androidx.appcompat.app.AlertDialog.Builder(this)
                .setTitle(title)
                .setMessage(message)
                .setPositiveButton("Restart") { _, _ ->
                    // Restart the app
                    val intent = Intent(this, com.margsetu.passenger.SplashActivity::class.java)
                    intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                    startActivity(intent)
                    finish()
                }
                .setNegativeButton("Exit") { _, _ ->
                    finish()
                }
                .setCancelable(false)
                .show()
        } catch (dialogError: Exception) {
            android.util.Log.e("MainActivity", "Error showing error dialog: ${dialogError.message}", dialogError)
            finish()
        }
    }
    
    private fun initViews() {
        try {
            android.util.Log.d("MainActivity", "Starting initViews")
            
            drawerLayout = findViewById(R.id.drawerLayout)
            android.util.Log.d("MainActivity", "drawerLayout initialized: ${drawerLayout != null}")
            
            navigationView = findViewById(R.id.navigationView)
            android.util.Log.d("MainActivity", "navigationView initialized: ${navigationView != null}")
            
            toolbar = findViewById(R.id.toolbar)
            android.util.Log.d("MainActivity", "toolbar initialized: ${toolbar != null}")
            
            fromLocationInput = findViewById(R.id.fromLocationInput)
            android.util.Log.d("MainActivity", "fromLocationInput initialized: ${fromLocationInput != null}")
            
            toLocationInput = findViewById(R.id.toLocationInput)
            android.util.Log.d("MainActivity", "toLocationInput initialized: ${toLocationInput != null}")
            
            searchButton = findViewById(R.id.searchButton)
            android.util.Log.d("MainActivity", "searchButton initialized: ${searchButton != null}")
            if (searchButton == null) {
                throw IllegalStateException("searchButton not found in layout!")
            }
            
            currentLocationButton = findViewById(R.id.currentLocationButton)
            android.util.Log.d("MainActivity", "currentLocationButton initialized: ${currentLocationButton != null}")
            
            swapLocationButton = findViewById(R.id.swapLocationButton)
            android.util.Log.d("MainActivity", "swapLocationButton initialized: ${swapLocationButton != null}")
            
            android.util.Log.d("MainActivity", "All views initialized successfully")
        } catch (e: Exception) {
            android.util.Log.e("MainActivity", "Error initializing views: ${e.message}", e)
            android.util.Log.e("MainActivity", "Stack trace: ${e.stackTrace.contentToString()}")
            throw e // Re-throw to be caught by onCreate
        }
    }
    
    private fun findQuickActionCard(text: String): View? {
        return try {
            val rootView = findViewById<android.view.ViewGroup>(android.R.id.content)
            findViewByText(rootView, text)
        } catch (e: Exception) {
            android.util.Log.e("MainActivity", "Error finding quick action card: $text", e)
            null
        }
    }
    
    private fun findViewByText(viewGroup: android.view.ViewGroup, text: String): View? {
        for (i in 0 until viewGroup.childCount) {
            val child = viewGroup.getChildAt(i)
            if (child is android.widget.TextView && child.text.toString().contains(text)) {
                return child.parent as? View ?: child
            } else if (child is android.view.ViewGroup) {
                val found = findViewByText(child, text)
                if (found != null) return found
            }
        }
        return null
    }
    
    private fun setupToolbar() {
        try {
            android.util.Log.d("MainActivity", "Starting setupToolbar")
            setSupportActionBar(toolbar)
            supportActionBar?.title = getString(R.string.app_name)
            android.util.Log.d("MainActivity", "Toolbar setup completed")
        } catch (e: Exception) {
            android.util.Log.e("MainActivity", "Error setting up toolbar: ${e.message}", e)
            throw e
        }
    }
    
    private fun setupDrawer() {
        try {
            android.util.Log.d("MainActivity", "Starting setupDrawer")
            val toggle = ActionBarDrawerToggle(
                this,
                drawerLayout,
                toolbar,
                R.string.navigation_drawer_open,
                R.string.navigation_drawer_close
            )
            drawerLayout.addDrawerListener(toggle)
            toggle.syncState()
            
            navigationView.setNavigationItemSelectedListener(this)
            android.util.Log.d("MainActivity", "Drawer setup completed")
        } catch (e: Exception) {
            android.util.Log.e("MainActivity", "Error setting up drawer: ${e.message}", e)
            throw e
        }
    }
    
    private fun setupClickListeners() {
        try {
            android.util.Log.d("MainActivity", "Starting setupClickListeners")
            
            // Test if searchButton was properly found
            if (::searchButton.isInitialized) {
                android.util.Log.d("MainActivity", "searchButton is initialized")
                searchButton.setOnClickListener {
                    android.util.Log.d("MainActivity", "=== SEARCH BUTTON CLICKED ===")
                    searchBuses()
                }
                android.util.Log.d("MainActivity", "searchButton click listener set")
            } else {
                android.util.Log.e("MainActivity", "searchButton is NOT initialized!")
                throw IllegalStateException("searchButton not found")
            }
            
            currentLocationButton.setOnClickListener {
                getCurrentLocation()
            }
            
            swapLocationButton.setOnClickListener {
                swapLocations()
            }
            
            // Setup quick action buttons
            setupQuickActionListeners()
            
            android.util.Log.d("MainActivity", "Click listeners setup completed")
        } catch (e: Exception) {
            android.util.Log.e("MainActivity", "Error setting up click listeners: ${e.message}", e)
            throw e
        }
    }
    
    private fun setupQuickActionListeners() {
        try {
            // Alternative method: find cards by traversing the view hierarchy
            val rootView = findViewById<android.view.ViewGroup>(android.R.id.content)
            findAndSetupQuickActions(rootView)
            
        } catch (e: Exception) {
            android.util.Log.e("MainActivity", "Error setting up quick action listeners: ${e.message}", e)
        }
    }
    
    private fun findAndSetupQuickActions(viewGroup: android.view.ViewGroup) {
        for (i in 0 until viewGroup.childCount) {
            val child = viewGroup.getChildAt(i)
            
            if (child is android.widget.TextView) {
                when (child.text.toString()) {
                    "SMS Mode" -> {
                        val cardView = child.parent?.parent as? View
                        cardView?.setOnClickListener { showSMSModeDialog() }
                    }
                    "Offline Schedule" -> {
                        val cardView = child.parent?.parent as? View
                        cardView?.setOnClickListener { openOfflineSchedule() }
                    }
                }
            } else if (child is android.view.ViewGroup) {
                findAndSetupQuickActions(child)
            }
        }
    }
    
    private fun searchBuses() {
        try {
            android.util.Log.d("MainActivity", "Starting bus search")
            
            val fromLocation = fromLocationInput.text.toString().trim()
            val toLocation = toLocationInput.text.toString().trim()
            
            android.util.Log.d("MainActivity", "From: '$fromLocation', To: '$toLocation'")
            
            // Basic validation
            if (fromLocation.isEmpty()) {
                fromLocationInput.error = "Please enter starting location"
                fromLocationInput.requestFocus()
                return
            }
            
            if (toLocation.isEmpty()) {
                toLocationInput.error = "Please enter destination"
                toLocationInput.requestFocus()
                return
            }
            
            if (fromLocation.equals(toLocation, ignoreCase = true)) {
                Toast.makeText(this, "Source and destination cannot be same", Toast.LENGTH_SHORT).show()
                return
            }
            
            // Navigation is now working - enable it
            android.util.Log.d("MainActivity", "Creating intent for BusListingActivity")
            
            val intent = Intent(this, BusListingActivity::class.java).apply {
                putExtra("fromLocation", fromLocation)
                putExtra("toLocation", toLocation)
                putExtra("search_timestamp", System.currentTimeMillis())
                putExtra("slowNetwork", false)
                addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP)
            }
            
            android.util.Log.d("MainActivity", "Starting BusListingActivity...")
            startActivity(intent)
            android.util.Log.d("MainActivity", "BusListingActivity started successfully")
            
        } catch (e: Exception) {
            android.util.Log.e("MainActivity", "Error in search buses", e)
            Toast.makeText(this, "Search Error: ${e.message}", Toast.LENGTH_LONG).show()
        }
    }
    
    private fun getCurrentLocation() {
        if (ContextCompat.checkSelfPermission(
                this,
                Manifest.permission.ACCESS_FINE_LOCATION
            ) != PackageManager.PERMISSION_GRANTED
        ) {
            ActivityCompat.requestPermissions(
                this,
                arrayOf(Manifest.permission.ACCESS_FINE_LOCATION),
                LOCATION_PERMISSION_REQUEST_CODE
            )
            return
        }
        
        fusedLocationClient.lastLocation
            .addOnSuccessListener { location: Location? ->
                if (location != null) {
                    // In a real app, you would reverse geocode this to get address
                    val locationText = "Current Location (${location.latitude}, ${location.longitude})"
                    fromLocationInput.setText(locationText)
                    Toast.makeText(this, "Current location set", Toast.LENGTH_SHORT).show()
                } else {
                    Toast.makeText(this, "Unable to get current location", Toast.LENGTH_SHORT).show()
                }
            }
            .addOnFailureListener {
                Toast.makeText(this, "Failed to get location: ${it.message}", Toast.LENGTH_SHORT).show()
            }
    }
    
    private fun swapLocations() {
        val fromText = fromLocationInput.text.toString()
        val toText = toLocationInput.text.toString()
        
        fromLocationInput.setText(toText)
        toLocationInput.setText(fromText)
    }
    
    private fun checkNetworkStatus() {
        try {
            android.util.Log.d("MainActivity", "Starting checkNetworkStatus")
            val networkStatus = NetworkUtils.getNetworkStatus(this)
            val statusMessage = NetworkUtils.getNetworkStatusDescription(networkStatus)
            
            if (networkStatus == NetworkUtils.NetworkStatus.SLOW || 
                networkStatus == NetworkUtils.NetworkStatus.NO_INTERNET) {
                Toast.makeText(this, statusMessage, Toast.LENGTH_LONG).show()
            }
            android.util.Log.d("MainActivity", "Network status check completed")
        } catch (e: Exception) {
            android.util.Log.e("MainActivity", "Error checking network status: ${e.message}", e)
            // Don't throw here, network check is not critical
        }
    }
    
    private fun showNoInternetDialog() {
        androidx.appcompat.app.AlertDialog.Builder(this)
            .setTitle("No Internet Connection")
            .setMessage("Please check your internet connection and try again.")
            .setPositiveButton("Retry") { _, _ ->
                checkNetworkStatus()
            }
            .setNegativeButton("SMS Mode") { _, _ ->
                val fromLocation = fromLocationInput.text.toString().trim()
                val toLocation = toLocationInput.text.toString().trim()
                if (fromLocation.isNotEmpty() && toLocation.isNotEmpty()) {
                    SMSUtils.sendRouteSearchSMS(this, fromLocation, toLocation)
                } else {
                    SMSUtils.showSMSFallbackDialog(this)
                }
            }
            .show()
    }
    
    private fun showSlowNetworkDialog(fromLocation: String, toLocation: String) {
        androidx.appcompat.app.AlertDialog.Builder(this)
            .setTitle("Slow Network Detected")
            .setMessage("Network is slow. You can continue with limited data or use SMS for bus information.")
            .setPositiveButton("Continue") { _, _ ->
                val intent = Intent(this, BusListingActivity::class.java).apply {
                    putExtra("fromLocation", fromLocation)
                    putExtra("toLocation", toLocation)
                    putExtra("slowNetwork", true)
                }
                startActivity(intent)
            }
            .setNeutralButton("SMS Mode") { _, _ ->
                SMSUtils.sendRouteSearchSMS(this, fromLocation, toLocation)
            }
            .setNegativeButton("Cancel", null)
            .show()
    }
    
    override fun onNavigationItemSelected(item: MenuItem): Boolean {
        when (item.itemId) {
            R.id.nav_home -> {
                // Already on home
            }
            R.id.nav_timetable -> {
                // Navigate to Timetable Activity
                val intent = Intent(this, TimetableActivity::class.java)
                startActivity(intent)
            }
            R.id.nav_history -> {
                // Navigate to History Activity
                openHistoryActivity()
            }
            R.id.nav_favorites -> {
                // Navigate to Favorites Activity
                openFavoritesActivity()
            }
            R.id.nav_profile -> {
                // Navigate to Profile Activity
                openProfileActivity()
            }
            R.id.nav_settings -> {
                // Navigate to Settings Activity
                openSettingsActivity()
            }
            R.id.nav_help -> {
                // Show help dialog
                showHelpDialog()
            }
            R.id.nav_about -> {
                // Show about dialog
                showAboutDialog()
            }
            R.id.nav_trademarks -> {
                // Show trademarks
                Toast.makeText(this, "Trademarks - Coming Soon", Toast.LENGTH_SHORT).show()
            }
        }
        
        drawerLayout.closeDrawers()
        return true
    }
    
    private fun showHelpDialog() {
        val helpMessage = """
            How to use MargSetu Passenger:
            
            1. Enter your starting location and destination
            2. Tap 'Search Buses' to find available buses
            3. Select a bus to view details and live location
            4. Use SMS mode when network is slow
            
            ${SMSUtils.getSMSInstructions()}
        """.trimIndent()
        
        androidx.appcompat.app.AlertDialog.Builder(this)
            .setTitle("Help")
            .setMessage(helpMessage)
            .setPositiveButton("OK", null)
            .show()
    }
    
    private fun showAboutDialog() {
        androidx.appcompat.app.AlertDialog.Builder(this)
            .setTitle("About MargSetu")
            .setMessage("MargSetu Passenger App v1.0\n\nReal-time bus tracking and information system for passengers.")
            .setPositiveButton("OK", null)
            .show()
    }
    
    private fun showSMSModeDialog() {
        val message = """
            🚌 SMS Bus Tracking
            
            When network is poor, you can get bus information via SMS:
            
            📱 Send SMS Commands:
            • "ROUTE [From] TO [To]" - Search buses
            • "BUS [Bus Number]" - Track specific bus
            • "STATUS [Bus Number]" - Get bus status
            • "HELP" - Get all commands
            
            📞 SMS Number: +91-90159-02832
            
            Example:
            "ROUTE Mumbai TO Pune"
            "BUS MH12AB1234"
        """.trimIndent()
        
        androidx.appcompat.app.AlertDialog.Builder(this)
            .setTitle("SMS Mode")
            .setMessage(message)
            .setPositiveButton("Send SMS") { _, _ ->
                SMSUtils.showSMSFallbackDialog(this)
            }
            .setNegativeButton("Close", null)
            .show()
    }
    
    private fun openOfflineSchedule() {
        // Navigate to Timetable Activity with offline mode
        val intent = Intent(this, TimetableActivity::class.java)
        intent.putExtra("offline_mode", true)
        startActivity(intent)
    }
    
    private fun openHistoryActivity() {
        try {
            val intent = Intent(this, HistoryActivity::class.java)
            startActivity(intent)
        } catch (e: Exception) {
            android.util.Log.e("MainActivity", "Error opening HistoryActivity", e)
            Toast.makeText(this, "Error opening history", Toast.LENGTH_SHORT).show()
        }
    }
    
    private fun openFavoritesActivity() {
        try {
            val intent = Intent(this, FavoritesActivity::class.java)
            startActivity(intent)
        } catch (e: Exception) {
            android.util.Log.e("MainActivity", "Error opening FavoritesActivity", e)
            Toast.makeText(this, "Error opening favorites", Toast.LENGTH_SHORT).show()
        }
    }
    
    private fun openProfileActivity() {
        try {
            val intent = Intent(this, ProfileActivity::class.java)
            startActivity(intent)
        } catch (e: Exception) {
            android.util.Log.e("MainActivity", "Error opening ProfileActivity", e)
            Toast.makeText(this, "Error opening profile", Toast.LENGTH_SHORT).show()
        }
    }
    
    private fun openSettingsActivity() {
        try {
            val intent = Intent(this, SettingsActivity::class.java)
            startActivity(intent)
        } catch (e: Exception) {
            android.util.Log.e("MainActivity", "Error opening SettingsActivity", e)
            Toast.makeText(this, "Error opening settings", Toast.LENGTH_SHORT).show()
        }
    }
    
    private fun showHistoryDialog() {
        val historyItems = """
            📋 Recent Bus Searches:
            
            🚌 Mumbai → Pune (Today 2:30 PM)
               • Found 6 buses
               • Searched via app
            
            🚌 Pune → Mumbai (Yesterday 9:15 AM)
               • Found 8 buses
               • Tracked MH12AB1234
            
            🚌 Mumbai → Nashik (2 days ago)
               • Found 4 buses
               • Used SMS mode
            
            🚌 City Center → Airport (3 days ago)
               • Found 12 local buses
               • Booked seat in MH22KL1122
            
            📱 SMS Queries: 3
            🔍 App Searches: 12
            📍 Location Uses: 8
        """.trimIndent()
        
        androidx.appcompat.app.AlertDialog.Builder(this)
            .setTitle("Search History")
            .setMessage(historyItems)
            .setPositiveButton("Clear History") { _, _ ->
                Toast.makeText(this, "History cleared", Toast.LENGTH_SHORT).show()
            }
            .setNegativeButton("Close", null)
            .show()
    }
    
    private fun showFavoritesDialog() {
        val favoriteRoutes = arrayOf(
            "🚌 Mumbai → Pune (Daily commute)",
            "🚌 Pune → Mumbai (Return trip)", 
            "🚌 City Center → Airport (Frequent)",
            "🚌 Home → Office (Work route)",
            "🚌 Mumbai → Nashik (Weekend trips)"
        )
        
        androidx.appcompat.app.AlertDialog.Builder(this)
            .setTitle("Favorite Routes")
            .setItems(favoriteRoutes) { _, which ->
                val selected = favoriteRoutes[which]
                when (which) {
                    0 -> {
                        fromLocationInput.setText("Mumbai")
                        toLocationInput.setText("Pune")
                        Toast.makeText(this, "Route loaded from favorites", Toast.LENGTH_SHORT).show()
                    }
                    1 -> {
                        fromLocationInput.setText("Pune")
                        toLocationInput.setText("Mumbai")
                        Toast.makeText(this, "Route loaded from favorites", Toast.LENGTH_SHORT).show()
                    }
                    2 -> {
                        fromLocationInput.setText("City Center")
                        toLocationInput.setText("Airport")
                        Toast.makeText(this, "Route loaded from favorites", Toast.LENGTH_SHORT).show()
                    }
                    3 -> {
                        fromLocationInput.setText("Home")
                        toLocationInput.setText("Office")
                        Toast.makeText(this, "Route loaded from favorites", Toast.LENGTH_SHORT).show()
                    }
                    4 -> {
                        fromLocationInput.setText("Mumbai")
                        toLocationInput.setText("Nashik")
                        Toast.makeText(this, "Route loaded from favorites", Toast.LENGTH_SHORT).show()
                    }
                }
            }
            .setNeutralButton("Manage", { _, _ ->
                Toast.makeText(this, "Favorite management coming soon", Toast.LENGTH_SHORT).show()
            })
            .setNegativeButton("Close", null)
            .show()
    }
    
    private fun showProfileDialog() {
        val profileInfo = """
            👤 User Profile
            
            📱 Mobile: +91-98765-43210
            📧 Email: passenger@margsetu.com
            👤 Name: Demo User
            🏠 Location: Mumbai, Maharashtra
            
            📊 Statistics:
            • Total trips tracked: 45
            • Favorite route: Mumbai-Pune
            • SMS queries sent: 8
            • App usage: 3 months
            
            🎯 Preferences:
            • Language: English
            • Notifications: Enabled
            • Location sharing: Enabled
            • SMS fallback: Enabled
        """.trimIndent()
        
        androidx.appcompat.app.AlertDialog.Builder(this)
            .setTitle("My Profile")
            .setMessage(profileInfo)
            .setPositiveButton("Edit") { _, _ ->
                Toast.makeText(this, "Profile editing coming soon", Toast.LENGTH_SHORT).show()
            }
            .setNegativeButton("Close", null)
            .show()
    }
    
    private fun showSettingsDialog() {
        val settingsOptions = arrayOf(
            "🌐 Language Settings",
            "🔔 Notification Settings", 
            "📍 Location Settings",
            "📱 SMS Settings",
            "🌓 Theme Settings",
            "💾 Data & Storage",
            "🔐 Privacy Settings",
            "📋 App Permissions"
        )
        
        androidx.appcompat.app.AlertDialog.Builder(this)
            .setTitle("Settings")
            .setItems(settingsOptions) { _, which ->
                when (which) {
                    0 -> showLanguageSettings()
                    1 -> showNotificationSettings()
                    2 -> showLocationSettings()
                    3 -> showSMSSettings()
                    4 -> showThemeSettings()
                    5 -> showDataSettings()
                    6 -> showPrivacySettings()
                    7 -> showPermissionSettings()
                }
            }
            .setNegativeButton("Close", null)
            .show()
    }
    
    private fun showLanguageSettings() {
        val languages = arrayOf("English", "हिंदी (Hindi)", "ਪੰਜਾਬੀ (Punjabi)")
        var checkedItem = 0 // English selected by default
        
        androidx.appcompat.app.AlertDialog.Builder(this)
            .setTitle("Select Language")
            .setSingleChoiceItems(languages, checkedItem) { _, which ->
                checkedItem = which
            }
            .setPositiveButton("Apply") { _, _ ->
                Toast.makeText(this, "Language changed to ${languages[checkedItem]}", Toast.LENGTH_SHORT).show()
            }
            .setNegativeButton("Cancel", null)
            .show()
    }
    
    private fun showNotificationSettings() {
        val message = """
            🔔 Notification Settings:
            
            ✅ Bus arrival alerts
            ✅ Route updates
            ✅ SMS confirmations  
            ❌ Promotional messages
            ✅ Emergency alerts
            
            🔊 Sound: Enabled
            📳 Vibration: Enabled
            ⏰ Quiet hours: 10 PM - 7 AM
        """.trimIndent()
        
        androidx.appcompat.app.AlertDialog.Builder(this)
            .setTitle("Notifications")
            .setMessage(message)
            .setPositiveButton("Modify", { _, _ ->
                Toast.makeText(this, "Notification preferences coming soon", Toast.LENGTH_SHORT).show()
            })
            .setNegativeButton("Close", null)
            .show()
    }
    
    private fun showLocationSettings() {
        val message = """
            📍 Location Settings:
            
            ✅ Use current location
            ✅ Share location for tracking
            ✅ GPS accuracy: High
            ❌ Save location history
            
            🔒 Privacy: Your location is only used for bus tracking and is not stored permanently.
        """.trimIndent()
        
        androidx.appcompat.app.AlertDialog.Builder(this)
            .setTitle("Location Settings")
            .setMessage(message)
            .setPositiveButton("Modify", { _, _ ->
                Toast.makeText(this, "Location settings coming soon", Toast.LENGTH_SHORT).show()
            })
            .setNegativeButton("Close", null)
            .show()
    }
    
    private fun showSMSSettings() {
        val message = """
            📱 SMS Settings:
            
            📞 SMS Number: +91-90159-02832
            ✅ Auto SMS when network poor
            ✅ SMS confirmations
            ✅ Emergency SMS alerts
            
            💰 SMS charges may apply as per your operator's rates.
            
            📋 Available Commands:
            • ROUTE [from] TO [to]
            • BUS [number]
            • STATUS [number]
            • HELP
        """.trimIndent()
        
        androidx.appcompat.app.AlertDialog.Builder(this)
            .setTitle("SMS Settings")
            .setMessage(message)
            .setPositiveButton("Test SMS", { _, _ ->
                SMSUtils.showSMSFallbackDialog(this)
            })
            .setNegativeButton("Close", null)
            .show()
    }
    
    private fun showThemeSettings() {
        val themes = arrayOf("🌞 Light Theme", "🌙 Dark Theme", "🔄 System Default")
        var checkedItem = 0 // Light theme by default
        
        androidx.appcompat.app.AlertDialog.Builder(this)
            .setTitle("Theme Settings")
            .setSingleChoiceItems(themes, checkedItem) { _, which ->
                checkedItem = which
            }
            .setPositiveButton("Apply") { _, _ ->
                Toast.makeText(this, "Theme changed to ${themes[checkedItem]}", Toast.LENGTH_SHORT).show()
            }
            .setNegativeButton("Cancel", null)
            .show()
    }
    
    private fun showDataSettings() {
        val message = """
            💾 Data & Storage:
            
            📊 App data usage: 15.2 MB
            💾 Cache size: 3.1 MB
            📱 Offline data: 2.5 MB
            
            🗂️ Stored Data:
            • Timetable cache
            • Recent searches
            • Favorite routes
            • User preferences
            
            🧹 Clean up options available
        """.trimIndent()
        
        androidx.appcompat.app.AlertDialog.Builder(this)
            .setTitle("Data & Storage")
            .setMessage(message)
            .setPositiveButton("Clear Cache") { _, _ ->
                Toast.makeText(this, "Cache cleared successfully", Toast.LENGTH_SHORT).show()
            }
            .setNegativeButton("Close", null)
            .show()
    }
    
    private fun showPrivacySettings() {
        val message = """
            🔐 Privacy Settings:
            
            ✅ Location data encrypted
            ❌ Analytics collection
            ✅ Crash reporting (anonymous)
            ❌ Usage statistics sharing
            
            🛡️ Data Protection:
            • No personal data sold
            • Location used only for tracking
            • SMS for fallback communication
            • Data deleted after 30 days
        """.trimIndent()
        
        androidx.appcompat.app.AlertDialog.Builder(this)
            .setTitle("Privacy & Security")
            .setMessage(message)
            .setPositiveButton("Privacy Policy") { _, _ ->
                Toast.makeText(this, "Opening privacy policy...", Toast.LENGTH_SHORT).show()
            }
            .setNegativeButton("Close", null)
            .show()
    }
    
    private fun showPermissionSettings() {
        val message = """
            📋 App Permissions:
            
            ✅ Location Access
            ✅ SMS Sending
            ❌ Phone Calls
            ❌ Camera Access
            ❌ Microphone Access
            ✅ Network Access
            ✅ Storage Access
            
            ⚙️ You can manage these permissions in device settings.
        """.trimIndent()
        
        androidx.appcompat.app.AlertDialog.Builder(this)
            .setTitle("App Permissions")
            .setMessage(message)
            .setPositiveButton("Open Settings") { _, _ ->
                // Open app settings (this is a simplified version)
                Toast.makeText(this, "Opening app settings...", Toast.LENGTH_SHORT).show()
            }
            .setNegativeButton("Close", null)
            .show()
    }
    
    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        
        when (requestCode) {
            LOCATION_PERMISSION_REQUEST_CODE -> {
                if (grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                    getCurrentLocation()
                } else {
                    Toast.makeText(this, "Location permission denied", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }
    
    override fun onBackPressed() {
        if (drawerLayout.isDrawerOpen(navigationView)) {
            drawerLayout.closeDrawers()
        } else {
            super.onBackPressed()
        }
    }
}