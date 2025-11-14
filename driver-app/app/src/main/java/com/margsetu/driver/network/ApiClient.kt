package com.margsetu.driver.network

import android.util.Log
import com.margsetu.driver.config.AppConfig
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

object ApiClient {
    
    // Use centralized configuration
    private val BASE_URL = AppConfig.Server.API_BASE_URL
    
    init {
        AppConfig.initialize()
    }
    
    private val httpClient = OkHttpClient.Builder()
        .addInterceptor(HttpLoggingInterceptor().apply {
            level = if (AppConfig.Network.ENABLE_LOGGING) 
                HttpLoggingInterceptor.Level.BODY 
            else 
                HttpLoggingInterceptor.Level.NONE
        })
        .addInterceptor { chain ->
            val request = chain.request()
            Log.d("ApiClient", "🌐 REQUEST: ${request.method} ${request.url}")
            Log.d("ApiClient", "🌐 HEADERS: ${request.headers}")
            
            try {
                val startTime = System.currentTimeMillis()
                val response = chain.proceed(request)
                val duration = System.currentTimeMillis() - startTime
                
                Log.d("ApiClient", "✅ RESPONSE: ${response.code} ${response.message} (${duration}ms)")
                
                // Log rate limiting info if present
                response.headers["X-RateLimit-Remaining"]?.let { remaining ->
                    Log.d("ApiClient", "⏱️ Rate limit remaining: $remaining")
                }
                
                response
            } catch (e: Exception) {
                Log.e("ApiClient", "❌ NETWORK ERROR: ${e.javaClass.simpleName}: ${e.message}")
                Log.e("ApiClient", "❌ URL: ${request.url}")
                if (AppConfig.Network.ENABLE_LOGGING) {
                    Log.e("ApiClient", "❌ FULL STACK: ", e)
                }
                throw e
            }
        }
        .connectTimeout(AppConfig.Server.CONNECT_TIMEOUT, TimeUnit.SECONDS)
        .readTimeout(AppConfig.Server.READ_TIMEOUT, TimeUnit.SECONDS)
        .writeTimeout(AppConfig.Server.WRITE_TIMEOUT, TimeUnit.SECONDS)
        .build()
    
    private val retrofit = Retrofit.Builder()
        .baseUrl(BASE_URL)
        .client(httpClient)
        .addConverterFactory(GsonConverterFactory.create())
        .build()
    
    val apiService: ApiService = retrofit.create(ApiService::class.java)
}