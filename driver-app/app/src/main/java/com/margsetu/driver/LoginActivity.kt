package com.margsetu.driver

import android.content.Intent
import android.content.SharedPreferences
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.util.Log
import android.view.View
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.google.android.material.textfield.TextInputEditText
import com.margsetu.driver.databinding.ActivityLoginBinding
import com.margsetu.driver.config.AppConfig
import com.margsetu.driver.network.*
import com.margsetu.driver.utils.LanguageUtils
import kotlinx.coroutines.launch

class LoginActivity : AppCompatActivity() {
    
    private lateinit var binding: ActivityLoginBinding
    private lateinit var sharedPreferences: SharedPreferences
    
    companion object {
        private const val PREFS_NAME = "MargSetuDriverPrefs"
        private const val PREF_DRIVER_ID = "driver_id"
        private const val PREF_BUS_ID = "bus_id"
        private const val PREF_IS_LOGGED_IN = "is_logged_in"
    }
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Apply saved language before setting content view
        val savedLanguage = LanguageUtils.getAppLanguage(this)
        LanguageUtils.updateAppLocale(this, savedLanguage)
        
        binding = ActivityLoginBinding.inflate(layoutInflater)
        setContentView(binding.root)
        
        sharedPreferences = getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
        
        // Check if user is already logged in
        if (isUserLoggedIn()) {
            navigateToMainActivity()
            return
        }
        
