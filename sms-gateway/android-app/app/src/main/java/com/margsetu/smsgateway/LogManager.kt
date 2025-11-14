package com.margsetu.smsgateway

import android.content.Context
import android.content.SharedPreferences
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import java.text.SimpleDateFormat
import java.util.*
import kotlin.collections.ArrayList

class LogManager private constructor(context: Context) {
    
    private val prefs: SharedPreferences = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    private val gson = Gson()
    private val logs = mutableListOf<LogEntry>()
    
    companion object {
        private const val PREFS_NAME = "gateway_logs"
        private const val KEY_LOGS = "logs"
        private const val MAX_LOGS = 100
        
        @Volatile
        private var INSTANCE: LogManager? = null
        
        fun getInstance(context: Context): LogManager {
            return INSTANCE ?: synchronized(this) {
                INSTANCE ?: LogManager(context.applicationContext).also { INSTANCE = it }
            }
        }
    }
    
    init {
        loadLogs()
    }
    
    fun addLog(message: String, type: LogType = LogType.INFO) {
        val timestamp = System.currentTimeMillis()
        val logEntry = LogEntry(timestamp, message, type)
        
        synchronized(logs) {
            logs.add(0, logEntry) // Add to beginning
            
            // Keep only the latest MAX_LOGS entries
            if (logs.size > MAX_LOGS) {
                logs.removeAt(logs.size - 1)
            }
            
            saveLogs()
        }
    }
    
    fun getLogs(): List<LogEntry> {
        return synchronized(logs) {
            ArrayList(logs)
        }
    }
    
    fun clearLogs() {
        synchronized(logs) {
            logs.clear()
            saveLogs()
        }
    }
    
    private fun loadLogs() {
        try {
            val logsJson = prefs.getString(KEY_LOGS, null)
            if (logsJson != null) {
                val type = object : TypeToken<List<LogEntry>>() {}.type
                val savedLogs: List<LogEntry> = gson.fromJson(logsJson, type)
                synchronized(logs) {
                    logs.clear()
                    logs.addAll(savedLogs)
                }
            }
        } catch (e: Exception) {
            // If loading fails, start with empty logs
            synchronized(logs) {
                logs.clear()
            }
        }
    }
    
    private fun saveLogs() {
        try {
            val logsJson = gson.toJson(logs)
            prefs.edit().putString(KEY_LOGS, logsJson).apply()
        } catch (e: Exception) {
            // Ignore save errors
        }
    }
}

data class LogEntry(
    val timestamp: Long,
    val message: String,
    val type: LogType
) {
    fun getFormattedTime(): String {
        val formatter = SimpleDateFormat("HH:mm:ss", Locale.getDefault())
        return formatter.format(Date(timestamp))
    }
    
    fun getFormattedDate(): String {
        val formatter = SimpleDateFormat("MMM dd, yyyy", Locale.getDefault())
        return formatter.format(Date(timestamp))
    }
}

enum class LogType {
    INFO, SUCCESS, ERROR, WARNING
}