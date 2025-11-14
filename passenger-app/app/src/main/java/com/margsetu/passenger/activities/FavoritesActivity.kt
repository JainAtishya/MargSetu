package com.margsetu.passenger.activities

import android.os.Bundle
import android.view.MenuItem
import android.widget.ArrayAdapter
import android.widget.ListView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.widget.Toolbar
import com.margsetu.passenger.R

class FavoritesActivity : AppCompatActivity() {
    
    private lateinit var toolbar: Toolbar
    private lateinit var favoritesListView: ListView
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_favorites)
        
        initViews()
        setupToolbar()
        loadFavoritesData()
    }
    
    private fun initViews() {
        toolbar = findViewById(R.id.toolbar)
        favoritesListView = findViewById(R.id.favoritesListView)
    }
    
    private fun setupToolbar() {
        setSupportActionBar(toolbar)
        supportActionBar?.apply {
            setDisplayHomeAsUpEnabled(true)
            title = "Favorite Routes"
        }
    }
    
    private fun loadFavoritesData() {
        val favoriteRoutes = listOf(
            "🚌 Mumbai → Pune\n   Daily commute route • Added 2 weeks ago",
            "🚌 Pune → Mumbai\n   Return trip • Added 2 weeks ago", 
            "🚌 City Center → Airport\n   Frequent travel • Added 1 month ago",
            "🚌 Home → Office\n   Work route • Added 3 weeks ago",
            "🚌 Mumbai → Nashik\n   Weekend trips • Added 1 week ago",
            "🚌 Station → Mall\n   Shopping trips • Added 5 days ago"
        )
        
        val adapter = ArrayAdapter(this, android.R.layout.simple_list_item_1, favoriteRoutes)
        favoritesListView.adapter = adapter
        
        favoritesListView.setOnItemClickListener { _, _, position, _ ->
            val route = favoriteRoutes[position].split('\n')[0]
            Toast.makeText(this, "Selected favorite: $route", Toast.LENGTH_SHORT).show()
        }
        
        favoritesListView.setOnItemLongClickListener { _, _, position, _ ->
            val route = favoriteRoutes[position].split('\n')[0]
            androidx.appcompat.app.AlertDialog.Builder(this)
                .setTitle("Remove Favorite")
                .setMessage("Remove $route from favorites?")
                .setPositiveButton("Remove") { _, _ ->
                    Toast.makeText(this, "Removed from favorites", Toast.LENGTH_SHORT).show()
                }
                .setNegativeButton("Cancel", null)
                .show()
            true
        }
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