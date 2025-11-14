package com.margsetu.passenger.activities

import android.os.Bundle
import android.view.MenuItem
import android.widget.ArrayAdapter
import android.widget.ListView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.widget.Toolbar
import com.margsetu.passenger.R

class HistoryActivity : AppCompatActivity() {
    
    private lateinit var toolbar: Toolbar
    private lateinit var historyListView: ListView
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_history)
        
        initViews()
        setupToolbar()
        loadHistoryData()
    }
    
    private fun initViews() {
        toolbar = findViewById(R.id.toolbar)
        historyListView = findViewById(R.id.historyListView)
    }
    
    private fun setupToolbar() {
        setSupportActionBar(toolbar)
        supportActionBar?.apply {
            setDisplayHomeAsUpEnabled(true)
            title = "Search History"
        }
    }
    
    private fun loadHistoryData() {
        val historyItems = listOf(
            "📋 Mumbai → Pune (Today 2:30 PM)\n   • Found 6 buses • Searched via app",
            "📋 Pune → Mumbai (Yesterday 9:15 AM)\n   • Found 8 buses • Tracked MH12AB1234",
            "📋 Mumbai → Nashik (2 days ago)\n   • Found 4 buses • Used SMS mode",
            "📋 City Center → Airport (3 days ago)\n   • Found 12 local buses • Booked seat in MH22KL1122",
            "📋 Home → Office (Last week)\n   • Found 5 buses • Daily commute route",
            "📋 Airport → City Center (Last week)\n   • Found 8 buses • Return journey"
        )
        
        val adapter = ArrayAdapter(this, android.R.layout.simple_list_item_1, historyItems)
        historyListView.adapter = adapter
        
        historyListView.setOnItemClickListener { _, _, position, _ ->
            val selected = historyItems[position]
            Toast.makeText(this, "Selected: ${selected.split('\n')[0]}", Toast.LENGTH_SHORT).show()
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