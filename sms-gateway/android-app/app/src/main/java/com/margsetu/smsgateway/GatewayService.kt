package com.margsetu.smsgateway

import android.app.Notification
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat

class GatewayService : Service() {
    
    companion object {
        private const val NOTIFICATION_ID = 1001
    }
    
    override fun onCreate() {
        super.onCreate()
        startForeground(NOTIFICATION_ID, createNotification())
    }
    
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val config = GatewayConfig.getInstance(this)
        val logManager = LogManager.getInstance(this)
        
        if (config.isConfigurationValid()) {
            logManager.addLog("Gateway service started", LogType.SUCCESS)
        } else {
            logManager.addLog("Gateway service started with invalid configuration", LogType.WARNING)
        }
        
        return START_STICKY // Restart service if killed
    }
    
    override fun onDestroy() {
        super.onDestroy()
        val logManager = LogManager.getInstance(this)
        logManager.addLog("Gateway service stopped", LogType.INFO)
    }
    
    override fun onBind(intent: Intent?): IBinder? {
        return null
    }
    
    private fun createNotification(): Notification {
        val notificationIntent = Intent(this, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            notificationIntent,
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PendingIntent.FLAG_IMMUTABLE
            } else {
                PendingIntent.FLAG_UPDATE_CURRENT
            }
        )
        
        return NotificationCompat.Builder(this, GatewayApplication.NOTIFICATION_CHANNEL_ID)
            .setContentTitle(getString(R.string.gateway_service_notification_title))
            .setContentText(getString(R.string.gateway_service_notification_text))
            .setSmallIcon(R.drawable.ic_notification)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setShowWhen(false)
            .build()
    }
}