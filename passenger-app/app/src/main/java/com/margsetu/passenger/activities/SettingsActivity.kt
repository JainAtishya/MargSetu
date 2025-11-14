package com.margsetu.passenger.activities

import android.os.Bundle
import android.view.MenuItem
import android.widget.Switch
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.widget.Toolbar
import com.margsetu.passenger.R

class SettingsActivity : AppCompatActivity() {
    
    private lateinit var toolbar: Toolbar
    private lateinit var notificationsSwitch: Switch
    private lateinit var locationSwitch: Switch
    private lateinit var darkModeSwitch: Switch
    private lateinit var autoRefreshSwitch: Switch
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_settings)
        
        initViews()
        setupToolbar()
        loadSettings()
        setupClickListeners()
    }
    
    private fun initViews() {
        toolbar = findViewById(R.id.toolbar)
        notificationsSwitch = findViewById(R.id.notificationsSwitch)
        locationSwitch = findViewById(R.id.locationSwitch)
        darkModeSwitch = findViewById(R.id.darkModeSwitch)
        autoRefreshSwitch = findViewById(R.id.autoRefreshSwitch)
    }
    
    private fun setupToolbar() {
        setSupportActionBar(toolbar)
        supportActionBar?.apply {
            setDisplayHomeAsUpEnabled(true)
            title = "Settings"
        }
    }
    
    private fun loadSettings() {
        val sharedPref = getSharedPreferences("MargSetuPassengerSettings", MODE_PRIVATE)
        
        notificationsSwitch.isChecked = sharedPref.getBoolean("notifications_enabled", true)
        locationSwitch.isChecked = sharedPref.getBoolean("location_enabled", true)
        darkModeSwitch.isChecked = sharedPref.getBoolean("dark_mode_enabled", false)
        autoRefreshSwitch.isChecked = sharedPref.getBoolean("auto_refresh_enabled", true)
    }
    
    private fun setupClickListeners() {
        notificationsSwitch.setOnCheckedChangeListener { _, isChecked ->
            saveSetting("notifications_enabled", isChecked)
            Toast.makeText(this, "Notifications ${if (isChecked) "enabled" else "disabled"}", Toast.LENGTH_SHORT).show()
        }
        
        locationSwitch.setOnCheckedChangeListener { _, isChecked ->
            saveSetting("location_enabled", isChecked)
            Toast.makeText(this, "Location services ${if (isChecked) "enabled" else "disabled"}", Toast.LENGTH_SHORT).show()
        }
        
        darkModeSwitch.setOnCheckedChangeListener { _, isChecked ->
            saveSetting("dark_mode_enabled", isChecked)
            Toast.makeText(this, "Dark mode ${if (isChecked) "enabled" else "disabled"} (restart required)", Toast.LENGTH_SHORT).show()
        }
        
        autoRefreshSwitch.setOnCheckedChangeListener { _, isChecked ->
            saveSetting("auto_refresh_enabled", isChecked)
            Toast.makeText(this, "Auto refresh ${if (isChecked) "enabled" else "disabled"}", Toast.LENGTH_SHORT).show()
        }
    }
    
    private fun saveSetting(key: String, value: Boolean) {
        val sharedPref = getSharedPreferences("MargSetuPassengerSettings", MODE_PRIVATE)
        sharedPref.edit().putBoolean(key, value).apply()
    }
    
    override fun onOptionsItemSelected(item: MenuItem): Boolean {
        return when (item.itemId) {
            android.R.id.home -> {
                finish()
                true
            }
            else -> super.onOptionsItemSelected(item)
        }
    }
}