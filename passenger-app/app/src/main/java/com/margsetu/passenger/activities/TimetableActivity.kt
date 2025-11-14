package com.margsetu.passenger.activities

import android.os.Bundle
import android.view.MenuItem
import android.view.View
import android.widget.AdapterView
import android.widget.ArrayAdapter
import android.widget.Spinner
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.widget.Toolbar
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.margsetu.passenger.R
import com.margsetu.passenger.adapters.TimetableAdapter
import com.margsetu.passenger.models.TimetableEntry

class TimetableActivity : AppCompatActivity() {
    
    private lateinit var toolbar: Toolbar
    private lateinit var routeSpinner: Spinner
    private lateinit var timeTypeSpinner: Spinner
    private lateinit var recyclerView: RecyclerView
    
    private lateinit var timetableAdapter: TimetableAdapter
    private var allTimetableEntries: List<TimetableEntry> = emptyList()
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_timetable)
        
        initViews()
        setupToolbar()
        setupSpinners()
        setupRecyclerView()
        loadTimetableData()
    }
    
    private fun initViews() {
        toolbar = findViewById(R.id.toolbar)
        routeSpinner = findViewById(R.id.routeSpinner)
        timeTypeSpinner = findViewById(R.id.timeTypeSpinner)
        recyclerView = findViewById(R.id.recyclerView)
    }
    
    private fun setupToolbar() {
        setSupportActionBar(toolbar)
        supportActionBar?.apply {
            title = "Bus Timetable"
            setDisplayHomeAsUpEnabled(true)
            setDisplayShowHomeEnabled(true)
        }
    }
    
    private fun setupSpinners() {
        // Route filter
        val routes = listOf(
            "All Routes",
            "Mumbai - Pune",
            "Mumbai - Nashik", 
            "Pune - Aurangabad",
            "Mumbai - Nagpur",
            "Pune - Mumbai",
            "Local Routes"
        )
        
        val routeAdapter = ArrayAdapter(this, android.R.layout.simple_spinner_item, routes)
        routeAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        routeSpinner.adapter = routeAdapter
        
        // Time type filter
        val timeTypes = listOf(
            "All Times",
            "Morning (6AM - 12PM)",
            "Afternoon (12PM - 6PM)",
            "Evening (6PM - 12AM)",
            "Night (12AM - 6AM)"
        )
        
        val timeTypeAdapter = ArrayAdapter(this, android.R.layout.simple_spinner_item, timeTypes)
        timeTypeAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        timeTypeSpinner.adapter = timeTypeAdapter
        
        // Set listeners
        routeSpinner.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(parent: AdapterView<*>?, view: View?, position: Int, id: Long) {
                filterTimetable()
            }
            override fun onNothingSelected(parent: AdapterView<*>?) {}
        }
        
        timeTypeSpinner.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(parent: AdapterView<*>?, view: View?, position: Int, id: Long) {
                filterTimetable()
            }
            override fun onNothingSelected(parent: AdapterView<*>?) {}
        }
    }
    
    private fun setupRecyclerView() {
        timetableAdapter = TimetableAdapter(mutableListOf())
        
        recyclerView.apply {
            layoutManager = LinearLayoutManager(this@TimetableActivity)
            adapter = timetableAdapter
        }
    }
    
    private fun loadTimetableData() {
        allTimetableEntries = generateTimetableData()
        filterTimetable()
    }
    
    private fun generateTimetableData(): List<TimetableEntry> {
        return listOf(
            // Mumbai - Pune Route
            TimetableEntry("MH12AB1234", "Mumbai - Pune Express", "Mumbai Central", "Pune Station", "06:00 AM", "09:30 AM", "Daily"),
            TimetableEntry("MH12AB1234", "Mumbai - Pune Express", "Mumbai Central", "Pune Station", "07:00 AM", "10:30 AM", "Daily"),
            TimetableEntry("MH12AB1234", "Mumbai - Pune Express", "Mumbai Central", "Pune Station", "08:00 AM", "11:30 AM", "Daily"),
            TimetableEntry("MH12AB1234", "Mumbai - Pune Express", "Mumbai Central", "Pune Station", "09:00 AM", "12:30 PM", "Daily"),
            TimetableEntry("MH12AB1234", "Mumbai - Pune Express", "Mumbai Central", "Pune Station", "10:00 AM", "01:30 PM", "Daily"),
            TimetableEntry("MH12AB1234", "Mumbai - Pune Express", "Mumbai Central", "Pune Station", "11:00 AM", "02:30 PM", "Daily"),
            TimetableEntry("MH12AB1234", "Mumbai - Pune Express", "Mumbai Central", "Pune Station", "12:00 PM", "03:30 PM", "Daily"),
            TimetableEntry("MH12AB1234", "Mumbai - Pune Express", "Mumbai Central", "Pune Station", "01:00 PM", "04:30 PM", "Daily"),
            TimetableEntry("MH12AB1234", "Mumbai - Pune Express", "Mumbai Central", "Pune Station", "02:00 PM", "05:30 PM", "Daily"),
            TimetableEntry("MH12AB1234", "Mumbai - Pune Express", "Mumbai Central", "Pune Station", "03:00 PM", "06:30 PM", "Daily"),
            TimetableEntry("MH12AB1234", "Mumbai - Pune Express", "Mumbai Central", "Pune Station", "04:00 PM", "07:30 PM", "Daily"),
            TimetableEntry("MH12AB1234", "Mumbai - Pune Express", "Mumbai Central", "Pune Station", "05:00 PM", "08:30 PM", "Daily"),
            TimetableEntry("MH12AB1234", "Mumbai - Pune Express", "Mumbai Central", "Pune Station", "06:00 PM", "09:30 PM", "Daily"),
            TimetableEntry("MH12AB1234", "Mumbai - Pune Express", "Mumbai Central", "Pune Station", "07:00 PM", "10:30 PM", "Daily"),
            TimetableEntry("MH12AB1234", "Mumbai - Pune Express", "Mumbai Central", "Pune Station", "08:00 PM", "11:30 PM", "Daily"),
            TimetableEntry("MH12AB1234", "Mumbai - Pune Express", "Mumbai Central", "Pune Station", "09:00 PM", "12:30 AM", "Daily"),
            TimetableEntry("MH12AB1234", "Mumbai - Pune Express", "Mumbai Central", "Pune Station", "10:00 PM", "01:30 AM", "Daily"),
            TimetableEntry("MH12AB1234", "Mumbai - Pune Express", "Mumbai Central", "Pune Station", "11:00 PM", "02:30 AM", "Daily"),
            
            // Pune - Mumbai Route (Return)
            TimetableEntry("MH12AB1234", "Pune - Mumbai Express", "Pune Station", "Mumbai Central", "06:00 AM", "09:30 AM", "Daily"),
            TimetableEntry("MH12AB1234", "Pune - Mumbai Express", "Pune Station", "Mumbai Central", "07:00 AM", "10:30 AM", "Daily"),
            TimetableEntry("MH12AB1234", "Pune - Mumbai Express", "Pune Station", "Mumbai Central", "08:00 AM", "11:30 AM", "Daily"),
            TimetableEntry("MH12AB1234", "Pune - Mumbai Express", "Pune Station", "Mumbai Central", "09:00 AM", "12:30 PM", "Daily"),
            TimetableEntry("MH12AB1234", "Pune - Mumbai Express", "Pune Station", "Mumbai Central", "10:00 AM", "01:30 PM", "Daily"),
            TimetableEntry("MH12AB1234", "Pune - Mumbai Express", "Pune Station", "Mumbai Central", "11:00 AM", "02:30 PM", "Daily"),
            TimetableEntry("MH12AB1234", "Pune - Mumbai Express", "Pune Station", "Mumbai Central", "12:00 PM", "03:30 PM", "Daily"),
            TimetableEntry("MH12AB1234", "Pune - Mumbai Express", "Pune Station", "Mumbai Central", "01:00 PM", "04:30 PM", "Daily"),
            TimetableEntry("MH12AB1234", "Pune - Mumbai Express", "Pune Station", "Mumbai Central", "02:00 PM", "05:30 PM", "Daily"),
            TimetableEntry("MH12AB1234", "Pune - Mumbai Express", "Pune Station", "Mumbai Central", "03:00 PM", "06:30 PM", "Daily"),
            TimetableEntry("MH12AB1234", "Pune - Mumbai Express", "Pune Station", "Mumbai Central", "04:00 PM", "07:30 PM", "Daily"),
            TimetableEntry("MH12AB1234", "Pune - Mumbai Express", "Pune Station", "Mumbai Central", "05:00 PM", "08:30 PM", "Daily"),
            TimetableEntry("MH12AB1234", "Pune - Mumbai Express", "Pune Station", "Mumbai Central", "06:00 PM", "09:30 PM", "Daily"),
            TimetableEntry("MH12AB1234", "Pune - Mumbai Express", "Pune Station", "Mumbai Central", "07:00 PM", "10:30 PM", "Daily"),
            TimetableEntry("MH12AB1234", "Pune - Mumbai Express", "Pune Station", "Mumbai Central", "08:00 PM", "11:30 PM", "Daily"),
            TimetableEntry("MH12AB1234", "Pune - Mumbai Express", "Pune Station", "Mumbai Central", "09:00 PM", "12:30 AM", "Daily"),
            TimetableEntry("MH12AB1234", "Pune - Mumbai Express", "Pune Station", "Mumbai Central", "10:00 PM", "01:30 AM", "Daily"),
            TimetableEntry("MH12AB1234", "Pune - Mumbai Express", "Pune Station", "Mumbai Central", "11:00 PM", "02:30 AM", "Daily"),
            
            // Mumbai - Nashik Route
            TimetableEntry("MH14CD5678", "Mumbai - Nashik Super Fast", "Mumbai Central", "Nashik Station", "06:30 AM", "10:00 AM", "Daily"),
            TimetableEntry("MH14CD5678", "Mumbai - Nashik Super Fast", "Mumbai Central", "Nashik Station", "09:30 AM", "01:00 PM", "Daily"),
            TimetableEntry("MH14CD5678", "Mumbai - Nashik Super Fast", "Mumbai Central", "Nashik Station", "12:30 PM", "04:00 PM", "Daily"),
            TimetableEntry("MH14CD5678", "Mumbai - Nashik Super Fast", "Mumbai Central", "Nashik Station", "03:30 PM", "07:00 PM", "Daily"),
            TimetableEntry("MH14CD5678", "Mumbai - Nashik Super Fast", "Mumbai Central", "Nashik Station", "06:30 PM", "10:00 PM", "Daily"),
            TimetableEntry("MH14CD5678", "Mumbai - Nashik Super Fast", "Mumbai Central", "Nashik Station", "09:30 PM", "01:00 AM", "Daily"),
            
            // Pune - Aurangabad Route
            TimetableEntry("MH16EF9012", "Pune - Aurangabad Local", "Pune Station", "Aurangabad Central", "07:00 AM", "12:00 PM", "Daily"),
            TimetableEntry("MH16EF9012", "Pune - Aurangabad Local", "Pune Station", "Aurangabad Central", "02:00 PM", "07:00 PM", "Daily"),
            TimetableEntry("MH16EF9012", "Pune - Aurangabad Local", "Pune Station", "Aurangabad Central", "08:00 PM", "01:00 AM", "Daily"),
            
            // Mumbai - Nagpur Route
            TimetableEntry("MH18GH3456", "Mumbai - Nagpur AC Deluxe", "Mumbai Central", "Nagpur Station", "08:00 PM", "08:00 AM", "Daily"),
            TimetableEntry("MH18GH3456", "Mumbai - Nagpur AC Deluxe", "Mumbai Central", "Nagpur Station", "09:00 PM", "09:00 AM", "Daily"),
            TimetableEntry("MH18GH3456", "Mumbai - Nagpur AC Deluxe", "Mumbai Central", "Nagpur Station", "10:00 PM", "10:00 AM", "Daily"),
            
            // Local Routes
            TimetableEntry("MH22KL1122", "Local City Route 1", "City Center", "Airport", "06:00 AM", "06:45 AM", "Daily"),
            TimetableEntry("MH22KL1122", "Local City Route 1", "City Center", "Airport", "07:00 AM", "07:45 AM", "Daily"),
            TimetableEntry("MH22KL1122", "Local City Route 1", "City Center", "Airport", "08:00 AM", "08:45 AM", "Daily"),
            TimetableEntry("MH22KL1122", "Local City Route 1", "City Center", "Airport", "09:00 AM", "09:45 AM", "Daily"),
            TimetableEntry("MH22KL1122", "Local City Route 1", "City Center", "Airport", "10:00 AM", "10:45 AM", "Daily"),
            TimetableEntry("MH22KL1122", "Local City Route 1", "City Center", "Airport", "11:00 AM", "11:45 AM", "Daily"),
            TimetableEntry("MH22KL1122", "Local City Route 1", "City Center", "Airport", "12:00 PM", "12:45 PM", "Daily"),
            TimetableEntry("MH22KL1122", "Local City Route 1", "City Center", "Airport", "01:00 PM", "01:45 PM", "Daily"),
            TimetableEntry("MH22KL1122", "Local City Route 1", "City Center", "Airport", "02:00 PM", "02:45 PM", "Daily"),
            TimetableEntry("MH22KL1122", "Local City Route 1", "City Center", "Airport", "03:00 PM", "03:45 PM", "Daily"),
            TimetableEntry("MH22KL1122", "Local City Route 1", "City Center", "Airport", "04:00 PM", "04:45 PM", "Daily"),
            TimetableEntry("MH22KL1122", "Local City Route 1", "City Center", "Airport", "05:00 PM", "05:45 PM", "Daily"),
            TimetableEntry("MH22KL1122", "Local City Route 1", "City Center", "Airport", "06:00 PM", "06:45 PM", "Daily"),
            TimetableEntry("MH22KL1122", "Local City Route 1", "City Center", "Airport", "07:00 PM", "07:45 PM", "Daily"),
            TimetableEntry("MH22KL1122", "Local City Route 1", "City Center", "Airport", "08:00 PM", "08:45 PM", "Daily"),
            TimetableEntry("MH22KL1122", "Local City Route 1", "City Center", "Airport", "09:00 PM", "09:45 PM", "Daily"),
            TimetableEntry("MH22KL1122", "Local City Route 1", "City Center", "Airport", "10:00 PM", "10:45 PM", "Daily")
        )
    }
    
    private fun filterTimetable() {
        val selectedRoute = routeSpinner.selectedItem.toString()
        val selectedTimeType = timeTypeSpinner.selectedItem.toString()
        
        val filteredEntries = allTimetableEntries.filter { entry ->
            val routeMatch = selectedRoute == "All Routes" || entry.routeName.contains(selectedRoute.replace(" - ", " - "), ignoreCase = true)
            val timeMatch = selectedTimeType == "All Times" || isTimeInRange(entry.departureTime, selectedTimeType)
            
            routeMatch && timeMatch
        }
        
        timetableAdapter.updateTimetable(filteredEntries)
    }
    
    private fun isTimeInRange(time: String, timeType: String): Boolean {
        val hour = extractHour(time)
        
        return when (timeType) {
            "Morning (6AM - 12PM)" -> hour in 6..11
            "Afternoon (12PM - 6PM)" -> hour in 12..17
            "Evening (6PM - 12AM)" -> hour in 18..23
            "Night (12AM - 6AM)" -> hour in 0..5
            else -> true
        }
    }
    
    private fun extractHour(time: String): Int {
        return try {
            val cleanTime = time.replace(" AM", "").replace(" PM", "")
            val parts = cleanTime.split(":")
            var hour = parts[0].toInt()
            
            if (time.contains("PM") && hour != 12) {
                hour += 12
            } else if (time.contains("AM") && hour == 12) {
                hour = 0
            }
            
            hour
        } catch (e: Exception) {
            0
        }
    }
    
    override fun onOptionsItemSelected(item: MenuItem): Boolean {
        return when (item.itemId) {
            android.R.id.home -> {
                onBackPressed()
                true
            }
            else -> super.onOptionsItemSelected(item)
        }
    }
}