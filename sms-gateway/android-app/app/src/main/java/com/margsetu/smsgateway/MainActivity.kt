package com.margsetu.smsgateway

import android.Manifest
import android.app.NotificationManager
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.PowerManager
import android.provider.Settings
import android.view.View
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import com.google.android.material.button.MaterialButton
import com.google.android.material.textfield.TextInputEditText
import kotlinx.coroutines.launch
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import java.text.SimpleDateFormat
import java.util.*

class MainActivity : AppCompatActivity() {
    
    companion object {
        private val REQUIRED_PERMISSIONS = arrayOf(
            Manifest.permission.RECEIVE_SMS,
            Manifest.permission.READ_SMS,
            Manifest.permission.INTERNET
        )
    }
    
    private lateinit var config: GatewayConfig
    private lateinit var logManager: LogManager
    private lateinit var networkService: NetworkService
    private lateinit var logsAdapter: LogsAdapter
    
    // UI Components
    private lateinit var tvStatus: TextView
    private lateinit var tvLastActivity: TextView
    private lateinit var viewStatusIndicator: View
    private lateinit var etServerUrl: TextInputEditText
    private lateinit var etApiKey: TextInputEditText
    private lateinit var btnSaveSettings: MaterialButton
    private lateinit var btnTestConnection: MaterialButton
    private lateinit var btnGrantPermissions: MaterialButton
    private lateinit var btnClearLogs: MaterialButton
    private lateinit var tvPermissionsNote: TextView
    private lateinit var rvLogs: RecyclerView
    private lateinit var tvNoLogs: TextView
    
