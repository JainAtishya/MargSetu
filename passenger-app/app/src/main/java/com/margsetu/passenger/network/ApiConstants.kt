package com.margsetu.passenger.network

object ApiConstants {
    // Backend API Configuration - Using Vercel Global Deployment
    const val BASE_URL = "https://vercel-backend-vert-psi.vercel.app/api/"
    // Consolidated passenger endpoint to work within Vercel function limits
    
    // API Endpoints - All use the consolidated passenger endpoint
    const val STATIONS = "passenger"
    const val BUSES_SEARCH = "passenger"
    const val BUSES_DETAILS = "passenger"
    const val BUSES_NEARBY = "passenger"
    const val BUS_LOCATION = "passenger"
    const val TIMETABLE = "passenger"
    
    // Action parameters for consolidated endpoint
    const val ACTION_STATIONS = "stations"
    const val ACTION_SEARCH = "search"
    const val ACTION_BUS_DETAILS = "bus-details"
    const val ACTION_NEARBY = "nearby"
    const val ACTION_BUS_LOCATION = "bus-location"
    const val ACTION_TIMETABLE = "timetable"
    
    // Request Parameters
    const val PARAM_FROM = "from"
    const val PARAM_TO = "to"
    const val PARAM_LAT = "lat"
    const val PARAM_LNG = "lng"
    const val PARAM_RADIUS = "radius"
    
    // Default Values
    const val DEFAULT_SEARCH_RADIUS = 5000 // 5km in meters
    const val DEFAULT_TIMEOUT = 30000L // 30 seconds
    
    // Response Keys
    const val KEY_SUCCESS = "success"
    const val KEY_DATA = "data"
    const val KEY_META = "meta"
    const val KEY_ERROR = "error"
    const val KEY_MESSAGE = "message"
    
    // Punjab Cities/Stations (for quick selection)
    val PUNJAB_CITIES = listOf(
        "Rajpura",
        "Zirakpur", 
        "Chandigarh",
        "Mohali",
        "Kharar",
        "Patiala"
    )
}