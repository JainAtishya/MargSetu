package com.margsetu.passenger.activities

import android.content.Intent
import android.os.Bundle
import android.view.MenuItem
import android.view.View
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.widget.Toolbar
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.launch
import com.margsetu.passenger.models.Station
import com.margsetu.passenger.models.Bus
import com.margsetu.passenger.adapters.BusAdapter
import com.margsetu.passenger.network.ApiClient
import com.margsetu.passenger.utils.SMSUtils
import androidx.appcompat.app.AlertDialog
import com.margsetu.passenger.R
import com.margsetu.passenger.utils.NetworkUtils
import android.widget.LinearLayout

class BusListingActivity : AppCompatActivity() {
    
    private lateinit var toolbar: Toolbar
    private lateinit var recyclerView: RecyclerView
    private lateinit var progressBar: ProgressBar
    private lateinit var emptyView: LinearLayout
    private lateinit var routeInfoText: TextView
    
    // Helper to get the main TextView inside emptyView LinearLayout
    private val emptyViewText: TextView?
        get() = emptyView.getChildAt(1) as? TextView // Second child is the main message TextView
    
    private lateinit var busAdapter: BusAdapter
    private lateinit var apiClient: ApiClient
    private var fromLocation: String = ""
    private var toLocation: String = ""
    private var isSlowNetwork: Boolean = false
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        try {
            android.util.Log.d("BusListingActivity", "BusListingActivity onCreate started")
            setContentView(R.layout.activity_bus_listing)
            
            android.util.Log.d("BusListingActivity", "Getting intent data...")
            getIntentData()
            
            android.util.Log.d("BusListingActivity", "Initializing views...")
            initViews()
            
            android.util.Log.d("BusListingActivity", "Setting up toolbar...")
            setupToolbar()
            
            android.util.Log.d("BusListingActivity", "Setting up RecyclerView...")
            setupRecyclerView()
            
            android.util.Log.d("BusListingActivity", "Loading buses...")
            loadBuses()
            
            android.util.Log.d("BusListingActivity", "BusListingActivity onCreate completed")
        } catch (e: Exception) {
            android.util.Log.e("BusListingActivity", "Critical error in BusListingActivity onCreate: ${e.message}", e)
            
            // Try to show a simple fallback instead of crashing
            try {
                // Set a simple content view if layout failed
                if (!::toolbar.isInitialized) {
                    setContentView(android.R.layout.simple_list_item_1)
                }
                
                // Show error and provide fallback
                showCriticalErrorFallback(e.message ?: "Unknown error occurred")
            } catch (fallbackError: Exception) {
                android.util.Log.e("BusListingActivity", "Even fallback failed: ${fallbackError.message}", fallbackError)
                // Last resort - just show a toast and finish
                Toast.makeText(this, "App encountered an error. Please try again.", Toast.LENGTH_LONG).show()
                finish()
            }
        }
    }
    
    private fun getIntentData() {
        try {
            fromLocation = intent.getStringExtra("fromLocation") ?: ""
            toLocation = intent.getStringExtra("toLocation") ?: ""
            isSlowNetwork = intent.getBooleanExtra("slowNetwork", false)
            
            android.util.Log.d("BusListingActivity", "Intent data received:")
            android.util.Log.d("BusListingActivity", "  fromLocation: '$fromLocation'")
            android.util.Log.d("BusListingActivity", "  toLocation: '$toLocation'")
            android.util.Log.d("BusListingActivity", "  isSlowNetwork: $isSlowNetwork")
            
            if (fromLocation.isEmpty() || toLocation.isEmpty()) {
                android.util.Log.w("BusListingActivity", "Empty location data received")
                throw IllegalArgumentException("Source or destination is empty")
            }
        } catch (e: Exception) {
            android.util.Log.e("BusListingActivity", "Error getting intent data: ${e.message}", e)
            // Provide fallback values
            if (fromLocation.isEmpty()) fromLocation = "Unknown Location"
            if (toLocation.isEmpty()) toLocation = "Unknown Destination"
        }
    }
    
    private fun initViews() {
        try {
            android.util.Log.d("BusListingActivity", "Starting initViews")
            
            // Initialize views with null checks
            toolbar = findViewById(R.id.toolbar) ?: throw IllegalStateException("Toolbar not found")
            recyclerView = findViewById(R.id.recyclerView) ?: throw IllegalStateException("RecyclerView not found")
            progressBar = findViewById(R.id.progressBar) ?: throw IllegalStateException("ProgressBar not found")
            emptyView = findViewById(R.id.emptyView) ?: throw IllegalStateException("EmptyView not found")
            routeInfoText = findViewById(R.id.routeInfoText) ?: throw IllegalStateException("RouteInfoText not found")
            
            // Set route info safely
            try {
                routeInfoText.text = "$fromLocation → $toLocation"
            } catch (e: Exception) {
                android.util.Log.w("BusListingActivity", "Failed to set route info text: ${e.message}")
                routeInfoText.text = "Route Information"
            }
            
            android.util.Log.d("BusListingActivity", "All views initialized successfully")
        } catch (e: Exception) {
            android.util.Log.e("BusListingActivity", "Error initializing views: ${e.message}", e)
            throw IllegalStateException("Failed to initialize UI components: ${e.message}", e)
        }
    }
    
    private fun setupToolbar() {
        try {
            setSupportActionBar(toolbar)
            supportActionBar?.apply {
                title = "Available Buses"
                setDisplayHomeAsUpEnabled(true)
                setDisplayShowHomeEnabled(true)
            }
            android.util.Log.d("BusListingActivity", "Toolbar setup completed")
        } catch (e: Exception) {
            android.util.Log.e("BusListingActivity", "Error setting up toolbar: ${e.message}", e)
            // Continue without toolbar if it fails
        }
    }
    
    private fun setupRecyclerView() {
        try {
            android.util.Log.d("BusListingActivity", "Setting up RecyclerView")
            
            busAdapter = BusAdapter(mutableListOf(), isSlowNetwork) { bus ->
                try {
                    onBusClick(bus)
                } catch (e: Exception) {
                    android.util.Log.e("BusListingActivity", "Error in bus click handler: ${e.message}", e)
                    Toast.makeText(this@BusListingActivity, "Unable to view bus details", Toast.LENGTH_SHORT).show()
                }
            }
            
            recyclerView.apply {
                layoutManager = LinearLayoutManager(this@BusListingActivity)
                adapter = busAdapter
            }
            
            android.util.Log.d("BusListingActivity", "RecyclerView setup completed")
        } catch (e: Exception) {
            android.util.Log.e("BusListingActivity", "Error setting up RecyclerView: ${e.message}", e)
            throw IllegalStateException("Failed to setup bus list: ${e.message}", e)
        }
    }
    
    private fun onBusClick(bus: Bus) {
        try {
            android.util.Log.d("BusListingActivity", "Bus clicked: ${bus.number}")
            
            // Always try to navigate to Bus Details Activity with enhanced error handling
            android.util.Log.d("BusListingActivity", "Navigating to BusDetailsActivity for bus: ${bus.number}")
            
            val intent = Intent(this, BusDetailsActivity::class.java).apply {
                // Ensure parcelable class loader is accessible in target Activity
                extras?.classLoader = Bus::class.java.classLoader
                putExtra("bus", bus)
                // JSON fallback in case parcelable fails on some devices
                try {
                    putExtra("bus_json", bus.toJson().toString())
                } catch (e: Exception) {
                    android.util.Log.w("BusListingActivity", "Failed to serialize bus to JSON fallback: ${e.message}")
                }
                // Primitive fallbacks
                putExtra("busId", bus.id)
                putExtra("busNumber", bus.number)
                putExtra("routeName", bus.route)
                putExtra("driverName", bus.driverName)
                putExtra("driverPhone", bus.driverPhone)
                putExtra("departureTime", bus.departureTime)
                putExtra("arrivalTime", bus.arrivalTime)
                putExtra("seatsAvailable", bus.seatsAvailable)
                putExtra("totalSeats", bus.totalSeats)
                putExtra("currentLocation", bus.currentLocation)
                putExtra("occupancy", bus.occupancy)
                putExtra("status", bus.status)
                putExtra("estimatedArrival", bus.estimatedArrival)
                putExtra("latitude", bus.latitude)
                putExtra("longitude", bus.longitude)
                putExtra("fromLocation", fromLocation)
                putExtra("toLocation", toLocation)
                putExtra("slowNetwork", false)
            }
            
            startActivity(intent)
            android.util.Log.d("BusListingActivity", "BusDetailsActivity startActivity called")
            
        } catch (e: Exception) {
            android.util.Log.e("BusListingActivity", "Error handling bus click: ${e.message}", e)
            Toast.makeText(this, "Error opening bus details: ${e.message}", Toast.LENGTH_LONG).show()
            
            // Show alternative action
            androidx.appcompat.app.AlertDialog.Builder(this)
                .setTitle("Bus: ${bus.number}")
                .setMessage("Route: ${bus.route}\nDriver: ${bus.driverName}\nStatus: ${bus.status}\nETA: ${bus.estimatedArrival}")
                .setPositiveButton("OK", null)
                .show()
        }
    }
    
    private fun showSlowNetworkBusOptions(bus: Bus) {
        androidx.appcompat.app.AlertDialog.Builder(this)
            .setTitle("Bus: ${bus.number}")
            .setMessage("Network is slow. Choose an option:")
            .setPositiveButton("View Basic Info") { _, _ ->
                // Show bus details without live tracking
                val intent = Intent(this, BusDetailsActivity::class.java).apply {
                    putExtra("bus", bus)
                    putExtra("fromLocation", fromLocation)
                    putExtra("toLocation", toLocation)
                    putExtra("slowNetwork", true)
                }
                startActivity(intent)
            }
            .setNeutralButton("SMS Status") { _, _ ->
                SMSUtils.sendBusStatusSMS(this, bus.number)
            }
            .setNegativeButton("Cancel", null)
            .show()
    }
    
    private fun loadBuses() {
        android.util.Log.d("BusListingActivity", "🚀 === FORCE API ONLY - NO FALLBACK ===")
        android.util.Log.d(
            "BusListingActivity",
            "🌐 Backend URL: ${com.margsetu.passenger.network.ApiConstants.BASE_URL}"
        )
        android.util.Log.d("BusListingActivity", "📍 Testing API connectivity with: $fromLocation -> $toLocation")
        
        // Show toast immediately to indicate API test
        Toast.makeText(this, "🧪 Testing API connection - No fallback!", Toast.LENGTH_LONG).show()
        
        try {
            showLoading(true)
            
            // Initialize ApiClient safely
            try {
                apiClient = ApiClient(this)
                android.util.Log.d("BusListingActivity", "✅ ApiClient initialized successfully")
            } catch (e: Exception) {
                android.util.Log.e("BusListingActivity", "❌ Failed to initialize ApiClient: ${e.message}", e)
                Toast.makeText(this, "❌ ApiClient init failed: ${e.message}", Toast.LENGTH_LONG).show()
                return
            }
            
            // Force API call with NO FALLBACK
            lifecycleScope.launch {
                android.util.Log.d("BusListingActivity", "🚀 Starting FORCED API call")
                
                try {
                    // Quick connectivity check first
                    android.util.Log.d("BusListingActivity", "🩺 Pinging backend before search...")
                    val ping = apiClient.ping()
                    android.util.Log.d("BusListingActivity", "🩺 Ping result success=${ping.success} data=${ping.data} error=${ping.error}")
                    if (!ping.success) {
                        runOnUiThread {
                            Toast.makeText(this@BusListingActivity, "❌ API ping failed: ${ping.error}", Toast.LENGTH_LONG).show()
                        }
                    }
                    
                    // Direct API call - bypass all fallback logic
                    android.util.Log.d("BusListingActivity", "📞 Making direct searchBuses API call...")
                    val busResponse = apiClient.searchBuses(fromLocation, toLocation)
                    
                    android.util.Log.d("BusListingActivity", "📋 API Response received:")
                    android.util.Log.d("BusListingActivity", "✅ Success: ${busResponse.success}")
                    android.util.Log.d("BusListingActivity", "📊 Data: ${busResponse.data?.size ?: 0} buses")
                    android.util.Log.d("BusListingActivity", "❌ Error: ${busResponse.error}")
                    
                    runOnUiThread {
                        showLoading(false)
                        
                        if (busResponse.success && busResponse.data != null && busResponse.data.isNotEmpty()) {
                            // SUCCESS - show API data
                            Toast.makeText(this@BusListingActivity, "🎉 API SUCCESS! ${busResponse.data.size} buses", Toast.LENGTH_LONG).show()
                            showBusesSuccessfully(busResponse.data)
                        } else {
                            // API failed or empty
                            val errorMsg = busResponse.error ?: "Empty response"
                            Toast.makeText(this@BusListingActivity, "❌ API FAILED: $errorMsg", Toast.LENGTH_LONG).show()
                            android.util.Log.e("BusListingActivity", "API call failed or returned empty data")
                            // Show error message instead of fallback
                            showNoBusesFound(fromLocation, toLocation)
                        }
                    }
                    
                } catch (e: Exception) {
                    android.util.Log.e("BusListingActivity", "💥 API EXCEPTION: ${e.message}", e)
                    runOnUiThread {
                        showLoading(false)
                        Toast.makeText(this@BusListingActivity, "💥 EXCEPTION: ${e.message}", Toast.LENGTH_LONG).show()
                        showNoBusesFound(fromLocation, toLocation)
                    }
                }
            }
            
        } catch (e: Exception) {
            android.util.Log.e("BusListingActivity", "💥 Critical error in loadBuses: ${e.message}", e)
            Toast.makeText(this, "💥 CRITICAL ERROR: ${e.message}", Toast.LENGTH_LONG).show()
        }
    }
    
    private suspend fun tryApiApproach() {
        try {
            android.util.Log.d("BusListingActivity", "🌐 === MAKING ACTUAL API CALL ===")
            android.util.Log.d(
                "BusListingActivity",
                "🔗 Backend URL: ${com.margsetu.passenger.network.ApiConstants.BASE_URL}"
            )
            android.util.Log.d("BusListingActivity", "📍 From: $fromLocation | To: $toLocation")
            
            // Get stations with timeout and error handling
            val stationsResponse = try {
                android.util.Log.d("BusListingActivity", "📞 Calling apiClient.getStations()...")
                val response = apiClient.getStations()
                android.util.Log.d("BusListingActivity", "✅ getStations() call completed")
                response
            } catch (e: Exception) {
                android.util.Log.e("BusListingActivity", "❌ getStations() FAILED: ${e.message}", e)
                android.util.Log.e("BusListingActivity", "🔍 Error type: ${e.javaClass.simpleName}")
                if (e.cause != null) {
                    android.util.Log.e("BusListingActivity", "🔍 Root cause: ${e.cause?.message}")
                }
                throw e
            }
            
            android.util.Log.d("BusListingActivity", "📋 Stations response: success=${stationsResponse.success}")
            android.util.Log.d("BusListingActivity", "📋 Stations data: ${stationsResponse.data?.size ?: 0} stations")
            android.util.Log.d("BusListingActivity", "📋 Stations error: ${stationsResponse.error}")
            
            if (stationsResponse.success && stationsResponse.data != null) {
                val stations = stationsResponse.data
                android.util.Log.d("BusListingActivity", "🚉 Found ${stations.size} stations from API")
                stations.forEach { station ->
                    android.util.Log.d("BusListingActivity", "🚉 Station: ${station.name} (${station.id})")
                }
                
                // Find matching stations (try multiple approaches)
                val fromStation = findStation(stations, fromLocation)
                val toStation = findStation(stations, toLocation)
                
                android.util.Log.d("BusListingActivity", "🎯 Station matching - From: ${fromStation?.name}, To: ${toStation?.name}")
                
                if (fromStation != null && toStation != null) {
                    android.util.Log.d("BusListingActivity", "✅ Both stations found, searching buses...")
                    searchBusesWithStations(fromStation, toStation)
                } else {
                    android.util.Log.w("BusListingActivity", "⚠️ Stations not found, trying direct search...")
                    searchBusesDirectly()
                }
            } else {
                android.util.Log.w("BusListingActivity", "⚠️ Failed to get stations: ${stationsResponse.error}, trying direct search...")
                searchBusesDirectly()
            }
            
        } catch (e: Exception) {
            android.util.Log.e("BusListingActivity", "❌ tryApiApproach COMPLETELY FAILED: ${e.message}", e)
            android.util.Log.e("BusListingActivity", "🔍 Exception details: ${e.javaClass.simpleName}")
            throw e
        }
    }
    
    private fun findStation(stations: List<Station>, locationName: String): Station? {
        return stations.find { station ->
            station.name.equals(locationName, ignoreCase = true) ||
            station.name.contains(locationName, ignoreCase = true) ||
            locationName.contains(station.name, ignoreCase = true)
        }
    }
    
    private suspend fun searchBusesWithStations(fromStation: Station, toStation: Station) {
        try {
            android.util.Log.d("BusListingActivity", "🚌 === SEARCHING BUSES WITH STATIONS ===")
            android.util.Log.d("BusListingActivity", "🚌 From: ${fromStation.name} (ID: ${fromStation.id})")
            android.util.Log.d("BusListingActivity", "🚌 To: ${toStation.name} (ID: ${toStation.id})")
            android.util.Log.d("BusListingActivity", "🌐 Making API call to search buses...")
            
            val busResponse = apiClient.searchBuses(fromStation.id, toStation.id)
            
            android.util.Log.d("BusListingActivity", "🚌 Bus search response: success=${busResponse.success}")
            android.util.Log.d("BusListingActivity", "🚌 Bus count: ${busResponse.data?.size ?: 0}")
            android.util.Log.d("BusListingActivity", "🚌 Error: ${busResponse.error}")
            
            runOnUiThread {
                showLoading(false)
                
                if (busResponse.success && busResponse.data != null) {
                    val buses = busResponse.data
                    android.util.Log.d("BusListingActivity", "✅ API returned ${buses.size} buses")
                    buses.forEach { bus ->
                        android.util.Log.d("BusListingActivity", "🚌 Bus: ${bus.number} - ${bus.route} (Driver: ${bus.driverName})")
                    }
                    
                    if (buses.isEmpty()) {
                        android.util.Log.d("BusListingActivity", "⚠️ API returned empty bus list, showing fallback data")
                        showFallbackBuses()
                    } else {
                        android.util.Log.d("BusListingActivity", "✅ Showing API buses to user")
                        showBusesSuccessfully(buses)
                    }
                } else {
                    android.util.Log.w("BusListingActivity", "❌ Bus search failed: ${busResponse.error}, showing fallback data")
                    showFallbackBuses()
                }
            }
        } catch (e: Exception) {
            android.util.Log.e("BusListingActivity", "❌ searchBusesWithStations FAILED: ${e.message}", e)
            runOnUiThread {
                showFallbackBuses()
            }
        }
    }
    
    private suspend fun searchBusesDirectly() {
        try {
            android.util.Log.d("BusListingActivity", "🚌 === DIRECT BUS SEARCH ===")
            android.util.Log.d("BusListingActivity", "🚌 From location: $fromLocation")
            android.util.Log.d("BusListingActivity", "🚌 To location: $toLocation")
            android.util.Log.d("BusListingActivity", "🌐 Making direct API call...")
            
            val busResponse = apiClient.searchBuses(fromLocation, toLocation)
            
            android.util.Log.d("BusListingActivity", "🚌 Direct search response: success=${busResponse.success}")
            android.util.Log.d("BusListingActivity", "🚌 Bus count: ${busResponse.data?.size ?: 0}")
            android.util.Log.d("BusListingActivity", "🚌 Error: ${busResponse.error}")
            
            runOnUiThread {
                showLoading(false)
                
                if (busResponse.success && busResponse.data != null) {
                    val buses = busResponse.data
                    android.util.Log.d("BusListingActivity", "✅ Direct search returned ${buses.size} buses")
                    buses.forEach { bus ->
                        android.util.Log.d("BusListingActivity", "🚌 Bus: ${bus.number} - ${bus.route} (Driver: ${bus.driverName})")
                    }
                    
                    if (buses.isEmpty()) {
                        android.util.Log.d("BusListingActivity", "⚠️ Direct search returned empty, showing fallback data")
                        showFallbackBuses()
                    } else {
                        android.util.Log.d("BusListingActivity", "✅ Showing direct search buses to user")
                        showBusesSuccessfully(buses)
                    }
                } else {
                    android.util.Log.w("BusListingActivity", "❌ Direct search failed: ${busResponse.error}, showing fallback data")
                    showFallbackBuses()
                }
            }
        } catch (e: Exception) {
            android.util.Log.e("BusListingActivity", "❌ searchBusesDirectly FAILED: ${e.message}", e)
            runOnUiThread {
                showFallbackBuses()
            }
        }
    }
    
    private fun showBusesSuccessfully(buses: List<Bus>) {
        try {
            android.util.Log.d("BusListingActivity", "Displaying ${buses.size} buses successfully")
            runOnUiThread {
                if (::busAdapter.isInitialized) {
                    busAdapter.updateBuses(buses)
                }
                if (::recyclerView.isInitialized) {
                    recyclerView.visibility = View.VISIBLE
                }
                if (::emptyView.isInitialized) {
                    emptyView.visibility = View.GONE
                }
            }
        } catch (e: Exception) {
            android.util.Log.e("BusListingActivity", "Error displaying buses: ${e.message}", e)
            showFallbackBuses()
        }
    }
    
    private fun showNoBusesFound(from: String, to: String) {
        try {
            android.util.Log.d("BusListingActivity", "No buses found between $from and $to")
            
            if (::emptyView.isInitialized) {
                emptyView.visibility = View.VISIBLE
                emptyViewText?.text = "No buses found between $from and $to.\n\nTry different stations or check back later."
                
                // Offer to show sample data
                emptyView.setOnClickListener {
                    android.util.Log.d("BusListingActivity", "User clicked to see sample data")
                    showFallbackBuses()
                }
            }
            if (::recyclerView.isInitialized) {
                recyclerView.visibility = View.GONE
            }
            
            Toast.makeText(this, "No buses available for this route", Toast.LENGTH_LONG).show()
        } catch (e: Exception) {
            android.util.Log.e("BusListingActivity", "Error showing no buses found: ${e.message}", e)
            showFallbackBuses()
        }
    }
    
    private fun showFallbackBuses() {
        try {
            android.util.Log.d("BusListingActivity", "🔄 === SHOWING FALLBACK SAMPLE BUSES ===")
            android.util.Log.d("BusListingActivity", "⚠️ API failed or returned empty - displaying realistic sample data")
            showLoading(false)
            
            // Show a clear message to user that this is sample data
            Toast.makeText(
                this, 
                "🔄 Showing sample data (API temporarily unavailable)", 
                Toast.LENGTH_LONG
            ).show()
            
            val sampleBuses = generateSampleBuses()
            
            if (sampleBuses.isNotEmpty()) {
                android.util.Log.d("BusListingActivity", "📋 Generated ${sampleBuses.size} sample buses")
                sampleBuses.forEach { bus ->
                    android.util.Log.d("BusListingActivity", "🚌 Sample Bus: ${bus.number} - ${bus.route} (${bus.driverName})")
                }
                if (::busAdapter.isInitialized) {
                    busAdapter.updateBuses(sampleBuses)
                }
                if (::recyclerView.isInitialized) {
                    recyclerView.visibility = View.VISIBLE
                }
                if (::emptyView.isInitialized) {
                    emptyView.visibility = View.GONE
                }
                
                Toast.makeText(this, "Showing sample data (API temporarily unavailable)", Toast.LENGTH_LONG).show()
            } else {
                android.util.Log.w("BusListingActivity", "No sample buses generated")
                showEmptyView()
            }
        } catch (e: Exception) {
            android.util.Log.e("BusListingActivity", "Even fallback buses failed: ${e.message}", e)
            
            try {
                showLoading(false)
                if (::emptyView.isInitialized) {
                    emptyView.visibility = View.VISIBLE
                    emptyViewText?.text = "Service temporarily unavailable.\n\nPlease try again later."
                }
                if (::recyclerView.isInitialized) {
                    recyclerView.visibility = View.GONE
                }
                Toast.makeText(this, "Unable to load bus information", Toast.LENGTH_LONG).show()
            } catch (finalError: Exception) {
                android.util.Log.e("BusListingActivity", "Final fallback failed: ${finalError.message}", finalError)
            }
        }
    }
    
    private fun generateSampleBuses(): List<Bus> {
        // Generate realistic sample bus data based on actual backend database structure
        val realRoutes = listOf(
            "Mumbai Central - Pune Express",
            "Mumbai Central - Nashik Road", 
            "Pune - Aurangabad Express"
        )
        
        val busRoutes = listOf(
            // Mumbai-Pune route buses
            Bus(
                id = "1",
                number = "MH12GH3456",
                route = "Mumbai Central - Pune Express",
                driverName = "Prakash Desai",
                driverPhone = "+919876543213",
                departureTime = "08:00 AM",
                arrivalTime = "11:00 AM",
                seatsAvailable = 33,
                totalSeats = 45,
                currentLocation = "Lonavala",
                occupancy = "Medium",
                status = "Online",
                estimatedArrival = "15 mins",
                latitude = 18.7537,
                longitude = 73.4068
            ),
            Bus(
                id = "2", 
                number = "MH14AB7890",
                route = "Mumbai Central - Pune Express",
                driverName = "Suresh Patil",
                driverPhone = "+919876543214", 
                departureTime = "09:30 AM",
                arrivalTime = "12:30 PM",
                seatsAvailable = 17,
                totalSeats = 40,
                currentLocation = "Pune Railway Station",
                occupancy = "High",
                status = "Online",
                estimatedArrival = "Arrived",
                latitude = 18.5204,
                longitude = 73.8567
            ),
            // Mumbai-Nashik route buses
            Bus(
                id = "3",
                number = "MH12CD1234", 
                route = "Mumbai Central - Nashik Road",
                driverName = "Ramesh Sharma",
                driverPhone = "+919876543215",
                departureTime = "07:00 AM",
                arrivalTime = "11:00 AM", 
                seatsAvailable = 15,
                totalSeats = 50,
                currentLocation = "Thane",
                occupancy = "High",
                status = "Online",
                estimatedArrival = "45 mins",
                latitude = 19.2183,
                longitude = 72.8777
            ),
            Bus(
                id = "2",
                number = "MH14CD5678",
                route = "$fromLocation - $toLocation Super Fast",
                driverName = "Sunil Patil",
                driverPhone = "+919876543211",
                departureTime = "10:00 AM",
                arrivalTime = "11:30 AM",
                seatsAvailable = 8,
                totalSeats = 45,
                currentLocation = "Highway Junction",
                occupancy = "High",
                status = "Online",
                estimatedArrival = "12 mins",
                latitude = 19.0760,
                longitude = 72.8777
            ),
            // Local buses
            Bus(
                id = "3",
                number = "MH16EF9012",
                route = "$fromLocation - $toLocation Local",
                driverName = "Amit Sharma",
                driverPhone = "+919876543212",
                departureTime = "10:30 AM",
                arrivalTime = "12:00 PM",
                seatsAvailable = 25,
                totalSeats = 40,
                currentLocation = "Bus Depot",
                occupancy = "Low",
                status = "Idle",
                estimatedArrival = "20 mins",
                latitude = 19.0760,
                longitude = 72.8777
            ),
            // AC buses
            Bus(
                id = "4",
                number = "MH18GH3456",
                route = "$fromLocation - $toLocation AC Deluxe",
                driverName = "Prakash Desai",
                driverPhone = "+919876543213",
                departureTime = "11:00 AM",
                arrivalTime = "12:45 PM",
                seatsAvailable = 12,
                totalSeats = 35,
                currentLocation = "Mall Road",
                occupancy = "Medium",
                status = "Online",
                estimatedArrival = "8 mins",
                latitude = 19.0760,
                longitude = 72.8777
            ),
            // Volvo buses
            Bus(
                id = "5",
                number = "MH20IJ7890",
                route = "$fromLocation - $toLocation Volvo",
                driverName = "Vikram Singh",
                driverPhone = "+919876543214",
                departureTime = "11:30 AM",
                arrivalTime = "01:00 PM",
                seatsAvailable = 5,
                totalSeats = 42,
                currentLocation = "Airport Road",
                occupancy = "High",
                status = "Online",
                estimatedArrival = "15 mins",
                latitude = 19.0760,
                longitude = 72.8777
            ),
            // Economy buses
            Bus(
                id = "6",
                number = "MH22KL1122",
                route = "$fromLocation - $toLocation Economy",
                driverName = "Ravi Jadhav",
                driverPhone = "+919876543215",
                departureTime = "12:00 PM",
                arrivalTime = "01:45 PM",
                seatsAvailable = 30,
                totalSeats = 52,
                currentLocation = "Central Station",
                occupancy = "Low",
                status = "Online",
                estimatedArrival = "25 mins",
                latitude = 19.0760,
                longitude = 72.8777
            ),
            // Night buses
            Bus(
                id = "7",
                number = "MH24MN3344",
                route = "$fromLocation - $toLocation Night Service",
                driverName = "Mahesh Kale",
                driverPhone = "+919876543216",
                departureTime = "11:00 PM",
                arrivalTime = "12:30 AM",
                seatsAvailable = 18,
                totalSeats = 48,
                currentLocation = "Ring Road",
                occupancy = "Medium",
                status = "Online",
                estimatedArrival = "45 mins",
                latitude = 19.0760,
                longitude = 72.8777
            ),
            // Some offline buses for variety
            Bus(
                id = "8",
                number = "MH26OP5566",
                route = "$fromLocation - $toLocation Regional",
                driverName = "Santosh More",
                driverPhone = "+919876543217",
                departureTime = "02:00 PM",
                arrivalTime = "03:30 PM",
                seatsAvailable = 0,
                totalSeats = 38,
                currentLocation = "Workshop",
                occupancy = "High",
                status = "Offline",
                estimatedArrival = "Maintenance",
                latitude = 19.0760,
                longitude = 72.8777
            ),
            // Buses that haven't started yet
            Bus(
                id = "9",
                number = "MH28QR7788",
                route = "$fromLocation - $toLocation Express",
                driverName = "Ashok Yadav",
                driverPhone = "+919876543218",
                departureTime = "03:00 PM",
                arrivalTime = "04:30 PM",
                seatsAvailable = 42,
                totalSeats = 42,
                currentLocation = "$fromLocation Bus Stand",
                occupancy = "Available",
                status = "Not Started",
                estimatedArrival = "Departure: 3:00 PM",
                latitude = 19.0760,
                longitude = 72.8777
            ),
            Bus(
                id = "10", 
                number = "MH30ST9900",
                route = "$fromLocation - $toLocation Super Deluxe",
                driverName = "Deepak Gupta", 
                driverPhone = "+919876543219",
                departureTime = "04:00 PM",
                arrivalTime = "05:30 PM", 
                seatsAvailable = 35,
                totalSeats = 35,
                currentLocation = "$fromLocation Terminal",
                occupancy = "Available",
                status = "Scheduled",
                estimatedArrival = "Departure: 4:00 PM",
                latitude = 19.0760,
                longitude = 72.8777
            )
        )
        
        // Filter buses based on route if specific from/to locations are provided
        val filteredBuses = if (fromLocation.isNotEmpty() && toLocation.isNotEmpty()) {
            busRoutes.filter { bus ->
                bus.route.contains(fromLocation, ignoreCase = true) || 
                bus.route.contains(toLocation, ignoreCase = true)
            }
        } else {
            busRoutes
        }
        
        return if (filteredBuses.isNotEmpty()) {
            filteredBuses.shuffled().take(6) // Return up to 6 relevant buses
        } else {
            busRoutes.shuffled().take(4) // Return 4 random buses if no specific route found
        }
    }
    
    private fun showLoading(show: Boolean) {
        try {
            // Ensure we're on the main thread for UI operations
            runOnUiThread {
                if (::progressBar.isInitialized) {
                    progressBar.visibility = if (show) View.VISIBLE else View.GONE
                }
                if (::recyclerView.isInitialized) {
                    recyclerView.visibility = if (show) View.GONE else View.VISIBLE
                }
            }
        } catch (e: Exception) {
            android.util.Log.e("BusListingActivity", "Error in showLoading: ${e.message}", e)
        }
    }
    
    private fun showEmptyView() {
        try {
            runOnUiThread {
                if (::emptyView.isInitialized) {
                    emptyView.visibility = View.VISIBLE
                    emptyViewText?.text = "No buses available for this route.\nTry searching for a different route or time."
                    
                    emptyView.setOnClickListener {
                        // Offer SMS alternative
                        SMSUtils.sendRouteSearchSMS(this@BusListingActivity, fromLocation, toLocation)
                    }
                }
                if (::recyclerView.isInitialized) {
                    recyclerView.visibility = View.GONE
                }
            }
        } catch (e: Exception) {
            android.util.Log.e("BusListingActivity", "Error in showEmptyView: ${e.message}", e)
        }
    }
    
    private fun showErrorMessage(message: String) {
        try {
            runOnUiThread {
                if (::emptyView.isInitialized) {
                    emptyView.visibility = View.VISIBLE
                    emptyViewText?.text = message
                    
                    emptyView.setOnClickListener {
                        // Retry loading buses
                        loadBuses()
                    }
                }
                if (::recyclerView.isInitialized) {
                    recyclerView.visibility = View.GONE
                }
                
                // Also show a toast for immediate feedback
                Toast.makeText(this@BusListingActivity, message, Toast.LENGTH_LONG).show()
            }
        } catch (e: Exception) {
            android.util.Log.e("BusListingActivity", "Error in showErrorMessage: ${e.message}", e)
        }
    }
    
    private fun showSlowNetworkMessage() {
        Toast.makeText(this, "Slow network - Limited live updates available", Toast.LENGTH_LONG).show()
    }
    
    private fun showCriticalErrorFallback(errorMessage: String) {
        try {
            android.util.Log.d("BusListingActivity", "Showing critical error fallback")
            
            // Create a simple fallback dialog
            AlertDialog.Builder(this)
                .setTitle("Service Temporarily Unavailable")
                .setMessage("We're experiencing technical difficulties. Please try again later.\n\nError: $errorMessage")
                .setPositiveButton("Retry") { _, _ ->
                    // Try to restart the activity
                    try {
                        recreate()
                    } catch (e: Exception) {
                        android.util.Log.e("BusListingActivity", "Failed to recreate activity", e)
                        finish()
                    }
                }
                .setNegativeButton("Go Back") { _, _ ->
                    finish()
                }
                .setCancelable(false)
                .show()
                
        } catch (e: Exception) {
            android.util.Log.e("BusListingActivity", "Critical error fallback also failed", e)
            Toast.makeText(this, "Critical error occurred. Returning to previous screen.", Toast.LENGTH_LONG).show()
            finish()
        }
    }
    
    override fun onOptionsItemSelected(item: MenuItem): Boolean {
        return when (item.itemId) {
            android.R.id.home -> {
                onBackPressed()
                true
            }
            else -> super.onOptionsItemSelected(item)
        }
    }
}