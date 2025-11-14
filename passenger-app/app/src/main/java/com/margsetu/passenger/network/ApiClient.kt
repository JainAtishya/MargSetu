package com.margsetu.passenger.network

import android.content.Context
import android.util.Log
import com.margsetu.passenger.models.Bus
import com.margsetu.passenger.models.Station
import com.margsetu.passenger.models.TimetableEntry
import com.margsetu.passenger.utils.NetworkUtils
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedReader
import java.io.IOException
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder

class ApiClient(private val context: Context) {
    
    companion object {
        private const val TAG = "ApiClient"
        private const val CHARSET = "UTF-8"
    }
    
    data class BusLocation(
        val success: Boolean,
        val busId: String?,
        val latitude: Double?,
        val longitude: Double?,
        val gpsLastUpdated: String?,
        val status: String?,
        val message: String? = null
    )

    // Get live location for a bus
    suspend fun getBusLocation(busId: String): BusLocation = withContext(Dispatchers.IO) {
        try {
            val url = "${ApiConstants.BASE_URL}${ApiConstants.BUS_LOCATION}?action=${ApiConstants.ACTION_BUS_LOCATION}&busId=$busId"
            Log.d(TAG, "Getting bus live location: $url")
            val response = makeGetRequest(url)
            if (response.isNotEmpty()) {
                val json = JSONObject(response)
                val ok = json.optBoolean("success", false)
                val data = json.optJSONObject("data") ?: json
                // Be defensive: optDouble() without default can return NaN
                // Normalize invalid/missing values to null so callers can ignore them safely
                val rawLat = if (data.has("latitude")) data.optDouble("latitude", Double.NaN) else Double.NaN
                val rawLng = if (data.has("longitude")) data.optDouble("longitude", Double.NaN) else Double.NaN
                val normLat: Double? = when {
                    rawLat.isNaN() -> null
                    rawLat < -90.0 || rawLat > 90.0 -> null
                    else -> rawLat
                }
                val normLng: Double? = when {
                    rawLng.isNaN() -> null
                    rawLng < -180.0 || rawLng > 180.0 -> null
                    else -> rawLng
                }
                return@withContext BusLocation(
                    success = ok,
                    busId = data.optString("busId", busId),
                    latitude = normLat,
                    longitude = normLng,
                    gpsLastUpdated = data.optString("gpsLastUpdated", null),
                    status = data.optString("status", null),
                    message = json.optString("message", null)
                )
            }
            BusLocation(false, busId, null, null, null, null, "Empty response")
        } catch (e: Exception) {
            Log.e(TAG, "getBusLocation failed: ${e.message}", e)
            BusLocation(false, busId, null, null, null, null, e.message)
        }
    }
    // Lightweight health check to verify connectivity to backend
    suspend fun ping(): ApiResponse<Boolean> = withContext(Dispatchers.IO) {
        return@withContext try {
            val url = "${ApiConstants.BASE_URL}health"
            Log.d(TAG, "🩺 Pinging backend: $url")
            val response = makeGetRequest(url)
            if (response.isNotEmpty()) {
                val json = JSONObject(response)
                val ok = json.optBoolean(ApiConstants.KEY_SUCCESS, true)
                Log.d(TAG, "🩺 Ping success: $ok | payload: ${response.take(120)}...")
                ApiResponse(true, ok)
            } else {
                Log.e(TAG, "❌ Empty ping response")
                ApiResponse(false, null, "Empty ping response")
            }
        } catch (e: Exception) {
            Log.e(TAG, "❌ Ping failed: ${e.message}", e)
            ApiResponse(false, null, e.message)
        }
    }

    // Data class for API response
    data class ApiResponse<T>(
        val success: Boolean,
        val data: T?,
        val error: String? = null,
        val meta: Map<String, Any>? = null
    )
    
    // Check if API is available
    suspend fun isApiAvailable(): Boolean = withContext(Dispatchers.IO) {
        return@withContext try {
            if (!NetworkUtils.isNetworkAvailable(context)) {
                Log.w(TAG, "No network available")
                return@withContext false
            }
            
            val connection = URL("${ApiConstants.BASE_URL.trimEnd('/')}/../health").openConnection() as HttpURLConnection
            connection.apply {
                requestMethod = "GET"
                connectTimeout = 5000
                readTimeout = 5000
            }
            
            val responseCode = connection.responseCode
            connection.disconnect()
            
            responseCode == HttpURLConnection.HTTP_OK
        } catch (e: Exception) {
            Log.e(TAG, "API availability check failed: ${e.message}", e)
            false
        }
    }
    
