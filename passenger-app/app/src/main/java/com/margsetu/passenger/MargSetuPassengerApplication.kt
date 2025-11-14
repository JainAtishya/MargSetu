package com.margsetu.passenger

import android.app.Application
import com.google.android.libraries.places.api.Places
import com.margsetu.passenger.R

class MargSetuPassengerApplication : Application() {
    
    override fun onCreate() {
        super.onCreate()
        instance = this
        try {
            if (!Places.isInitialized()) {
                Places.initialize(applicationContext, getString(R.string.google_maps_key))
            }
        } catch (_: Exception) { /* safe-init */ }
    }
    
    companion object {
        lateinit var instance: MargSetuPassengerApplication
            private set
    }
}