package com.margsetu.passenger.activities

import android.content.Intent
import android.os.Bundle
import android.os.CountDownTimer
import android.text.Editable
import android.text.TextWatcher
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.margsetu.passenger.R
import com.margsetu.passenger.utils.NetworkUtils
import java.util.Random

class LoginActivity : AppCompatActivity() {
    
    private lateinit var nameInput: EditText
    private lateinit var mobileInput: EditText
    private lateinit var otpInput: EditText
    private lateinit var sendOtpButton: Button
    private lateinit var verifyOtpButton: Button
    private lateinit var resendOtpButton: Button
    private lateinit var progressBar: ProgressBar
    private lateinit var otpContainer: LinearLayout
    private lateinit var timerText: TextView
    
    private var generatedOtp = ""
    private var countDownTimer: CountDownTimer? = null
    private var isOtpSent = false
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_login)
        
        initViews()
        setupClickListeners()
        setupTextWatchers()
    }
    
    private fun initViews() {
        nameInput = findViewById(R.id.nameInput)
        mobileInput = findViewById(R.id.mobileInput)
        otpInput = findViewById(R.id.otpInput)
        sendOtpButton = findViewById(R.id.sendOtpButton)
        verifyOtpButton = findViewById(R.id.verifyOtpButton)
        resendOtpButton = findViewById(R.id.resendOtpButton)
        progressBar = findViewById(R.id.progressBar)
        otpContainer = findViewById(R.id.otpContainer)
        timerText = findViewById(R.id.timerText)
    }
    
    private fun setupClickListeners() {
        sendOtpButton.setOnClickListener {
            try {
                val name = nameInput.text.toString().trim()
                val mobile = mobileInput.text.toString().trim()
                if (validateName(name) && validateMobile(mobile)) {
                    sendOtp(mobile)
                }
            } catch (e: Exception) {
                android.util.Log.e("LoginActivity", "Error in sendOtp click", e)
                showError("Failed to send OTP. Please try again.")
            }
        }
        
        verifyOtpButton.setOnClickListener {
            try {
                val otp = otpInput.text.toString().trim()
                if (validateOtp(otp)) {
                    verifyOtp(otp)
                }
            } catch (e: Exception) {
                android.util.Log.e("LoginActivity", "Error in verifyOtp click", e)
                showError("Failed to verify OTP. Please try again.")
            }
        }
        
        resendOtpButton.setOnClickListener {
            try {
                val name = nameInput.text.toString().trim()
                val mobile = mobileInput.text.toString().trim()
                if (validateName(name) && validateMobile(mobile)) {
                    sendOtp(mobile)
                }
            } catch (e: Exception) {
                android.util.Log.e("LoginActivity", "Error in resendOtp click", e)
                showError("Failed to resend OTP. Please try again.")
            }
        }
    }
    
    private fun setupTextWatchers() {
        nameInput.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
            override fun afterTextChanged(s: Editable?) {
                updateSendButtonState()
            }
        })
        
        mobileInput.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
            override fun afterTextChanged(s: Editable?) {
                updateSendButtonState()
            }
        })
        
        otpInput.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
            override fun afterTextChanged(s: Editable?) {
                verifyOtpButton.isEnabled = s.toString().trim().length == 6
            }
        })
    }
    
    private fun updateSendButtonState() {
        val name = nameInput.text.toString().trim()
        val mobile = mobileInput.text.toString().trim()
        sendOtpButton.isEnabled = name.isNotEmpty() && mobile.length == 10
    }
    
    private fun validateName(name: String): Boolean {
        if (name.isEmpty()) {
            showError("Please enter your full name")
            return false
        }
        if (name.length < 2) {
            showError("Name should be at least 2 characters")
            return false
        }
        return true
    }
    
    private fun validateMobile(mobile: String): Boolean {
        if (mobile.length != 10) {
            showError("Please enter a valid 10-digit mobile number")
            return false
        }
        if (!mobile.matches(Regex("^[6-9]\\d{9}$"))) {
            showError("Please enter a valid Indian mobile number")
            return false
        }
        return true
    }
    
    private fun validateOtp(otp: String): Boolean {
        if (otp.length != 6) {
            showError("Please enter a valid 6-digit OTP")
            return false
        }
        return true
    }
    
    private fun sendOtp(mobile: String) {
        try {
            // Check network status
            val networkStatus = NetworkUtils.getNetworkStatus(this)
            if (networkStatus == NetworkUtils.NetworkStatus.NO_INTERNET) {
                showError("No internet connection. Please check your network.")
                return
            }
            
            showProgress(true)
            
            // Generate a random 6-digit OTP
            generatedOtp = String.format("%06d", Random().nextInt(999999))
            
            // Simulate API call delay
            android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
                try {
                    showProgress(false)
                    isOtpSent = true
                    showOtpSection()
                    startResendTimer()
                    
                    // For demo purposes, show the OTP in toast
                    Toast.makeText(this, "OTP sent: $generatedOtp", Toast.LENGTH_LONG).show()
                } catch (e: Exception) {
                    android.util.Log.e("LoginActivity", "Error in OTP send callback", e)
                    showError("Failed to send OTP. Please try again.")
                    showProgress(false)
                }
            }, 2000)
        } catch (e: Exception) {
            android.util.Log.e("LoginActivity", "Error sending OTP", e)
            showError("Failed to send OTP. Please try again.")
            showProgress(false)
        }
    }
    
    private fun verifyOtp(otp: String) {
        try {
            // Check network status
            val networkStatus = NetworkUtils.getNetworkStatus(this)
            if (networkStatus == NetworkUtils.NetworkStatus.NO_INTERNET) {
                showError("No internet connection. Please check your network.")
                return
            }
            
            showProgress(true)
            
            // Simulate API call delay
            android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
                try {
                    showProgress(false)
                    
                    if (otp == generatedOtp) {
                        // OTP verified successfully - save login state
                        saveLoginState()
                        
                        Toast.makeText(this, "Login successful!", Toast.LENGTH_SHORT).show()
                        
                        // Navigate to Main Activity with safe intent
                        navigateToMainActivity()
                    } else {
                        showError("Invalid OTP. Please try again.")
                        // Clear OTP input for retry
                        otpInput.setText("")
                    }
                } catch (e: Exception) {
                    android.util.Log.e("LoginActivity", "Error in OTP verification", e)
                    showError("Verification failed. Please try again.")
                    showProgress(false)
                }
            }, 1500)
        } catch (e: Exception) {
            android.util.Log.e("LoginActivity", "Error starting OTP verification", e)
            showError("Verification failed. Please try again.")
            showProgress(false)
        }
    }
    
    private fun saveLoginState() {
        try {
            val sharedPreferences = getSharedPreferences("MargSetuPassengerPrefs", MODE_PRIVATE)
            sharedPreferences.edit().apply {
                putBoolean("is_logged_in", true)
                putString("user_name", nameInput.text.toString().trim())
                putString("mobile_number", mobileInput.text.toString().trim())
                putLong("login_time", System.currentTimeMillis())
                apply()
            }
        } catch (e: Exception) {
            android.util.Log.e("LoginActivity", "Error saving login state", e)
        }
    }
    
    private fun navigateToMainActivity() {
        try {
            android.util.Log.d("LoginActivity", "Starting navigation to MainActivity")
            
            // Clear any existing tasks and start fresh
            val intent = Intent(this, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                // Add extra data to help with debugging
                putExtra("login_source", "otp_verification")
                putExtra("timestamp", System.currentTimeMillis())
            }
            
            // Double-check that MainActivity class exists
            val componentName = intent.resolveActivity(packageManager)
            if (componentName != null) {
                android.util.Log.d("LoginActivity", "MainActivity component found: $componentName")
                startActivity(intent)
                finish()
                android.util.Log.d("LoginActivity", "Successfully navigated to MainActivity")
            } else {
                android.util.Log.e("LoginActivity", "MainActivity component not found in manifest")
                showError("Navigation failed. MainActivity not found.")
            }
            
        } catch (e: Exception) {
            android.util.Log.e("LoginActivity", "Error navigating to MainActivity", e)
            showError("Navigation failed: ${e.message}")
            
            // Try alternative navigation method
            try {
                android.util.Log.d("LoginActivity", "Attempting alternative navigation")
                val fallbackIntent = Intent()
                fallbackIntent.setClassName(this, "com.margsetu.passenger.activities.MainActivity")
                fallbackIntent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                startActivity(fallbackIntent)
                finish()
            } catch (fallbackError: Exception) {
                android.util.Log.e("LoginActivity", "Fallback navigation also failed", fallbackError)
                showError("Critical navigation error. Please restart the app.")
            }
        }
    }
    
    private fun showOtpSection() {
        otpContainer.visibility = View.VISIBLE
        sendOtpButton.visibility = View.GONE
        nameInput.isEnabled = false
        mobileInput.isEnabled = false
    }
    
    private fun startResendTimer() {
        resendOtpButton.isEnabled = false
        countDownTimer = object : CountDownTimer(60000, 1000) {
            override fun onTick(millisUntilFinished: Long) {
                val seconds = millisUntilFinished / 1000
                timerText.text = "Resend OTP in ${seconds}s"
                timerText.visibility = View.VISIBLE
            }
            
            override fun onFinish() {
                resendOtpButton.isEnabled = true
                timerText.visibility = View.GONE
            }
        }.start()
    }
    
    private fun showProgress(show: Boolean) {
        try {
            progressBar.visibility = if (show) View.VISIBLE else View.GONE
            sendOtpButton.isEnabled = !show && !isOtpSent
            
            // Safe check for OTP input length
            val otpLength = otpInput.text?.toString()?.trim()?.length ?: 0
            verifyOtpButton.isEnabled = !show && isOtpSent && otpLength == 6
        } catch (e: Exception) {
            android.util.Log.e("LoginActivity", "Error in showProgress", e)
            // Fallback visibility settings
            try {
                progressBar.visibility = if (show) View.VISIBLE else View.GONE
            } catch (ex: Exception) {
                android.util.Log.e("LoginActivity", "Error setting progress bar visibility", ex)
            }
        }
    }
    
    private fun showError(message: String) {
        Toast.makeText(this, message, Toast.LENGTH_LONG).show()
    }
    
    override fun onDestroy() {
        super.onDestroy()
        countDownTimer?.cancel()
    }
}