        setupUI()
    }
    
    private fun setupUI() {
        // Add helpful default values for testing
        binding.etDriverId.setText("DRV0001")
        binding.etBusId.setText("BUS001")
        binding.etPassword.setText("driver123")
        
        binding.btnLogin.setOnClickListener {
            performLogin()
        }
        
        // Language selection button
        binding.btnLanguage.setOnClickListener {
            showLanguageSelectionDialog()
        }
        
        // Set focus change listeners to clear errors
        binding.etDriverId.setOnFocusChangeListener { _, hasFocus ->
            if (hasFocus) {
                binding.tilDriverId.error = null
            }
        }
        
        binding.etBusId.setOnFocusChangeListener { _, hasFocus ->
            if (hasFocus) {
                binding.tilBusId.error = null
            }
        }
        
        binding.etPassword.setOnFocusChangeListener { _, hasFocus ->
            if (hasFocus) {
                binding.tilPassword.error = null
            }
        }
    }
    
    private fun performLogin() {
        val driverId = binding.etDriverId.text?.toString()?.trim() ?: ""
        val busId = binding.etBusId.text?.toString()?.trim() ?: ""
        val password = binding.etPassword.text?.toString()?.trim() ?: ""
        
        // Clear previous errors
        binding.tilDriverId.error = null
        binding.tilBusId.error = null
        binding.tilPassword.error = null
        
        // Validate input
        if (!validateInput(driverId, busId, password)) {
            return
        }
        
        // Show loading
        showLoading(true)
        
        // Make actual API call to backend
        performLogin(driverId, password)
    }
    
    private fun validateInput(driverId: String, busId: String, password: String): Boolean {
        var isValid = true
        
        if (driverId.isEmpty()) {
            binding.tilDriverId.error = "Driver ID is required"
            isValid = false
        } else if (driverId.length < 3) {
            binding.tilDriverId.error = "Driver ID must be at least 3 characters"
            isValid = false
        }
        
        if (busId.isEmpty()) {
            binding.tilBusId.error = "Bus ID is required"
            isValid = false
        } else if (busId.length < 2) {
            binding.tilBusId.error = "Bus ID must be at least 2 characters"
            isValid = false
        }
        
        if (password.isEmpty()) {
            binding.tilPassword.error = "Password is required"
            isValid = false
        } else if (password.length < 3) {
            binding.tilPassword.error = "Password must be at least 3 characters"
            isValid = false
        }
        
        return isValid
    }
    
    private fun performLogin(driverId: String, password: String) {
        lifecycleScope.launch {
            try {
                // Get the bus ID from input
                val busId = binding.etBusId.text?.toString()?.trim() ?: ""
                
                Log.d("LoginActivity", "🔐 Attempting login via NetworkManager")
                Log.d("LoginActivity", "📋 Credentials: username=$driverId, driverId=$driverId")
                Log.d("LoginActivity", "🌐 Server: ${AppConfig.Server.BASE_URL}")
                
                // Use NetworkManager for improved login handling
                val result = NetworkManager.authenticateDriver(
                    username = driverId,  // Use driverId as username for Vercel backend
                    password = password,
                    driverId = driverId
                )
                
                showLoading(false)
                
                when (result) {
                    is NetworkResult.Success -> {
                        val loginResponse = result.data
                        Log.d("LoginActivity", "✅ Login successful: ${loginResponse.message}")
                        Log.d("LoginActivity", "🔑 Token received: ${loginResponse.token.take(10)}...")
                        
                        // Extract bus ID (use input busId if API doesn't provide one)
                        val responseBusId = loginResponse.driver?.bus?.busId ?: busId
                        Log.d("LoginActivity", "🚌 Bus ID: $responseBusId")
                        
                        onLoginSuccess(driverId, responseBusId, loginResponse.token, "")
                    }
                    
                    is NetworkResult.Error -> {
                        val errorMessage = "Login failed: ${result.message}"
                        Log.e("LoginActivity", "❌ $errorMessage (Code: ${result.code})")
                        onLoginFailure(errorMessage)
                    }
                    
                    is NetworkResult.NetworkError -> {
                        Log.e("LoginActivity", "🌐 Network error: ${result.message}")
                        val errorMessage = buildString {
                            append("Connection failed: ${result.message}\n\n")
                            append("📱 Current server: ${AppConfig.Server.BASE_URL}\n")
                            append("🌐 Network status: Check internet connection\n")
                            if (!AppConfig.Server.BASE_URL.startsWith("https")) {
                                append("⚠️  Using HTTP - ensure device is on correct network\n")
                            }
                            append("\n🧪 Test credentials: driver123/password123")
                        }
                        onLoginFailure(errorMessage)
                    }
                    
                    is NetworkResult.RateLimited -> {
                        Log.w("LoginActivity", "⏱️ Rate limited: ${result.message}")
                        onLoginFailure("Too many login attempts. Please wait a moment and try again.")
                    }
                }
                
            } catch (e: Exception) {
                Log.e("LoginActivity", "💥 Unexpected error: ${e.message}", e)
                showLoading(false)
                
                val errorMessage = buildString {
                    append("Unexpected error: ${e.message}\n\n")
                    append("📱 App configuration:\n")
                    append("• Server: ${AppConfig.Server.BASE_URL}\n")
                    append("• Network: ${if (AppConfig.Server.BASE_URL.startsWith("https")) "Global (HTTPS)" else "Local (HTTP)"}\n")
                    append("\n🔧 Please try again or contact support.")
                }
                onLoginFailure(errorMessage)
            }
        }
    }
    
    private fun onLoginSuccess(driverId: String, busId: String, token: String, refreshToken: String) {
        // Save credentials and login state
        sharedPreferences.edit().apply {
            putString(PREF_DRIVER_ID, driverId)
            putString(PREF_BUS_ID, busId)
            putBoolean(PREF_IS_LOGGED_IN, true)
            putString("auth_token", token)
            apply()
        }
        
        showStatusMessage("✅ Login successful!", true)
        
        // Navigate to main activity after short delay
        binding.root.postDelayed({
            navigateToMainActivity()
        }, 1500)
    }
    
    private fun onLoginFailure(errorMessage: String) {
        showStatusMessage(errorMessage, false)
        Toast.makeText(this, errorMessage, Toast.LENGTH_SHORT).show()
    }
    
    private fun showLoading(show: Boolean) {
        binding.progressLoading.visibility = if (show) View.VISIBLE else View.GONE
        binding.btnLogin.isEnabled = !show
        binding.btnLogin.text = if (show) "Logging in..." else getString(R.string.login_button)
    }
    
    private fun showStatusMessage(message: String, isSuccess: Boolean) {
        binding.llStatusContainer.visibility = View.VISIBLE
        binding.tvStatusMessage.text = message
        
        val textColor = if (isSuccess) {
            getColor(R.color.success_green)
        } else {
            getColor(R.color.error_red)
        }
        binding.tvStatusMessage.setTextColor(textColor)
    }
    
    private fun isUserLoggedIn(): Boolean {
        return sharedPreferences.getBoolean(PREF_IS_LOGGED_IN, false)
    }
    
    private fun navigateToMainActivity() {
        val intent = Intent(this, MainActivity::class.java)
        startActivity(intent)
        finish() // Prevent going back to login
    }
    
    private fun showLanguageSelectionDialog() {
        val languages = LanguageUtils.getSupportedLanguages()
        val languageNames = languages.map { it.second }.toTypedArray()
        val currentLanguage = LanguageUtils.getAppLanguage(this)
        val currentIndex = languages.indexOfFirst { it.first == currentLanguage }
        
        AlertDialog.Builder(this)
            .setTitle(getString(R.string.select_language))
            .setSingleChoiceItems(languageNames, currentIndex) { dialog, which ->
                val selectedLanguage = languages[which].first
                if (selectedLanguage != currentLanguage) {
                    LanguageUtils.setAppLanguage(this, selectedLanguage)
                    
                    // Show loading and restart to login activity
                    AlertDialog.Builder(this)
                        .setMessage(getString(R.string.changing_language))
                        .setCancelable(false)
                        .show()
                    
                    // Restart to LoginActivity after a brief delay
                    android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
                        LanguageUtils.restartToActivity(this, LoginActivity::class.java)
                    }, 1000)
                }
                dialog.dismiss()
            }
            .setNegativeButton(getString(R.string.cancel), null)
            .show()
    }
}