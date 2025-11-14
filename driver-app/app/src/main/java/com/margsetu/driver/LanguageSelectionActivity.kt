package com.margsetu.driver

import android.content.Intent
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import com.margsetu.driver.databinding.ActivityLanguageSelectionBinding
import com.margsetu.driver.utils.LanguageUtils

class LanguageSelectionActivity : AppCompatActivity() {
    
    private lateinit var binding: ActivityLanguageSelectionBinding
    private var selectedLanguage: String = LanguageUtils.ENGLISH
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Check if user is already logged in
        val sharedPreferences = getSharedPreferences("MargSetuDriverPrefs", MODE_PRIVATE)
        val isLoggedIn = sharedPreferences.getBoolean("is_logged_in", false)
        
        if (isLoggedIn) {
            // User is logged in, go directly to MainActivity
            val intent = Intent(this, MainActivity::class.java)
            startActivity(intent)
            finish()
            return
        }
        
        // User not logged in, show language selection
        binding = ActivityLanguageSelectionBinding.inflate(layoutInflater)
        setContentView(binding.root)
        
        setupLanguageSelection()
        setupContinueButton()
        setupSkipOption()
    }
    
    private fun setupLanguageSelection() {
        // Set initial selection based on current language
        selectedLanguage = LanguageUtils.getAppLanguage(this)
        updateLanguageSelection()
        
        binding.btnEnglish.setOnClickListener {
            selectedLanguage = LanguageUtils.ENGLISH
            updateLanguageSelection()
            binding.btnContinue.isEnabled = true
        }
        
        binding.btnHindi.setOnClickListener {
            selectedLanguage = LanguageUtils.HINDI
            updateLanguageSelection()
            binding.btnContinue.isEnabled = true
        }
        
        binding.btnPunjabi.setOnClickListener {
            selectedLanguage = LanguageUtils.PUNJABI
            updateLanguageSelection()
            binding.btnContinue.isEnabled = true
        }
    }
    
    private fun updateLanguageSelection() {
        // Reset all button styles with original text colors preserved
        binding.btnEnglish.apply {
            strokeColor = getColorStateList(R.color.primary_blue)
            setBackgroundColor(getColor(R.color.white))
            setTextColor(getColor(R.color.text_primary))
        }
        binding.btnHindi.apply {
            strokeColor = getColorStateList(R.color.primary_blue)
            setBackgroundColor(getColor(R.color.white))
            setTextColor(getColor(R.color.text_primary))
        }
        binding.btnPunjabi.apply {
            strokeColor = getColorStateList(R.color.primary_blue)
            setBackgroundColor(getColor(R.color.white))
            setTextColor(getColor(R.color.text_primary))
        }
        
        // Highlight selected button
        when (selectedLanguage) {
            LanguageUtils.ENGLISH -> {
                binding.btnEnglish.apply {
                    strokeColor = getColorStateList(R.color.primary_blue)
                    setBackgroundColor(getColor(R.color.primary_blue))
                    setTextColor(getColor(R.color.white))
                }
            }
            LanguageUtils.HINDI -> {
                binding.btnHindi.apply {
                    strokeColor = getColorStateList(R.color.primary_blue)
                    setBackgroundColor(getColor(R.color.primary_blue))
                    setTextColor(getColor(R.color.white))
                }
            }
            LanguageUtils.PUNJABI -> {
                binding.btnPunjabi.apply {
                    strokeColor = getColorStateList(R.color.primary_blue)
                    setBackgroundColor(getColor(R.color.primary_blue))
                    setTextColor(getColor(R.color.white))
                }
            }
        }
    }
    
    private fun setupContinueButton() {
        // Enable continue button by default since English is pre-selected
        binding.btnContinue.isEnabled = true
        
        binding.btnContinue.setOnClickListener {
            // Save selected language
            LanguageUtils.setAppLanguage(this, selectedLanguage)
            
            // Navigate to login activity
            proceedToLogin()
        }
    }
    
    private fun setupSkipOption() {
        binding.tvSkip.setOnClickListener {
            // Use English as default and proceed
            selectedLanguage = LanguageUtils.ENGLISH
            LanguageUtils.setAppLanguage(this, selectedLanguage)
            proceedToLogin()
        }
    }
    
    private fun proceedToLogin() {
        val intent = Intent(this, LoginActivity::class.java)
        startActivity(intent)
        finish() // Don't allow back to language selection
    }
    
    override fun onBackPressed() {
        // Disable back button on language selection screen
        // User must select a language to continue
    }
}