    // Search buses between stations
    suspend fun searchBuses(from: String, to: String): ApiResponse<List<Bus>> = withContext(Dispatchers.IO) {
        return@withContext try {
            Log.d(TAG, "🚀 === SEARCH BUSES API CALL ===")
            Log.d(TAG, "🌐 From: $from")
            Log.d(TAG, "🌐 To: $to")
            
            // SKIP NETWORK CHECK FOR TESTING
            Log.d(TAG, "⚠️ SKIPPING NETWORK CHECK FOR DEBUGGING")
            
            val encodedFrom = URLEncoder.encode(from, CHARSET)
            val encodedTo = URLEncoder.encode(to, CHARSET)
            val url = "${ApiConstants.BASE_URL}${ApiConstants.BUSES_SEARCH}?action=${ApiConstants.ACTION_SEARCH}&${ApiConstants.PARAM_FROM}=$encodedFrom&${ApiConstants.PARAM_TO}=$encodedTo"
            
            Log.d(TAG, "🔗 Full URL: $url")
            Log.d(TAG, "📞 Making HTTP GET request...")
            
            val response = makeGetRequest(url)
            Log.d(TAG, "📋 Raw Response: $response")
            
            if (response.isNotEmpty()) {
                Log.d(TAG, "✅ Got response, parsing JSON...")
                val jsonResponse = JSONObject(response)
                val success = jsonResponse.getBoolean("success")
                
                Log.d(TAG, "📊 JSON parsed - success: $success")
                
                if (success) {
                    // Backend returns 'buses' array, not 'data'
                    val busesArray = jsonResponse.getJSONArray("buses")
                    val buses = mutableListOf<Bus>()
                    
                    Log.d(TAG, "🚌 Found ${busesArray.length()} buses in response")
                    
                    for (i in 0 until busesArray.length()) {
                        val busJson = busesArray.getJSONObject(i)
                        buses.add(Bus.fromJson(busJson))
                        Log.d(TAG, "🚌 Parsed bus $i: ${busJson.optString("number", "unknown")}")
                    }
                    
                    Log.d(TAG, "✅ Successfully parsed ${buses.size} buses")
                    return@withContext ApiResponse(true, buses)
                } else {
                    val errorMessage = jsonResponse.optString("message", "No buses found")
                    Log.w(TAG, "❌ Search failed from backend: $errorMessage")
                    return@withContext ApiResponse(false, emptyList(), errorMessage)
                }
            } else {
                Log.e(TAG, "❌ EMPTY RESPONSE from server")
                return@withContext ApiResponse(false, null, "Empty response from server")
            }
        } catch (e: Exception) {
            Log.e(TAG, "💥 EXCEPTION in searchBuses: ${e.message}", e)
            Log.e(TAG, "🔍 Exception type: ${e.javaClass.simpleName}")
            return@withContext ApiResponse(false, null, "Failed to search buses: ${e.message}")
        }
    }
    
