package com.margsetu.passenger.utils

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.Build

object NetworkUtils {
    
    enum class NetworkStatus {
        NO_INTERNET,
        SLOW,
        MODERATE, 
        FAST
    }
    
    fun isNetworkAvailable(context: Context): Boolean {
        return try {
            val connectivityManager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val network = connectivityManager.activeNetwork ?: return false
                val capabilities = connectivityManager.getNetworkCapabilities(network) ?: return false
                capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
            } else {
                @Suppress("DEPRECATION")
                val networkInfo = connectivityManager.activeNetworkInfo
                networkInfo?.isConnected == true
            }
        } catch (e: Exception) {
            android.util.Log.e("NetworkUtils", "Error checking network availability: ${e.message}", e)
            // Default to true to avoid blocking app functionality
            true
        }
    }
    
    fun getNetworkStatus(context: Context): NetworkStatus {
        return try {
            if (!isNetworkAvailable(context)) {
                return NetworkStatus.NO_INTERNET
            }
            
            val connectivityManager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val network = connectivityManager.activeNetwork
                val capabilities = connectivityManager.getNetworkCapabilities(network)
                
                capabilities?.let { caps ->
                    when {
                        caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> {
                            // WiFi - assume fast
                            NetworkStatus.FAST
                        }
                        caps.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) -> {
                            // Cellular - assume moderate to avoid permission issues
                            NetworkStatus.MODERATE
                        }
                        else -> NetworkStatus.MODERATE
                    }
                } ?: NetworkStatus.MODERATE
            } else {
                @Suppress("DEPRECATION")
                val networkInfo = connectivityManager.activeNetworkInfo
                when (networkInfo?.type) {
                    ConnectivityManager.TYPE_WIFI -> NetworkStatus.FAST
                    ConnectivityManager.TYPE_MOBILE -> NetworkStatus.MODERATE
                    else -> NetworkStatus.MODERATE
                }
            }
        } catch (e: Exception) {
            android.util.Log.e("NetworkUtils", "Error getting network status: ${e.message}", e)
            // Default to FAST to avoid blocking app functionality
            NetworkStatus.FAST
        }
    }
    
    fun getNetworkStatusDescription(status: NetworkStatus): String {
        return when (status) {
            NetworkStatus.NO_INTERNET -> "No Internet Connection"
            NetworkStatus.SLOW -> "Slow Network - SMS Mode Active"
            NetworkStatus.MODERATE -> "Moderate Network Speed"
            NetworkStatus.FAST -> "Fast Network Connection"
        }
    }
}