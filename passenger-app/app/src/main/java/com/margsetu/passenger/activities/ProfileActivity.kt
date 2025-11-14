package com.margsetu.passenger.activities

import android.content.Context
import android.os.Bundle
import android.view.MenuItem
import android.widget.Button
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.widget.Toolbar
import com.margsetu.passenger.R

class ProfileActivity : AppCompatActivity() {
    
    private lateinit var toolbar: Toolbar
    private lateinit var nameText: TextView
    private lateinit var mobileText: TextView
    private lateinit var memberSinceText: TextView
    private lateinit var totalSearchesText: TextView
    private lateinit var editProfileButton: Button
    private lateinit var logoutButton: Button
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_profile)
        
        initViews()
        setupToolbar()
        loadUserProfile()
        setupClickListeners()
    }
    
    private fun initViews() {
        toolbar = findViewById(R.id.toolbar)
        nameText = findViewById(R.id.nameText)
        mobileText = findViewById(R.id.mobileText)
        memberSinceText = findViewById(R.id.memberSinceText)
        totalSearchesText = findViewById(R.id.totalSearchesText)
        editProfileButton = findViewById(R.id.editProfileButton)
        logoutButton = findViewById(R.id.logoutButton)
    }
    
    private fun setupToolbar() {
        setSupportActionBar(toolbar)
        supportActionBar?.apply {
            setDisplayHomeAsUpEnabled(true)
            title = "Profile"
        }
    }
    
    private fun loadUserProfile() {
        val sharedPref = getSharedPreferences("MargSetuPassengerPrefs", Context.MODE_PRIVATE)
        
        val name = sharedPref.getString("user_name", "Guest User") ?: "Guest User"
        val mobile = sharedPref.getString("mobile_number", "Not provided") ?: "Not provided"
        val loginTime = sharedPref.getLong("login_time", System.currentTimeMillis())
        
        nameText.text = name
        mobileText.text = mobile
        
        // Calculate member since
        val daysSinceLogin = (System.currentTimeMillis() - loginTime) / (1000 * 60 * 60 * 24)
        memberSinceText.text = if (daysSinceLogin == 0L) "Today" else "$daysSinceLogin days ago"
        
        // Mock data for searches
        totalSearchesText.text = "15 searches"
    }
    
    private fun setupClickListeners() {
        editProfileButton.setOnClickListener {
            androidx.appcompat.app.AlertDialog.Builder(this)
                .setTitle("Edit Profile")
                .setMessage("Profile editing feature coming soon!")
                .setPositiveButton("OK", null)
                .show()
        }
        
        logoutButton.setOnClickListener {
            androidx.appcompat.app.AlertDialog.Builder(this)
                .setTitle("Logout")
                .setMessage("Are you sure you want to logout?")
                .setPositiveButton("Logout") { _, _ ->
                    performLogout()
                }
                .setNegativeButton("Cancel", null)
                .show()
        }
    }
    
    private fun performLogout() {
        val sharedPref = getSharedPreferences("MargSetuPassengerPrefs", Context.MODE_PRIVATE)
        sharedPref.edit().clear().apply()
        
        Toast.makeText(this, "Logged out successfully", Toast.LENGTH_SHORT).show()
        
        // Navigate back to login
        val intent = android.content.Intent(this, LoginActivity::class.java)
        intent.flags = android.content.Intent.FLAG_ACTIVITY_NEW_TASK or android.content.Intent.FLAG_ACTIVITY_CLEAR_TASK
        startActivity(intent)
        finish()
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