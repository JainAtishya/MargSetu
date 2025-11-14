# Allow Node.js through Windows Firewall for API testing
Write-Host "🔥 Setting up Windows Firewall for Node.js API access..." -ForegroundColor Yellow

# Allow Node.js through firewall (run as Administrator)
New-NetFirewallRule -DisplayName "Node.js API Server" -Direction Inbound -Protocol TCP -LocalPort 5000 -Action Allow
Write-Host "✅ Added firewall rule for port 5000" -ForegroundColor Green

# Show current IP addresses
Write-Host "`n🌐 Your computer's IP addresses:" -ForegroundColor Cyan
ipconfig | findstr "IPv4"

Write-Host "`n📱 Test these URLs in your phone browser:" -ForegroundColor Yellow
Write-Host "http://10.50.2.31:5000/api/android/stations" -ForegroundColor White
Write-Host "http://192.168.137.1:5000/api/android/stations" -ForegroundColor White

Write-Host "`n🚀 Next steps:" -ForegroundColor Cyan
Write-Host "1. Test URLs in phone browser first" -ForegroundColor White
Write-Host "2. If working, install updated APK" -ForegroundColor White
Write-Host "3. App should now connect to real API!" -ForegroundColor White