    private val permissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        updatePermissionStatus()
        if (permissions.values.all { it }) {
            Toast.makeText(this, "All permissions granted", Toast.LENGTH_SHORT).show()
            logManager.addLog("All permissions granted", LogType.SUCCESS)
        } else {
            Toast.makeText(this, "Some permissions were denied", Toast.LENGTH_SHORT).show()
            logManager.addLog("Some permissions were denied", LogType.WARNING)
        }
    }
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        
        initializeComponents()
        setupViews()
        updateUI()
        
        // Check battery optimization
        checkBatteryOptimization()
        
        // Start the gateway service
        startGatewayService()
    }
    
    override fun onResume() {
        super.onResume()
        updateUI()
        refreshLogs()
    }
    
    private fun initializeComponents() {
        config = GatewayConfig.getInstance(this)
        logManager = LogManager.getInstance(this)
        networkService = NetworkService(this)
        logsAdapter = LogsAdapter()
    }
    
    private fun setupViews() {
        // Find views
        tvStatus = findViewById(R.id.tvStatus)
        tvLastActivity = findViewById(R.id.tvLastActivity)
        viewStatusIndicator = findViewById(R.id.viewStatusIndicator)
        etServerUrl = findViewById(R.id.etServerUrl)
        etApiKey = findViewById(R.id.etApiKey)
        btnSaveSettings = findViewById(R.id.btnSaveSettings)
        btnTestConnection = findViewById(R.id.btnTestConnection)
        btnGrantPermissions = findViewById(R.id.btnGrantPermissions)
        btnClearLogs = findViewById(R.id.btnClearLogs)
        tvPermissionsNote = findViewById(R.id.tvPermissionsNote)
        rvLogs = findViewById(R.id.rvLogs)
        tvNoLogs = findViewById(R.id.tvNoLogs)
        
        // Setup RecyclerView
        rvLogs.layoutManager = LinearLayoutManager(this)
        rvLogs.adapter = logsAdapter
        
        // Load current settings
        etServerUrl.setText(config.serverUrl)
        etApiKey.setText(config.apiKey)
        
        // Setup click listeners
        btnSaveSettings.setOnClickListener { saveSettings() }
        btnTestConnection.setOnClickListener { testConnection() }
        btnGrantPermissions.setOnClickListener { requestPermissions() }
        btnClearLogs.setOnClickListener { clearLogs() }
    }
    
    private fun updateUI() {
        updatePermissionStatus()
        updateGatewayStatus()
        refreshLogs()
    }
    
    private fun updatePermissionStatus() {
        val hasAllPermissions = hasAllRequiredPermissions()
        
        if (hasAllPermissions) {
            btnGrantPermissions.visibility = View.GONE
            tvPermissionsNote.visibility = View.GONE
        } else {
            btnGrantPermissions.visibility = View.VISIBLE
            tvPermissionsNote.visibility = View.VISIBLE
        }
    }
    
    private fun updateGatewayStatus() {
        val isActive = hasAllRequiredPermissions() && 
                      config.isGatewayEnabled && 
                      config.isConfigurationValid()
        
        if (isActive) {
            tvStatus.text = getString(R.string.status_active)
            tvStatus.setTextColor(ContextCompat.getColor(this, R.color.status_active))
            viewStatusIndicator.setBackgroundResource(R.color.status_active)
        } else {
            tvStatus.text = getString(R.string.status_inactive)
            tvStatus.setTextColor(ContextCompat.getColor(this, R.color.status_inactive))
            viewStatusIndicator.setBackgroundResource(R.color.status_inactive)
        }
        
        // Update last activity
        val lastSmsTime = config.lastSmsTime
        val lastActivityText = if (lastSmsTime > 0) {
            val formatter = SimpleDateFormat("MMM dd, HH:mm", Locale.getDefault())
            "Last SMS: ${formatter.format(Date(lastSmsTime))}"
        } else {
            "Last SMS: Never"
        }
        tvLastActivity.text = lastActivityText
    }
    
    private fun refreshLogs() {
        val logs = logManager.getLogs()
        if (logs.isEmpty()) {
            rvLogs.visibility = View.GONE
            tvNoLogs.visibility = View.VISIBLE
        } else {
            rvLogs.visibility = View.VISIBLE
            tvNoLogs.visibility = View.GONE
            logsAdapter.submitList(logs)
        }
    }
    
    private fun saveSettings() {
        val serverUrl = etServerUrl.text.toString().trim()
        val apiKey = etApiKey.text.toString().trim()
        
        if (serverUrl.isEmpty() || apiKey.isEmpty()) {
            Toast.makeText(this, "Please fill in all fields", Toast.LENGTH_SHORT).show()
            return
        }
        
        if (!serverUrl.startsWith("http://") && !serverUrl.startsWith("https://")) {
            Toast.makeText(this, "Server URL must start with http:// or https://", Toast.LENGTH_SHORT).show()
            return
        }
        
        config.serverUrl = serverUrl
        config.apiKey = apiKey
        
        Toast.makeText(this, getString(R.string.settings_saved), Toast.LENGTH_SHORT).show()
        logManager.addLog("Settings saved successfully", LogType.SUCCESS)
        
        updateGatewayStatus()
    }
    
    private fun testConnection() {
        if (!config.isConfigurationValid()) {
            Toast.makeText(this, "Please save settings first", Toast.LENGTH_SHORT).show()
            return
        }
        
        btnTestConnection.isEnabled = false
        btnTestConnection.text = "Testing..."
        
        lifecycleScope.launch {
            try {
                val success = networkService.testConnection()
                
                runOnUiThread {
                    btnTestConnection.isEnabled = true
                    btnTestConnection.text = getString(R.string.test_connection)
                    
                    if (success) {
                        Toast.makeText(this@MainActivity, getString(R.string.connection_test_success), Toast.LENGTH_SHORT).show()
                        logManager.addLog("Connection test successful", LogType.SUCCESS)
                    } else {
                        Toast.makeText(this@MainActivity, getString(R.string.connection_test_failed), Toast.LENGTH_SHORT).show()
                        logManager.addLog("Connection test failed", LogType.ERROR)
                    }
                    
                    refreshLogs()
                }
            } catch (e: Exception) {
                runOnUiThread {
                    btnTestConnection.isEnabled = true
                    btnTestConnection.text = getString(R.string.test_connection)
                    Toast.makeText(this@MainActivity, "Connection test error: ${e.message}", Toast.LENGTH_SHORT).show()
                    logManager.addLog("Connection test error: ${e.message}", LogType.ERROR)
                    refreshLogs()
                }
            }
        }
    }
    
    private fun requestPermissions() {
        permissionLauncher.launch(REQUIRED_PERMISSIONS)
    }
    
    private fun clearLogs() {
        AlertDialog.Builder(this)
            .setTitle("Clear Logs")
            .setMessage("Are you sure you want to clear all logs?")
            .setPositiveButton("Clear") { _, _ ->
                logManager.clearLogs()
                refreshLogs()
                Toast.makeText(this, "Logs cleared", Toast.LENGTH_SHORT).show()
            }
            .setNegativeButton("Cancel", null)
            .show()
    }
    
    private fun hasAllRequiredPermissions(): Boolean {
        return REQUIRED_PERMISSIONS.all { permission ->
            ContextCompat.checkSelfPermission(this, permission) == PackageManager.PERMISSION_GRANTED
        }
    }
    
    private fun checkBatteryOptimization() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val powerManager = getSystemService(POWER_SERVICE) as PowerManager
            if (!powerManager.isIgnoringBatteryOptimizations(packageName)) {
                AlertDialog.Builder(this)
                    .setTitle(getString(R.string.battery_optimization_title))
                    .setMessage(getString(R.string.battery_optimization_message))
                    .setPositiveButton(getString(R.string.disable_optimization)) { _, _ ->
                        try {
                            val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS)
                            intent.data = Uri.parse("package:$packageName")
                            startActivity(intent)
                        } catch (e: Exception) {
                            // Fallback to general battery optimization settings
                            try {
                                startActivity(Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS))
                            } catch (ex: Exception) {
                                Toast.makeText(this, "Please manually disable battery optimization", Toast.LENGTH_LONG).show()
                            }
                        }
                    }
                    .setNegativeButton(getString(R.string.skip), null)
                    .show()
            }
        }
    }
    
    private fun startGatewayService() {
        if (hasAllRequiredPermissions() && config.isConfigurationValid()) {
            val serviceIntent = Intent(this, GatewayService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(serviceIntent)
            } else {
                startService(serviceIntent)
            }
        }
    }
}