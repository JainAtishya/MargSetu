package com.margsetu.passenger.adapters

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.TextView
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.RecyclerView
import com.margsetu.passenger.R
import com.margsetu.passenger.models.Bus

class BusAdapter(
    private var buses: MutableList<Bus>,
    private val isSlowNetwork: Boolean = false,
    private val onBusClick: (Bus) -> Unit
) : RecyclerView.Adapter<BusAdapter.BusViewHolder>() {
    
    class BusViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        val busNumber: TextView = itemView.findViewById(R.id.busNumber)
        val routeName: TextView = itemView.findViewById(R.id.routeName)
        val driverName: TextView = itemView.findViewById(R.id.driverName)
        val timing: TextView = itemView.findViewById(R.id.timing)
        val seatsInfo: TextView = itemView.findViewById(R.id.seatsInfo)
        val statusIndicator: View = itemView.findViewById(R.id.statusIndicator)
        val statusText: TextView = itemView.findViewById(R.id.statusText)
        val occupancyText: TextView = itemView.findViewById(R.id.occupancyText)
        val estimatedArrival: TextView = itemView.findViewById(R.id.estimatedArrival)
        val viewDetailsButton: Button = itemView.findViewById(R.id.viewDetailsButton)
        val networkIndicator: View = itemView.findViewById(R.id.networkIndicator)
    }
    
    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): BusViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_bus_card, parent, false)
        return BusViewHolder(view)
    }
    
    override fun onBindViewHolder(holder: BusViewHolder, position: Int) {
        val bus = buses[position]
        val context = holder.itemView.context
        
        // Basic info
        holder.busNumber.text = bus.number
        holder.routeName.text = bus.route
        holder.driverName.text = "Driver: ${bus.driverName}"
        holder.timing.text = "${bus.departureTime} → ${bus.arrivalTime}"
        holder.seatsInfo.text = "${bus.seatsAvailable}/${bus.totalSeats} seats available"
        holder.estimatedArrival.text = "ETA: ${bus.estimatedArrival}"
        
        // Status indicator
        val statusColor = when (bus.status) {
            "Online" -> R.color.online_color
            "Offline" -> R.color.offline_color
            "Idle" -> R.color.idle_color
            else -> R.color.text_secondary
        }
        holder.statusIndicator.setBackgroundColor(ContextCompat.getColor(context, statusColor))
        holder.statusText.text = bus.status
        
        // Occupancy
        holder.occupancyText.text = "${bus.occupancy} Occupancy"
        val occupancyColor = when (bus.occupancy) {
            "Low" -> R.color.success_color
            "Medium" -> R.color.warning_color
            "High" -> R.color.error_color
            else -> R.color.text_secondary
        }
        holder.occupancyText.setTextColor(ContextCompat.getColor(context, occupancyColor))
        
        // Network indicator
        holder.networkIndicator.visibility = if (isSlowNetwork) View.VISIBLE else View.GONE
        
        // Button text based on network
        holder.viewDetailsButton.text = if (isSlowNetwork) "Basic Info" else "View Details"
        
        // Click listener
        holder.itemView.setOnClickListener { onBusClick(bus) }
        holder.viewDetailsButton.setOnClickListener { onBusClick(bus) }
    }
    
    override fun getItemCount(): Int = buses.size
    
    fun updateBuses(newBuses: List<Bus>) {
        buses.clear()
        buses.addAll(newBuses)
        notifyDataSetChanged()
    }
}