package com.margsetu.driver

import android.app.Application
import android.content.Context
import android.content.res.Configuration
import android.util.Log
import com.margsetu.driver.config.AppConfig
import com.margsetu.driver.utils.LanguageUtils

class MargSetuApplication : Application() {
    
    override fun onCreate() {
        super.onCreate()
        
        // Initialize app configuration
        AppConfig.initialize()
        Log.d("MargSetuApplication", "🚀 MargSetu Driver App initialized")
        
        // Apply saved language when app starts
        val savedLanguage = LanguageUtils.getAppLanguage(this)
        LanguageUtils.updateAppLocale(this, savedLanguage)
    }
    
    override fun attachBaseContext(base: Context) {
        val savedLanguage = LanguageUtils.getAppLanguage(base)
        val context = updateBaseContextLocale(base, savedLanguage)
        super.attachBaseContext(context)
    }
    
    private fun updateBaseContextLocale(context: Context, language: String): Context {
        val locale = java.util.Locale(language)
        java.util.Locale.setDefault(locale)
        
        return if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.N) {
            val configuration = Configuration()
            configuration.setLocale(locale)
            context.createConfigurationContext(configuration)
        } else {
            val configuration = context.resources.configuration
            @Suppress("DEPRECATION")
            configuration.locale = locale
            @Suppress("DEPRECATION")
            context.resources.updateConfiguration(configuration, context.resources.displayMetrics)
            context
        }
    }
}