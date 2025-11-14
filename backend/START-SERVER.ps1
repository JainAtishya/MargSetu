# 🚀 MargSetu Server - Best Startup Method
Clear-Host

Write-Host "████████████████████████████████████████" -ForegroundColor Green
Write-Host "█          MargSetu Driver App          █" -ForegroundColor Green  
Write-Host "█         Best Server Startup          █" -ForegroundColor Green
Write-Host "████████████████████████████████████████" -ForegroundColor Green
Write-Host ""

# Step 1: Clean existing processes
Write-Host "🧹 Step 1: Cleaning any existing processes..." -ForegroundColor Yellow
try {
    $processes = Get-Process node -ErrorAction SilentlyContinue
    if ($processes) {
        Stop-Process -Name node -Force
        Write-Host "✅ Killed existing Node.js processes" -ForegroundColor Green
    } else {
        Write-Host "ℹ️  No conflicting processes found" -ForegroundColor Cyan
    }
} catch {
    Write-Host "ℹ️  No processes to clean" -ForegroundColor Cyan
}

# Step 2: Wait for cleanup
Write-Host ""
Write-Host "⏳ Step 2: Waiting for cleanup..." -ForegroundColor Yellow
Start-Sleep 2
Write-Host "✅ Cleanup complete" -ForegroundColor Green

# Step 3: Check environment
Write-Host ""
Write-Host "🔍 Step 3: Checking environment..." -ForegroundColor Yellow
if (Test-Path ".env") {
    Write-Host "✅ Environment file found" -ForegroundColor Green
} else {
    Write-Host "⚠️  Environment file not found - using defaults" -ForegroundColor Yellow
}

# Step 4: Start server
Write-Host ""
Write-Host "🚀 Step 4: Starting MargSetu Server..." -ForegroundColor Green
Write-Host "🌐 Port: 5000" -ForegroundColor Cyan
Write-Host "📱 Local: http://localhost:5000" -ForegroundColor Cyan
Write-Host "🔗 Health: http://localhost:5000/health" -ForegroundColor Cyan
Write-Host ""

# Set environment for port 5000
$env:PORT = "5000"

# Start the most reliable server
try {
    node working-server.js
} catch {
    Write-Host ""
    Write-Host "❌ Server failed to start. Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "💡 Try running as Administrator" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "❌ Server stopped. Press Enter to exit..." -ForegroundColor Red
Read-Host