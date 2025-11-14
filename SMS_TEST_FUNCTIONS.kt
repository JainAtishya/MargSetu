// Test SMS Functionality - Add this to MainActivity.kt for testing
// This will help us determine if SMS sending is working

private fun testSMSFunctionality() {
    Log.d("MainActivity", "🧪 Testing SMS functionality...")
    
    // Check SMS permission
    if (!hasSMSPermissions()) {
        Log.e("MainActivity", "❌ SMS permission not granted!")
        Toast.makeText(this, "SMS permission required for fallback", Toast.LENGTH_LONG).show()
        requestSMSPermissions()
        return
    }
    
    Log.d("MainActivity", "✅ SMS permission granted")
    
    // Test SMS sending with a simple message
    val testMessage = "GPS:BUS001,26.912434,75.787271,0.0,0,${System.currentTimeMillis()}"
    Log.d("MainActivity", "📱 Testing SMS send: $testMessage")
    
    val success = SMSUtils.sendLocationSMS(this, testMessage)
    if (success) {
        Log.d("MainActivity", "✅ Test SMS sent successfully!")
        Toast.makeText(this, "✅ Test SMS sent to SMS Gateway!", Toast.LENGTH_SHORT).show()
    } else {
        Log.e("MainActivity", "❌ Test SMS failed!")
        Toast.makeText(this, "❌ SMS sending failed!", Toast.LENGTH_SHORT).show()
    }
}

// Add this to test network detection
private fun testNetworkDetection() {
    val isNetworkAvailable = NetworkUtils.isNetworkAvailable(this)
    val connectionType = NetworkUtils.getConnectionType(this)
    
    Log.d("MainActivity", "🌐 Network available: $isNetworkAvailable")
    Log.d("MainActivity", "🌐 Connection type: $connectionType")
    
    Toast.makeText(this, "Network: $isNetworkAvailable ($connectionType)", Toast.LENGTH_LONG).show()
}

// Test SMS permissions
private fun hasSMSPermissions(): Boolean {
    return ContextCompat.checkSelfPermission(this, Manifest.permission.SEND_SMS) == PackageManager.PERMISSION_GRANTED
}

private fun requestSMSPermissions() {
    ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.SEND_SMS), 1001)
}