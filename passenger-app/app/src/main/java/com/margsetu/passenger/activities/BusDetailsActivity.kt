package com.margsetu.passenger.activities

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.MenuItem
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.drawable.Drawable
import androidx.annotation.DrawableRes
import android.widget.FrameLayout
import android.view.View
import android.widget.Button
import android.widget.ImageView
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.widget.Toolbar
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import com.margsetu.passenger.R
import com.margsetu.passenger.BuildConfig
import com.margsetu.passenger.models.Bus
import com.margsetu.passenger.network.ApiClient
import com.margsetu.passenger.utils.NetworkUtils
import com.margsetu.passenger.utils.SMSUtils
 
import com.google.android.gms.maps.GoogleMap
import com.google.android.gms.maps.MapView
import com.google.android.gms.maps.OnMapReadyCallback
import com.google.android.gms.maps.CameraUpdateFactory
import com.google.android.gms.maps.model.CircleOptions
import android.graphics.Color
import com.google.android.gms.maps.model.LatLng
import com.google.android.gms.maps.model.Marker
import com.google.android.gms.maps.model.MarkerOptions
import com.google.android.gms.maps.model.BitmapDescriptor
import com.google.android.gms.maps.model.BitmapDescriptorFactory
import okhttp3.OkHttpClient
import okhttp3.Request
import java.net.URLEncoder
import com.google.android.libraries.places.api.model.RectangularBounds
import com.google.android.libraries.places.api.net.FindAutocompletePredictionsRequest
import com.google.android.libraries.places.api.net.PlacesClient
import com.google.android.libraries.places.api.Places
import com.google.android.libraries.places.api.model.Place
import com.google.android.libraries.places.api.net.FetchPlaceRequest
import kotlinx.coroutines.tasks.await

class BusDetailsActivity : AppCompatActivity(), OnMapReadyCallback {
    companion object {
        private const val TAG = "BusDetailsActivity"
    }
    private lateinit var toolbar: Toolbar

    // Google Maps components
    private lateinit var mapContainer: View
    private lateinit var mapHost: FrameLayout
    private lateinit var mapPlaceholder: TextView
    private var mapView: MapView? = null
    private var googleMap: GoogleMap? = null
    private var busMarker: Marker? = null
    private var mapLoaded: Boolean = false
    private var mapLoadCheckJob: Job? = null
    private var pendingOrigin: LatLng? = null

    // Bus info views
    private lateinit var busNumber: TextView
    private lateinit var routeName: TextView
    private lateinit var currentLocation: TextView
    private lateinit var estimatedArrival: TextView
    private lateinit var occupancyText: TextView
    private lateinit var seatsInfo: TextView
    private lateinit var statusIndicator: View
    private lateinit var statusText: TextView

    // Driver info views
    private lateinit var driverName: TextView
    private lateinit var driverPhone: TextView
    private lateinit var callDriverButton: Button

    // Action buttons
    private lateinit var shareLocationButton: Button
    private lateinit var smsStatusButton: Button
    private lateinit var refreshButton: Button

    // Network status
    private lateinit var networkStatusView: View
    private lateinit var networkStatusText: TextView
    private lateinit var networkStatusIcon: ImageView

    private lateinit var bus: Bus
    private var fromLocation: String = ""
    private var toLocation: String = ""
    private var isSlowNetwork: Boolean = false

