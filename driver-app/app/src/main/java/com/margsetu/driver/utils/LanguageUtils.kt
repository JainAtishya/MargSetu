package com.margsetu.driver.utils

import android.content.Context
import android.content.SharedPreferences
import android.content.res.Configuration
import android.os.Build
import java.util.*

object LanguageUtils {
    
    private const val PREFS_NAME = "language_prefs"
    private const val KEY_LANGUAGE = "selected_language"
    
    // Supported languages
    const val ENGLISH = "en"
    const val HINDI = "hi" 
    const val PUNJABI = "pa"
    
    fun setAppLanguage(context: Context, languageCode: String) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit().putString(KEY_LANGUAGE, languageCode).apply()
        
        updateAppLocale(context, languageCode)
    }
    
    fun getAppLanguage(context: Context): String {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        return prefs.getString(KEY_LANGUAGE, ENGLISH) ?: ENGLISH
    }
    
    fun updateAppLocale(context: Context, languageCode: String) {
        val locale = Locale(languageCode)
        Locale.setDefault(locale)
        
        val config = Configuration(context.resources.configuration)
        config.setLocale(locale)
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            context.createConfigurationContext(config)
            context.resources.updateConfiguration(config, context.resources.displayMetrics)
        } else {
            @Suppress("DEPRECATION")
            context.resources.updateConfiguration(config, context.resources.displayMetrics)
        }
    }
    
    fun restartApp(context: Context) {
        val packageManager = context.packageManager
        val intent = packageManager.getLaunchIntentForPackage(context.packageName)
        val componentName = intent!!.component
        val mainIntent = android.content.Intent.makeRestartActivityTask(componentName)
        context.startActivity(mainIntent)
        System.exit(0)
    }
    
    fun restartToActivity(context: Context, targetActivity: Class<*>) {
        val intent = android.content.Intent(context, targetActivity)
        intent.flags = android.content.Intent.FLAG_ACTIVITY_NEW_TASK or android.content.Intent.FLAG_ACTIVITY_CLEAR_TASK
        context.startActivity(intent)
        if (context is android.app.Activity) {
            context.finish()
        }
    }
    
    fun getLanguageDisplayName(languageCode: String): String {
        return when (languageCode) {
            ENGLISH -> "English"
            HINDI -> "हिंदी"
            PUNJABI -> "ਪੰਜਾਬੀ"
            else -> "English"
        }
    }
    
    fun getSupportedLanguages(): List<Pair<String, String>> {
        return listOf(
            Pair(ENGLISH, "English"),
            Pair(HINDI, "हिंदी"),
            Pair(PUNJABI, "ਪੰਜਾਬੀ")
        )
    }
}