    // Get bus details by ID
    suspend fun getBusDetails(busId: String): ApiResponse<Bus> = withContext(Dispatchers.IO) {
        return@withContext try {
            if (!NetworkUtils.isNetworkAvailable(context)) {
                return@withContext ApiResponse(false, null, "No internet connection")
            }
            
            val url = "${ApiConstants.BASE_URL}${ApiConstants.BUSES_DETAILS}?action=${ApiConstants.ACTION_BUS_DETAILS}&busId=$busId"
            
            Log.d(TAG, "Getting bus details: $url")
            
            val response = makeGetRequest(url)
            if (response.isNotEmpty()) {
                val jsonResponse = JSONObject(response)
                val success = jsonResponse.getBoolean(ApiConstants.KEY_SUCCESS)
                
                if (success) {
                    val busJson = jsonResponse.getJSONObject(ApiConstants.KEY_DATA)
                    val bus = Bus.fromJson(busJson)
                    
                    Log.d(TAG, "Got bus details for: ${bus.number}")
                    return@withContext ApiResponse(true, bus)
                } else {
                    val error = jsonResponse.optJSONObject(ApiConstants.KEY_ERROR)
                    val errorMessage = error?.optString(ApiConstants.KEY_MESSAGE) ?: "Bus not found"
                    return@withContext ApiResponse(false, null, errorMessage)
                }
            } else {
                return@withContext ApiResponse(false, null, "Empty response from server")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error getting bus details: ${e.message}", e)
            return@withContext ApiResponse(false, null, "Failed to get bus details: ${e.message}")
        }
    }
    
    // Get nearby buses based on location
    suspend fun getNearbyBuses(lat: Double, lng: Double, radius: Int = ApiConstants.DEFAULT_SEARCH_RADIUS): ApiResponse<List<Bus>> = withContext(Dispatchers.IO) {
        return@withContext try {
            if (!NetworkUtils.isNetworkAvailable(context)) {
                return@withContext ApiResponse(false, null, "No internet connection")
            }
            
            val url = "${ApiConstants.BASE_URL}${ApiConstants.BUSES_NEARBY}?action=${ApiConstants.ACTION_NEARBY}&" +
                    "${ApiConstants.PARAM_LAT}=$lat&" +
                    "${ApiConstants.PARAM_LNG}=$lng&" +
                    "${ApiConstants.PARAM_RADIUS}=$radius"
            
            Log.d(TAG, "Getting nearby buses: $url")
            
            val response = makeGetRequest(url)
            if (response.isNotEmpty()) {
                val jsonResponse = JSONObject(response)
                val success = jsonResponse.getBoolean(ApiConstants.KEY_SUCCESS)
                
                if (success) {
                    val dataArray = jsonResponse.getJSONArray(ApiConstants.KEY_DATA)
                    val buses = mutableListOf<Bus>()
                    
                    for (i in 0 until dataArray.length()) {
                        val busJson = dataArray.getJSONObject(i)
                        buses.add(Bus.fromJson(busJson))
                    }
                    
                    Log.d(TAG, "Found ${buses.size} nearby buses")
                    return@withContext ApiResponse(true, buses)
                } else {
                    val error = jsonResponse.optJSONObject(ApiConstants.KEY_ERROR)
                    val errorMessage = error?.optString(ApiConstants.KEY_MESSAGE) ?: "No nearby buses found"
                    return@withContext ApiResponse(false, null, errorMessage)
                }
            } else {
                return@withContext ApiResponse(false, null, "Empty response from server")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error getting nearby buses: ${e.message}", e)
            return@withContext ApiResponse(false, null, "Failed to get nearby buses: ${e.message}")
        }
    }
    
    // Get all stations
    suspend fun getStations(): ApiResponse<List<Station>> = withContext(Dispatchers.IO) {
        return@withContext try {
            if (!NetworkUtils.isNetworkAvailable(context)) {
                return@withContext ApiResponse(false, null, "No internet connection")
            }
            
            val url = "${ApiConstants.BASE_URL}${ApiConstants.STATIONS}?action=${ApiConstants.ACTION_STATIONS}"
            
            Log.d(TAG, "Getting stations: $url")
            
            val response = makeGetRequest(url)
            if (response.isNotEmpty()) {
                val jsonResponse = JSONObject(response)
                val success = jsonResponse.getBoolean(ApiConstants.KEY_SUCCESS)
                
                if (success) {
                    val dataArray = jsonResponse.getJSONArray(ApiConstants.KEY_DATA)
                    val stations = mutableListOf<Station>()
                    
                    for (i in 0 until dataArray.length()) {
                        val stationJson = dataArray.getJSONObject(i)
                        stations.add(Station.fromJson(stationJson))
                    }
                    
                    Log.d(TAG, "Found ${stations.size} stations")
                    return@withContext ApiResponse(true, stations)
                } else {
                    val error = jsonResponse.optJSONObject(ApiConstants.KEY_ERROR)
                    val errorMessage = error?.optString(ApiConstants.KEY_MESSAGE) ?: "Failed to load stations"
                    return@withContext ApiResponse(false, null, errorMessage)
                }
            } else {
                return@withContext ApiResponse(false, null, "Empty response from server")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error getting stations: ${e.message}", e)
            return@withContext ApiResponse(false, null, "Failed to get stations: ${e.message}")
        }
    }
    
    // Get timetable for route
    suspend fun getTimetable(from: String, to: String): ApiResponse<List<TimetableEntry>> = withContext(Dispatchers.IO) {
        return@withContext try {
            if (!NetworkUtils.isNetworkAvailable(context)) {
                return@withContext ApiResponse(false, null, "No internet connection")
            }
            
            val encodedFrom = URLEncoder.encode(from, CHARSET)
            val encodedTo = URLEncoder.encode(to, CHARSET)
            val url = "${ApiConstants.BASE_URL}${ApiConstants.TIMETABLE}?action=${ApiConstants.ACTION_TIMETABLE}&${ApiConstants.PARAM_FROM}=$encodedFrom&${ApiConstants.PARAM_TO}=$encodedTo"
            
            Log.d(TAG, "Getting timetable: $url")
            
            val response = makeGetRequest(url)
            if (response.isNotEmpty()) {
                val jsonResponse = JSONObject(response)
                val success = jsonResponse.getBoolean(ApiConstants.KEY_SUCCESS)
                
                if (success) {
                    val dataArray = jsonResponse.getJSONArray(ApiConstants.KEY_DATA)
                    val timetable = mutableListOf<TimetableEntry>()
                    
                    for (i in 0 until dataArray.length()) {
                        val entryJson = dataArray.getJSONObject(i)
                        timetable.add(TimetableEntry.fromJson(entryJson))
                    }
                    
                    Log.d(TAG, "Found ${timetable.size} timetable entries")
                    return@withContext ApiResponse(true, timetable)
                } else {
                    val error = jsonResponse.optJSONObject(ApiConstants.KEY_ERROR)
                    val errorMessage = error?.optString(ApiConstants.KEY_MESSAGE) ?: "No timetable found"
                    return@withContext ApiResponse(false, null, errorMessage)
                }
            } else {
                return@withContext ApiResponse(false, null, "Empty response from server")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error getting timetable: ${e.message}", e)
            return@withContext ApiResponse(false, null, "Failed to get timetable: ${e.message}")
        }
    }
    
    // Make GET request helper
    private fun makeGetRequest(urlString: String): String {
        return try {
            Log.d(TAG, "🌐 === HTTP GET REQUEST ===")
            Log.d(TAG, "🔗 URL: $urlString")
            
            val url = URL(urlString)
            val connection = url.openConnection() as HttpURLConnection
            
            Log.d(TAG, "🔧 Configuring connection...")
            connection.apply {
                requestMethod = "GET"
                connectTimeout = 15000  // Increased from 10s to 15s
                readTimeout = 15000     // Increased from 10s to 15s
                setRequestProperty("Accept", "application/json")
                setRequestProperty("Content-Type", "application/json")
                setRequestProperty("User-Agent", "MargSetu-Passenger-Android")
                setRequestProperty("Connection", "close")  // Force connection close
                useCaches = false
            }
            
            Log.d(TAG, "📡 Connecting to server...")
            
            try {
                connection.connect()
                Log.d(TAG, "✅ Connection established successfully")
            } catch (e: Exception) {
                Log.e(TAG, "❌ Failed to establish connection: ${e.message}", e)
                throw e
            }
            
            val responseCode = connection.responseCode
            Log.d(TAG, "📊 HTTP Response Code: $responseCode for $urlString")
            
            if (responseCode == HttpURLConnection.HTTP_OK) {
                Log.d(TAG, "✅ HTTP 200 OK - Reading response...")
                val inputStream = connection.inputStream
                val reader = BufferedReader(InputStreamReader(inputStream, CHARSET))
                val response = StringBuilder()
                var line: String?
                
                while (reader.readLine().also { line = it } != null) {
                    response.append(line)
                }
                
                reader.close()
                inputStream.close()
                connection.disconnect()
                
                val responseString = response.toString()
                Log.d(TAG, "📋 Response length: ${responseString.length} characters")
                Log.d(TAG, "📋 Response preview: ${responseString.take(200)}...")
                
                responseString
            } else {
                Log.e(TAG, "❌ HTTP Error $responseCode")
                
                // Read error response
                val errorStream = connection.errorStream
                if (errorStream != null) {
                    val reader = BufferedReader(InputStreamReader(errorStream, CHARSET))
                    val errorResponse = StringBuilder()
                    var line: String?
                    
                    while (reader.readLine().also { line = it } != null) {
                        errorResponse.append(line)
                    }
                    
                    reader.close()
                    errorStream.close()
                    Log.e(TAG, "❌ Error Response: $errorResponse")
                }
                
                connection.disconnect()
                ""
            }
        } catch (e: IOException) {
            Log.e(TAG, "💥 NETWORK EXCEPTION: ${e.message}", e)
            Log.e(TAG, "🔍 Exception type: ${e.javaClass.simpleName}")
            if (e.cause != null) {
                Log.e(TAG, "🔍 Root cause: ${e.cause?.message}")
            }
            ""
        }
    }
}