    // Networking / polling
    private var apiClient: ApiClient? = null
    private var pollJob: Job? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_bus_details)
        try {
            if (BuildConfig.DEBUG) Toast.makeText(this, "Details: onCreate()", Toast.LENGTH_SHORT).show()
            getIntentData()
            if (BuildConfig.DEBUG) Toast.makeText(this, "Details: intent OK (id=${try { bus.id } catch (_: Exception) { "?" }})", Toast.LENGTH_SHORT).show()
            initViews(savedInstanceState)
            if (BuildConfig.DEBUG) Toast.makeText(this, "Details: views OK", Toast.LENGTH_SHORT).show()
            setupToolbar()
            if (BuildConfig.DEBUG) Toast.makeText(this, "Details: toolbar OK", Toast.LENGTH_SHORT).show()
            setupClickListeners()
            displayBusDetails()
            if (BuildConfig.DEBUG) Toast.makeText(this, "Details: content set", Toast.LENGTH_SHORT).show()
            checkNetworkAndLoadMap()
            if (BuildConfig.DEBUG) Toast.makeText(this, "Details: map load invoked", Toast.LENGTH_SHORT).show()
        } catch (e: Exception) {
            android.util.Log.e("BusDetailsActivity", "onCreate error: ${e.message}", e)
            Toast.makeText(this, "Opening basic bus details", Toast.LENGTH_SHORT).show()
            // Keep user on this screen and show a friendly placeholder
            val placeholder = findViewById<TextView?>(R.id.mapPlaceholder)
            placeholder?.apply {
                text = "Map unavailable. Showing basic details."
                visibility = View.VISIBLE
            }
        }
    }

    private fun getIntentData() {
        try {
            // Ensure correct class loader for Parcelable to avoid ClassNotFoundException on some devices
            intent.extras?.classLoader = Bus::class.java.classLoader

            val parcelableBus = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                intent.getParcelableExtra("bus", Bus::class.java)
            } else {
                @Suppress("DEPRECATION")
                intent.getParcelableExtra("bus")
            }

            bus = parcelableBus ?: run {
                // Fallback: try JSON string extra
                val busJsonString = intent.getStringExtra("bus_json")
                if (!busJsonString.isNullOrBlank()) {
                    try {
                        Bus.fromJson(org.json.JSONObject(busJsonString))
                    } catch (e: Exception) {
                        android.util.Log.e("BusDetailsActivity", "Failed to parse bus_json: ${e.message}", e)
                        null
                    }
                } else null
            } ?: run {
                // Last-resort fallback: build from primitive extras
                try {
                    val id = intent.getStringExtra("busId") ?: ""
                    val number = intent.getStringExtra("busNumber") ?: ""
                    val route = intent.getStringExtra("routeName") ?: ""
                    val driverName = intent.getStringExtra("driverName") ?: ""
                    val driverPhone = intent.getStringExtra("driverPhone") ?: ""
                    val departureTime = intent.getStringExtra("departureTime") ?: ""
                    val arrivalTime = intent.getStringExtra("arrivalTime") ?: ""
                    val seatsAvailable = intent.getIntExtra("seatsAvailable", 0)
                    val totalSeats = intent.getIntExtra("totalSeats", 0)
                    val currentLocation = intent.getStringExtra("currentLocation") ?: ""
                    val occupancy = intent.getStringExtra("occupancy") ?: ""
                    val status = intent.getStringExtra("status") ?: ""
                    val estimatedArrival = intent.getStringExtra("estimatedArrival") ?: ""
                    val latitude = intent.getDoubleExtra("latitude", 0.0)
                    val longitude = intent.getDoubleExtra("longitude", 0.0)
                    Bus(
                        id = id,
                        number = number,
                        route = route,
                        driverName = driverName,
                        driverPhone = driverPhone,
                        departureTime = departureTime,
                        arrivalTime = arrivalTime,
                        seatsAvailable = seatsAvailable,
                        totalSeats = totalSeats,
                        currentLocation = currentLocation,
                        occupancy = occupancy,
                        status = status,
                        estimatedArrival = estimatedArrival,
                        latitude = latitude,
                        longitude = longitude
                    )
                } catch (e: Exception) {
                    android.util.Log.e("BusDetailsActivity", "No bus data available after all fallbacks: ${e.message}", e)
                    // Do NOT finish; construct a safe default to avoid bounce
                    Bus(
                        id = intent.getStringExtra("busId") ?: "",
                        number = intent.getStringExtra("busNumber") ?: "Unknown",
                        route = intent.getStringExtra("routeName") ?: "Unknown",
                        driverName = intent.getStringExtra("driverName") ?: "",
                        driverPhone = intent.getStringExtra("driverPhone") ?: "",
                        departureTime = intent.getStringExtra("departureTime") ?: "",
                        arrivalTime = intent.getStringExtra("arrivalTime") ?: "",
                        seatsAvailable = intent.getIntExtra("seatsAvailable", 0),
                        totalSeats = intent.getIntExtra("totalSeats", 0),
                        currentLocation = intent.getStringExtra("currentLocation") ?: "",
                        occupancy = intent.getStringExtra("occupancy") ?: "Medium",
                        status = intent.getStringExtra("status") ?: "unknown",
                        estimatedArrival = intent.getStringExtra("estimatedArrival") ?: "",
                        latitude = intent.getDoubleExtra("latitude", 0.0),
                        longitude = intent.getDoubleExtra("longitude", 0.0)
                    ).also {
                        Toast.makeText(this, "Showing basic details (partial bus data)", Toast.LENGTH_SHORT).show()
                    }
                }
            }

            fromLocation = intent.getStringExtra("fromLocation") ?: ""
            toLocation = intent.getStringExtra("toLocation") ?: ""
            isSlowNetwork = intent.getBooleanExtra("slowNetwork", false)
        } catch (e: Exception) {
            android.util.Log.e("BusDetailsActivity", "Error getting intent data: ${e.message}", e)
            // Do NOT finish; show placeholder content so user stays on screen
            Toast.makeText(this, "Loading basic bus details", Toast.LENGTH_SHORT).show()
            if (!::bus.isInitialized) {
                bus = Bus(
                    id = "",
                    number = "Unknown",
                    route = "Unknown",
                    driverName = "",
                    driverPhone = "",
                    departureTime = "",
                    arrivalTime = "",
                    seatsAvailable = 0,
                    totalSeats = 0,
                    currentLocation = "",
                    occupancy = "Medium",
                    status = "unknown",
                    estimatedArrival = "",
                    latitude = 0.0,
                    longitude = 0.0
                )
            }
        }
    }

    private fun initViews(savedInstanceState: Bundle?) {
        toolbar = findViewById(R.id.toolbar)

        // Google Map
        mapContainer = findViewById(R.id.mapContainer)
        mapPlaceholder = findViewById(R.id.mapPlaceholder)
        mapHost = findViewById(R.id.mapHost)
        try {
            // Create MapView programmatically to avoid XML inflation-time errors
            mapView = MapView(this).also { mv ->
                val lp: FrameLayout.LayoutParams = FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.MATCH_PARENT,
                    FrameLayout.LayoutParams.MATCH_PARENT
                )
                mapHost.addView(mv, lp)
                mv.onCreate(savedInstanceState)
                mv.getMapAsync(this)
            }
        } catch (e: Exception) {
            android.util.Log.e("BusDetailsActivity", "Map initialization problem: ${e.message}", e)
            // Don't finish; show placeholder instead
            mapPlaceholder.visibility = View.VISIBLE
            mapPlaceholder.text = "Map unavailable on this device."
        }

        // Bus info
        busNumber = findViewById(R.id.busNumber)
        routeName = findViewById(R.id.routeName)
        currentLocation = findViewById(R.id.currentLocation)
        estimatedArrival = findViewById(R.id.estimatedArrival)
        occupancyText = findViewById(R.id.occupancyText)
        seatsInfo = findViewById(R.id.seatsInfo)
        statusIndicator = findViewById(R.id.statusIndicator)
        statusText = findViewById(R.id.statusText)

        // Driver info
        driverName = findViewById(R.id.driverName)
        driverPhone = findViewById(R.id.driverPhone)
        callDriverButton = findViewById(R.id.callDriverButton)

        // Action buttons
        shareLocationButton = findViewById(R.id.shareLocationButton)
        smsStatusButton = findViewById(R.id.smsStatusButton)
        refreshButton = findViewById(R.id.refreshButton)

        // Network status
        networkStatusView = findViewById(R.id.networkStatusView)
        networkStatusText = findViewById(R.id.networkStatusText)
        networkStatusIcon = findViewById(R.id.networkStatusIcon)
    }

    private fun setupToolbar() {
        try {
            setSupportActionBar(toolbar)
            supportActionBar?.apply {
                title = "Bus Details"
                setDisplayHomeAsUpEnabled(true)
                setDisplayShowHomeEnabled(true)
            }
        } catch (e: Exception) {
            android.util.Log.e("BusDetailsActivity", "Toolbar setup failed: ${e.message}", e)
        }
    }

    private fun setupClickListeners() {
        callDriverButton.setOnClickListener { callDriver() }
        shareLocationButton.setOnClickListener { shareLocation() }
        smsStatusButton.setOnClickListener { SMSUtils.sendBusStatusSMS(this, bus.number) }
        refreshButton.setOnClickListener {
            checkNetworkAndLoadMap()
            displayBusDetails()
        }
        mapContainer.setOnClickListener { if (isSlowNetwork) showSlowNetworkMapDialog() }
    }

    private fun displayBusDetails() {
        busNumber.text = bus.number
        routeName.text = bus.route
        currentLocation.text = bus.currentLocation
        estimatedArrival.text = "ETA: ${bus.estimatedArrival}"
        occupancyText.text = "${bus.occupancy} Occupancy"
        seatsInfo.text = "${bus.seatsAvailable}/${bus.totalSeats} seats available"
        statusText.text = bus.status
        val statusColor = when (bus.status) {
            "Online" -> R.color.online_color
            "Offline" -> R.color.offline_color
            "Idle" -> R.color.idle_color
            else -> R.color.text_secondary
        }
        statusIndicator.setBackgroundColor(ContextCompat.getColor(this, statusColor))
        val occupancyColor = when (bus.occupancy) {
            "Low" -> R.color.success_color
            "Medium" -> R.color.warning_color
            "High" -> R.color.error_color
            else -> R.color.text_secondary
        }
        occupancyText.setTextColor(ContextCompat.getColor(this, occupancyColor))
        driverName.text = bus.driverName
        driverPhone.text = bus.driverPhone
    }

    private fun checkNetworkAndLoadMap() {
        when (NetworkUtils.getNetworkStatus(this)) {
            NetworkUtils.NetworkStatus.NO_INTERNET -> {
                showNetworkStatus("No Internet", R.drawable.ic_network_check, R.color.error_color)
                showNetworkLimitedMap()
            }
            NetworkUtils.NetworkStatus.SLOW -> {
                showNetworkStatus("Slow Network", R.drawable.ic_network_check, R.color.warning_color)
                showNetworkLimitedMap()
            }
            else -> {
                hideNetworkStatus()
                loadLiveMap()
            }
        }
    }

    private fun showNetworkStatus(text: String, icon: Int, color: Int) {
        networkStatusView.visibility = View.VISIBLE
        networkStatusText.text = text
        networkStatusIcon.setImageResource(icon)
        networkStatusText.setTextColor(ContextCompat.getColor(this, color))
    }

    private fun hideNetworkStatus() { networkStatusView.visibility = View.GONE }

    private fun loadLiveMap() {
        // Default to showing the map; use overlay text only for clear states
        val isOffline = bus.status.equals("offline", true)
        val notStarted = bus.status.equals("not started", true) || bus.status.equals("not started yet", true) || bus.status.equals("scheduled", true)
        val hasCoords = bus.latitude.isFinite() && bus.longitude.isFinite() && !(bus.latitude == 0.0 && bus.longitude == 0.0) && isValidLatLng(bus.latitude, bus.longitude)

        when {
            isOffline -> showBusOfflineMap()
            notStarted && !hasCoords -> {
                // Don't show placeholder overlay - just render origin marker on map
                // Let the actual map show through
                val originName = getOriginName()
                android.util.Log.d(TAG, "Bus not started, showing origin marker for: $originName")
                
                // Try immediate mapping first (no async needed)
                val mappedOrigin = getMappedOriginLatLng()
                if (mappedOrigin != null) {
                    renderOriginAt(mappedOrigin)
                } else {
                    // Always show Mumbai Central as default for buses not started
                    android.util.Log.d(TAG, "No specific origin found for ${bus.number}, showing Mumbai Central as default")
                    renderOriginAt(LatLng(18.9696, 72.8194))
                    
                    // Also try to resolve exact origin asynchronously for better accuracy
                    lifecycleScope.launch {
                        val origin = fetchOriginLatLng()
                        if (origin != null && origin != LatLng(18.9696, 72.8194)) {
                            android.util.Log.d(TAG, "Found better origin coordinates: $origin")
                            renderOriginAt(origin)
                        }
                    }
                }
            }
            hasCoords -> showLiveTrackingMap()
            bus.isOnline() && !hasCoords -> {
                mapPlaceholder.visibility = View.VISIBLE
                mapPlaceholder.text = "Online but location not available"
                renderBusOnMap()
            }
            else -> {
                // Unknown status: keep map visible with a subtle note
                mapPlaceholder.visibility = View.VISIBLE
                mapPlaceholder.text = "Fetching live map..."
                renderBusOnMap()
            }
        }
    }

    override fun onMapReady(map: GoogleMap) {
        try {
            googleMap = map
            mapLoaded = false
            android.util.Log.d(TAG, "Google Map initialized successfully")
            
            // Ensure a visible basemap and sensible defaults
            googleMap?.apply {
                // Use normal map type for better compatibility
                mapType = GoogleMap.MAP_TYPE_NORMAL
                isTrafficEnabled = false
                isBuildingsEnabled = true
                setMinZoomPreference(5f)
            }
            googleMap?.uiSettings?.apply {
                isCompassEnabled = true
                isZoomGesturesEnabled = true
                isScrollGesturesEnabled = true
                isZoomControlsEnabled = true
            }
            
            if (BuildConfig.DEBUG) Toast.makeText(this, "Map ready - initializing...", Toast.LENGTH_SHORT).show()

            // If we have a pending origin, render it now that map is ready
            pendingOrigin?.let { origin ->
                android.util.Log.d(TAG, "Rendering pending origin: $origin")
                renderOriginAt(origin)
            }

            // Success callback when map tiles finish loading
            googleMap?.setOnMapLoadedCallback {
                mapLoaded = true
                mapPlaceholder.visibility = View.GONE
                if (BuildConfig.DEBUG) Toast.makeText(this, "Map loaded successfully", Toast.LENGTH_SHORT).show()
                mapLoadCheckJob?.cancel()
                mapLoadCheckJob = null
            }

            // Immediately hide placeholder since GoogleMap is ready (don't wait for tiles)
            mapPlaceholder.visibility = View.GONE
            android.util.Log.d(TAG, "GoogleMap ready - hiding placeholder immediately")
            
            // Backup timer in case something goes wrong
            Handler(Looper.getMainLooper()).postDelayed({
                mapPlaceholder.visibility = View.GONE
                android.util.Log.d(TAG, "Backup: Ensuring placeholder is hidden")
            }, 1000) // Force hide after 1 second

            // Fallback: if map doesn't load within 8s, ensure placeholder is hidden
            mapLoadCheckJob?.cancel()
            mapLoadCheckJob = lifecycleScope.launch {
                try {
                    delay(8000) // Reduced back to 8s
                    if (!mapLoaded && googleMap != null) {
                        mapPlaceholder.visibility = View.GONE
                        android.util.Log.w(TAG, "Map tiles slow but hiding placeholder anyway")
                        
                        if (BuildConfig.DEBUG) {
                            Toast.makeText(
                                this@BusDetailsActivity,
                                "Map ready - tiles may load slowly",
                                Toast.LENGTH_SHORT
                            ).show()
                        }
                    }
                } catch (_: Exception) { /* ignore */ }
            }
            // Decide what to show based on status. Avoid double work: loadLiveMap includes render logic.
            checkNetworkAndLoadMap()
            // Default camera if nothing set yet
            if ((googleMap?.cameraPosition?.zoom ?: 0f) < 1f) {
                googleMap?.moveCamera(com.google.android.gms.maps.CameraUpdateFactory.newLatLngZoom(LatLng(19.0760, 72.8777), 9f))
            }
        } catch (e: Exception) {
            android.util.Log.e("BusDetailsActivity", "onMapReady failure: ${e.message}", e)
            mapPlaceholder.visibility = View.VISIBLE
            mapPlaceholder.text = "Map unavailable."
        }
    }

    private fun renderBusOnMap() {
        val map = googleMap ?: return
        val hasCoords = bus.latitude.isFinite() && bus.longitude.isFinite() && !(bus.latitude == 0.0 && bus.longitude == 0.0) && isValidLatLng(bus.latitude, bus.longitude)
        if (hasCoords) {
            val latLng = LatLng(bus.latitude, bus.longitude)
            if (busMarker == null) {
                busMarker = map.addMarker(
                    MarkerOptions()
                        .position(latLng)
                        .title("Bus ${bus.number}")
                )
                map.animateCamera(CameraUpdateFactory.newLatLngZoom(latLng, 14.5f))
            } else {
                busMarker?.position = latLng
            }
        }

        if (!hasCoords) {
            // Keep overlay visible with hint; do not hide map
            if (mapPlaceholder.visibility != View.VISIBLE) {
                mapPlaceholder.visibility = View.VISIBLE
                mapPlaceholder.text = "Live GPS not available yet."
            }
        } else {
            // Hide overlay when we have location
            mapPlaceholder.visibility = View.GONE
        }
    }

    private fun renderOriginAt(origin: LatLng) {
        val map = googleMap
        if (map == null) {
            android.util.Log.w(TAG, "Map not ready, storing origin for later: $origin")
            // Store the origin to render when map is ready
            pendingOrigin = origin
            return
        }
        
        android.util.Log.d(TAG, "Rendering bus marker at origin: $origin")
        
        val icon = bitmapDescriptorFromVector(R.drawable.ic_bus_marker)
        if (busMarker == null) {
            busMarker = map.addMarker(
                MarkerOptions()
                    .position(origin)
                    .title("Bus ${bus.number}")
                    .icon(icon)
                    .anchor(0.5f, 0.9f)
            )
            android.util.Log.d(TAG, "Created new bus marker at $origin")
        } else {
            busMarker?.apply {
                position = origin
                setIcon(icon)
            }
            android.util.Log.d(TAG, "Updated existing bus marker to $origin")
        }
        
        // Add a subtle origin circle to provide context even if tiles look plain
        try {
            map.addCircle(
                CircleOptions()
                    .center(origin)
                    .radius(200.0) // 200 meters
                    .strokeColor(Color.parseColor("#5B7BD5"))
                    .strokeWidth(2f)
                    .fillColor(Color.parseColor("#205B7BD5"))
            )
        } catch (e: Exception) { 
            android.util.Log.w(TAG, "Could not add origin circle: ${e.message}")
        }
        
        // Hide any blue overlay once we've placed the origin
        mapPlaceholder.visibility = View.GONE
        
        // Move camera to show the marker
        try {
            map.animateCamera(CameraUpdateFactory.newLatLngZoom(origin, 15.5f))
            android.util.Log.d(TAG, "Moved camera to origin location")
        } catch (e: Exception) {
            android.util.Log.w(TAG, "Could not animate camera: ${e.message}")
            // Fallback: try without animation
            try {
                map.moveCamera(CameraUpdateFactory.newLatLngZoom(origin, 15.5f))
            } catch (e2: Exception) {
                android.util.Log.w(TAG, "Could not move camera: ${e2.message}")
            }
        }
        
        // Show confirmation that marker was placed (even if tiles don't load)
        if (BuildConfig.DEBUG) {
            Toast.makeText(this@BusDetailsActivity, "Bus marker placed at origin", Toast.LENGTH_SHORT).show()
        }
        
        pendingOrigin = null // Clear pending origin
    }

    // Fast mapping-only guess for origin (no network)
    private fun getMappedOriginLatLng(): LatLng? {
        // Prefer explicit fromLocation, then try routeName/bus.route
        val source = (fromLocation.takeIf { it.isNotBlank() }
            ?: routeName.text?.toString()?.takeIf { it.isNotBlank() }
            ?: bus.route).orEmpty()
        val rawLower = source.lowercase()

        // Strong keyword mapping for common origins (instant)
        when {
            rawLower.contains("mumbai central") || rawLower.contains("mumbai") ->
                return LatLng(18.9696, 72.8194)
            rawLower.contains("pune railway") || rawLower.contains("pune station") || rawLower.contains("pune") ->
                return LatLng(18.5286, 73.8742)
            rawLower.contains("swargate") -> return LatLng(18.5018, 73.8627)
            rawLower.contains("nashik") -> return LatLng(19.9975, 73.7898)
            rawLower.contains("nagpur") -> return LatLng(21.1458, 79.0882)
            rawLower.contains("aurangabad") -> return LatLng(19.8762, 75.3433)
        }

        // If no specific match found, default to Mumbai Central for common bus routes
        if (source.isBlank()) {
            android.util.Log.d(TAG, "No route info available, defaulting to Mumbai Central")
            return LatLng(18.9696, 72.8194)
        }

        // Try Android Geocoder with India bias and better query
        val originQuery = getOriginName().ifBlank { source }.let { "$it, India" }
        return try {
            val geocoder = android.location.Geocoder(this, java.util.Locale("en", "IN"))
            // India bounding box to improve matches: lat 6.5..37.5, lon 68..97
            val list = geocoder.getFromLocationName(originQuery, 1, 6.5, 68.0, 37.5, 97.0)
            if (!list.isNullOrEmpty()) LatLng(list[0].latitude, list[0].longitude) else null
        } catch (_: Exception) {
            try {
                val geocoder = android.location.Geocoder(this)
                val list = geocoder.getFromLocationName(originQuery, 1)
                if (!list.isNullOrEmpty()) LatLng(list[0].latitude, list[0].longitude) else null
            } catch (_: Exception) { null }
        }
    }

    // Full resolution: keyword mapping -> Android Geocoder -> Google Geocoding Web API
    private suspend fun fetchOriginLatLng(): LatLng? {
        // 1) Quick mapping + Android Geocoder (with India bias)
        getMappedOriginLatLng()?.let { return it }

        // 2.5) Google Places Autocomplete (bias to India)
        try {
            val places: PlacesClient = Places.createClient(this)
            val originName = getOriginName().ifBlank { fromLocation.ifBlank { bus.route } }
            val query = (originName + ", India").trim()
            if (query.isNotBlank()) {
                val bounds = RectangularBounds.newInstance(
                    com.google.android.gms.maps.model.LatLng(6.5, 68.0),
                    com.google.android.gms.maps.model.LatLng(37.5, 97.0)
                )
                val request = FindAutocompletePredictionsRequest.builder()
                    .setQuery(query)
                    .setCountries(listOf("IN"))
                    .setLocationRestriction(bounds)
                    .build()
                val predictions = places.findAutocompletePredictions(request).await()
                val first = predictions.autocompletePredictions.firstOrNull()
                if (first != null) {
                    val placeId = first.placeId
                    val fetchReq = FetchPlaceRequest.newInstance(placeId, listOf(Place.Field.LAT_LNG, Place.Field.NAME))
                    val placeResp = places.fetchPlace(fetchReq).await()
                    val pLatLng = placeResp.place.latLng
                    if (pLatLng != null) return LatLng(pLatLng.latitude, pLatLng.longitude)
                    // Fallback: geocode primary text
                    val resolved = geocodeWeb(first.getPrimaryText(null).toString() + ", India")
                    if (resolved != null) return resolved
                }
            }
        } catch (_: Exception) { /* ignore */ }

        // 3) Google Geocoding API (requires Internet)
        return geocodeWeb(getOriginName().ifBlank { fromLocation.ifBlank { bus.route } } + ", India")
    }

    private fun geocodeWeb(queryRaw: String?): LatLng? {
        return try {
            val query = queryRaw?.trim().orEmpty()
            val apiKey = try { getString(R.string.google_maps_key) } catch (_: Exception) { null }
            if (apiKey.isNullOrBlank() || query.isBlank()) return null
            val encoded = URLEncoder.encode(query, Charsets.UTF_8.name())
            val url = "https://maps.googleapis.com/maps/api/geocode/json?address=$encoded&components=country:IN&key=$apiKey"
            val client = OkHttpClient()
            val request = Request.Builder().url(url).get().build()
            val response = client.newCall(request).execute()
            response.use { resp ->
                if (!resp.isSuccessful) return null
                val body = resp.body?.string().orEmpty()
                val latIdx = body.indexOf("\"location\":{\"lat\":")
                if (latIdx == -1) return null
                val afterLat = body.indexOf(':', latIdx) + 1
                val latStr = body.substring(afterLat).takeWhile { it in "-0123456789.eE" }
                val lngKey = body.indexOf("\"lng\":", afterLat)
                if (lngKey == -1) return null
                val lngStart = lngKey + 6
                val lngStr = body.substring(lngStart).takeWhile { it in "-0123456789.eE" }
                val lat = latStr.toDoubleOrNull()
                val lng = lngStr.toDoubleOrNull()
                if (lat != null && lng != null && isValidLatLng(lat, lng)) LatLng(lat, lng) else null
            }
        } catch (_: Exception) { null }
    }

    private fun getOriginName(): String {
        val raw = (fromLocation.takeIf { it.isNotBlank() }
            ?: routeName.text?.toString()?.takeIf { it.isNotBlank() }
            ?: bus.route).orEmpty()
        // Try to extract the first part before a dash
        val dashSplit = raw.split(" - ")
        val first = dashSplit.firstOrNull()?.trim().orEmpty()
        if (first.isNotBlank()) return first
        return raw.trim()
    }

    private fun bitmapDescriptorFromVector(@DrawableRes vectorResId: Int): BitmapDescriptor? {
        return try {
            val drawable: Drawable = ContextCompat.getDrawable(this, vectorResId) ?: return null
            val width = drawable.intrinsicWidth.takeIf { it > 0 } ?: 64
            val height = drawable.intrinsicHeight.takeIf { it > 0 } ?: 64
            drawable.setBounds(0, 0, width, height)
            val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
            val canvas = Canvas(bitmap)
            drawable.draw(canvas)
            BitmapDescriptorFactory.fromBitmap(bitmap)
        } catch (_: Exception) { null }
    }

    private fun startPolling() {
        if (pollJob != null) return
        val busId = bus.id.orEmpty()
        if (busId.isBlank()) {
            android.util.Log.w(TAG, "Skipping polling: empty busId")
            return
        }
        if (apiClient == null) {
            try {
                apiClient = ApiClient(this)
            } catch (e: Exception) {
                android.util.Log.e(TAG, "Cannot start polling, ApiClient init failed: ${e.message}", e)
                return
            }
        }
        pollJob = lifecycleScope.launch {
            while (true) {
                try {
                    val client = apiClient
                    if (client == null) {
                        android.util.Log.w(TAG, "Polling loop: ApiClient is null, skipping iteration")
                    } else {
                        val result = client.getBusLocation(busId)
                        if (result.success && result.latitude != null && result.longitude != null && isValidLatLng(result.latitude, result.longitude)) {
                            // Update bus coords and map source on UI thread
                            runOnUiThread {
                                // Only update if valid to avoid overwriting a good origin with invalid data
                                bus = bus.copy(latitude = result.latitude, longitude = result.longitude)
                                try {
                                    val map = googleMap
                                    if (map != null) {
                                        val latLng = LatLng(result.latitude, result.longitude)
                                        if (busMarker == null) {
                                            busMarker = map.addMarker(MarkerOptions().position(latLng).title("Bus ${'$'}{bus.number}"))
                                        } else {
                                            busMarker?.position = latLng
                                        }
                                        mapPlaceholder.visibility = View.GONE
                                        map.animateCamera(CameraUpdateFactory.newLatLngZoom(latLng, 14.5f))
                                    } else {
                                        renderBusOnMap()
                                    }
                                } catch (e: Exception) {
                                    android.util.Log.e(TAG, "Error updating map source: ${e.message}", e)
                                }
                            }
                        }
                    }
                } catch (e: Exception) {
                    android.util.Log.e(TAG, "Polling error: ${e.message}", e)
                }
                try {
                    delay(5000)
                } catch (ie: Exception) {
                    // Cancellation or delay error; break loop gracefully
                    android.util.Log.w(TAG, "Polling delay interrupted: ${ie.message}")
                    break
                }
            }
        }
    }

    private fun stopPolling() {
        pollJob?.cancel()
        pollJob = null
    }

    private fun showNetworkLimitedMap() {
        mapPlaceholder.visibility = View.VISIBLE
        mapPlaceholder.text = "Limited connectivity. Showing last known details."
    }

    private fun showBusNotStartedMap() { mapPlaceholder.apply {
        text = "Bus ${bus.number} • Not started yet"; visibility = View.VISIBLE } }

    private fun showLiveTrackingMap() { mapPlaceholder.visibility = View.GONE; renderBusOnMap() }

    private fun showOnlineButLocationUnknownMap() { mapPlaceholder.apply {
        text = "Online but location not available"; visibility = View.VISIBLE } }

    private fun showBusUnavailableMap() { mapPlaceholder.apply {
        text = "Bus unavailable"; visibility = View.VISIBLE } }

    private fun showBusOfflineMap() { mapPlaceholder.apply {
        text = "Bus is offline"; visibility = View.VISIBLE } }

    private fun callDriver() {
        val number = bus.driverPhone
        if (number.isNullOrBlank()) return
        val intent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:$number"))
        startActivity(intent)
    }

    private fun shareLocation() {
        if (!bus.latitude.isFinite() || !bus.longitude.isFinite() || (bus.latitude == 0.0 && bus.longitude == 0.0) || !isValidLatLng(bus.latitude, bus.longitude)) {
            Toast.makeText(this, "Live location unavailable", Toast.LENGTH_SHORT).show()
            return
        }
        val text = "Live location of Bus ${bus.number}: https://www.openstreetmap.org/?mlat=${bus.latitude}&mlon=${bus.longitude}#map=16/${bus.latitude}/${bus.longitude}"
        val sendIntent = Intent().apply {
            action = Intent.ACTION_SEND
            putExtra(Intent.EXTRA_TEXT, text)
            type = "text/plain"
        }
        startActivity(Intent.createChooser(sendIntent, "Share via"))
    }

    private fun showSlowNetworkMapDialog() {
        androidx.appcompat.app.AlertDialog.Builder(this)
            .setTitle("Limited Connectivity")
            .setMessage("Live map may be limited due to slow network. Continue anyway?")
            .setPositiveButton("Continue") { d, _ -> d.dismiss() }
            .setNegativeButton("Cancel", null)
            .show()
    }

    override fun onOptionsItemSelected(item: MenuItem): Boolean {
        return try {
            if (item.itemId == android.R.id.home) {
                // Use safe back navigation; do not rebuild parent if not needed
                onBackPressedDispatcher.onBackPressed()
                true
            } else super.onOptionsItemSelected(item)
        } catch (e: Exception) {
            android.util.Log.e("BusDetailsActivity", "Menu handling error: ${e.message}", e)
            true
        }
    }

    // MapView lifecycle
    override fun onStart() {
        super.onStart()
        try {
            mapView?.onStart()
        } catch (e: Exception) {
            android.util.Log.e(TAG, "mapView.onStart failed: ${e.message}", e)
        }
    }

    override fun onResume() {
        super.onResume()
        try {
            mapView?.onResume()
        } catch (e: Exception) {
            android.util.Log.e(TAG, "mapView.onResume failed: ${e.message}", e)
        }
        // Initialize ApiClient safely
        if (apiClient == null) {
            try {
                apiClient = ApiClient(this)
            } catch (e: Exception) {
                android.util.Log.e(TAG, "ApiClient init failed: ${e.message}", e)
            }
        }
        startPolling()
    }

    override fun onPause() {
        try {
            stopPolling()
            mapView?.onPause()
            mapLoadCheckJob?.cancel()
            mapLoadCheckJob = null
        } catch (e: Exception) {
            android.util.Log.e(TAG, "Lifecycle onPause failed: ${e.message}", e)
        }
        super.onPause()
    }

    override fun onStop() {
        try {
            mapView?.onStop()
        } catch (e: Exception) {
            android.util.Log.e(TAG, "mapView.onStop failed: ${e.message}", e)
        }
        super.onStop()
    }

    override fun onLowMemory() {
        super.onLowMemory()
        try {
            mapView?.onLowMemory()
        } catch (e: Exception) {
            android.util.Log.e(TAG, "mapView.onLowMemory failed: ${e.message}", e)
        }
    }

    override fun onDestroy() {
        try {
            mapView?.onDestroy()
            mapLoadCheckJob?.cancel()
            mapLoadCheckJob = null
        } catch (e: Exception) {
            android.util.Log.e(TAG, "mapView.onDestroy failed: ${e.message}", e)
        }
        super.onDestroy()
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        try {
            mapView?.onSaveInstanceState(outState)
        } catch (e: Exception) {
            android.util.Log.e(TAG, "mapView.onSaveInstanceState failed: ${e.message}", e)
        }
    }
}

// Small extension to avoid NPE when treating potentially nullable strings
private fun String?.orEmpty(): String = this ?: ""

// Coordinate validation helpers
private fun isValidLatLng(lat: Double?, lng: Double?): Boolean {
    if (lat == null || lng == null) return false
    if (!lat.isFinite() || !lng.isFinite()) return false
    if (lat < -90.0 || lat > 90.0) return false
    if (lng < -180.0 || lng > 180.0) return false
    return true
}