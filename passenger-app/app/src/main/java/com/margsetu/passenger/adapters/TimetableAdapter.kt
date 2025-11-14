package com.margsetu.passenger.adapters

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.button.MaterialButton
import com.margsetu.passenger.R
import com.margsetu.passenger.models.TimetableEntry
import com.margsetu.passenger.utils.SMSUtils

class TimetableAdapter(
    private var entries: MutableList<TimetableEntry>,
    private val onSmsQueryClick: ((TimetableEntry) -> Unit)? = null
) : RecyclerView.Adapter<TimetableAdapter.TimetableViewHolder>() {
    
    class TimetableViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        val busNumber: TextView = itemView.findViewById(R.id.busNumber)
        val routeName: TextView = itemView.findViewById(R.id.routeName)
        val stations: TextView = itemView.findViewById(R.id.stations)
        val departureTime: TextView = itemView.findViewById(R.id.departureTime)
        val arrivalTime: TextView = itemView.findViewById(R.id.arrivalTime)
        val frequency: TextView = itemView.findViewById(R.id.frequency)
        val btnSmsQuery: MaterialButton = itemView.findViewById(R.id.btnSmsQuery)
    }
    
    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): TimetableViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_timetable_entry, parent, false)
        return TimetableViewHolder(view)
    }
    
    override fun onBindViewHolder(holder: TimetableViewHolder, position: Int) {
        val entry = entries[position]
        
        holder.busNumber.text = entry.busNumber
        holder.routeName.text = entry.routeName
        holder.stations.text = "${entry.fromStation} → ${entry.toStation}"
        holder.departureTime.text = entry.departureTime
        holder.arrivalTime.text = entry.arrivalTime
        holder.frequency.text = entry.frequency
        
        // SMS Query button click handler
        holder.btnSmsQuery.setOnClickListener {
            try {
                // Send SMS query directly to SMS Gateway phone for this bus's location
                SMSUtils.sendBusLocationQuery(holder.itemView.context, entry.busNumber)
                
                // Optionally trigger callback if provided
                onSmsQueryClick?.invoke(entry)
            } catch (e: Exception) {
                e.printStackTrace()
                android.widget.Toast.makeText(
                    holder.itemView.context, 
                    "Failed to send SMS query: ${e.message}", 
                    android.widget.Toast.LENGTH_SHORT
                ).show()
            }
        }
    }
    
    override fun getItemCount(): Int = entries.size
    
    fun updateTimetable(newEntries: List<TimetableEntry>) {
        entries.clear()
        entries.addAll(newEntries)
        notifyDataSetChanged()
    }
}