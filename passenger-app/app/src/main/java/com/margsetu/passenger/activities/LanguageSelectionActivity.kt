package com.margsetu.passenger.activities

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.RadioButton
import android.widget.RadioGroup
import androidx.appcompat.app.AppCompatActivity
import com.margsetu.passenger.R
import com.margsetu.passenger.utils.LanguageUtils

class LanguageSelectionActivity : AppCompatActivity() {
    
    private lateinit var languageGroup: RadioGroup
    private lateinit var continueButton: Button
    
    private lateinit var englishRadio: RadioButton
    private lateinit var hindiRadio: RadioButton
    private lateinit var punjabiRadio: RadioButton
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Check if user is already logged in
        checkLoginStatus()
        
        setContentView(R.layout.activity_language_selection)
        
        initViews()
        setupClickListeners()
        setCurrentLanguage()
    }
    
    private fun checkLoginStatus() {
        try {
            val sharedPreferences = getSharedPreferences("MargSetuPassengerPrefs", MODE_PRIVATE)
            val isLoggedIn = sharedPreferences.getBoolean("is_logged_in", false)
            val loginTime = sharedPreferences.getLong("login_time", 0)
            
            // Check if login is still valid (within 30 days)
            val currentTime = System.currentTimeMillis()
            val thirtyDaysInMillis = 30L * 24L * 60L * 60L * 1000L // 30 days
            val isLoginExpired = (currentTime - loginTime) > thirtyDaysInMillis
            
            android.util.Log.d("LanguageSelection", "Login status: $isLoggedIn, Login time: $loginTime, Expired: $isLoginExpired")
            
            if (isLoggedIn && !isLoginExpired) {
                // User is logged in and session is valid, go directly to MainActivity
                android.util.Log.d("LanguageSelection", "User is logged in, navigating to MainActivity")
                val intent = Intent(this, MainActivity::class.java).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                    putExtra("login_source", "auto_login")
                    putExtra("timestamp", System.currentTimeMillis())
                }
                startActivity(intent)
                finish()
                return
            } else if (isLoggedIn && isLoginExpired) {
                // Clear expired login
                android.util.Log.d("LanguageSelection", "Login expired, clearing session")
                sharedPreferences.edit().apply {
                    putBoolean("is_logged_in", false)
                    remove("mobile_number")
                    remove("login_time")
                    apply()
                }
            }
            
            // Continue with language selection for new users or expired sessions
        } catch (e: Exception) {
            android.util.Log.e("LanguageSelection", "Error checking login status", e)
            // Continue with normal flow if there's an error
        }
    }
    
    private fun initViews() {
        languageGroup = findViewById(R.id.languageGroup)
        continueButton = findViewById(R.id.continueButton)
        englishRadio = findViewById(R.id.englishRadio)
        hindiRadio = findViewById(R.id.hindiRadio)
        punjabiRadio = findViewById(R.id.punjabiRadio)
    }
    
    private fun setupClickListeners() {
        continueButton.setOnClickListener {
            val selectedLanguage = when (languageGroup.checkedRadioButtonId) {
                R.id.englishRadio -> LanguageUtils.ENGLISH
                R.id.hindiRadio -> LanguageUtils.HINDI
                R.id.punjabiRadio -> LanguageUtils.PUNJABI
                else -> LanguageUtils.ENGLISH
            }
            
            LanguageUtils.setAppLanguage(this, selectedLanguage)
            
            // Navigate to Login Activity
            val intent = Intent(this, LoginActivity::class.java)
            startActivity(intent)
            finish()
        }
        
        // Enable continue button when language is selected
        languageGroup.setOnCheckedChangeListener { _, _ ->
            continueButton.isEnabled = true
        }
    }
    
    private fun setCurrentLanguage() {
        val currentLanguage = LanguageUtils.getAppLanguage(this)
        
        when (currentLanguage) {
            LanguageUtils.ENGLISH -> englishRadio.isChecked = true
            LanguageUtils.HINDI -> hindiRadio.isChecked = true
            LanguageUtils.PUNJABI -> punjabiRadio.isChecked = true
            else -> englishRadio.isChecked = true
        }
        
        continueButton.isEnabled = languageGroup.checkedRadioButtonId != -1
    }
}