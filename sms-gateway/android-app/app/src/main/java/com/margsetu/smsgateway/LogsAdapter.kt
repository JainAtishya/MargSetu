package com.margsetu.smsgateway

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView

class LogsAdapter : ListAdapter<LogEntry, LogsAdapter.LogViewHolder>(LogDiffCallback()) {
    
    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): LogViewHolder {
        val view = LayoutInflater.from(parent.context).inflate(R.layout.item_log, parent, false)
        return LogViewHolder(view)
    }
    
    override fun onBindViewHolder(holder: LogViewHolder, position: Int) {
        holder.bind(getItem(position))
    }
    
    class LogViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        private val tvTime: TextView = itemView.findViewById(R.id.tvLogTime)
        private val tvMessage: TextView = itemView.findViewById(R.id.tvLogMessage)
        private val viewIndicator: View = itemView.findViewById(R.id.viewLogIndicator)
        
        fun bind(logEntry: LogEntry) {
            tvTime.text = logEntry.getFormattedTime()
            tvMessage.text = logEntry.message
            
            // Set indicator color based on log type
            val colorRes = when (logEntry.type) {
                LogType.SUCCESS -> R.color.status_active
                LogType.ERROR -> R.color.status_inactive
                LogType.WARNING -> R.color.status_warning
                LogType.INFO -> R.color.gray_dark
            }
            
            viewIndicator.setBackgroundColor(
                ContextCompat.getColor(itemView.context, colorRes)
            )
        }
    }
    
    private class LogDiffCallback : DiffUtil.ItemCallback<LogEntry>() {
        override fun areItemsTheSame(oldItem: LogEntry, newItem: LogEntry): Boolean {
            return oldItem.timestamp == newItem.timestamp
        }
        
        override fun areContentsTheSame(oldItem: LogEntry, newItem: LogEntry): Boolean {
            return oldItem == newItem
        }
    }
}