@echo off
echo 🚀 Deploying MargSetu Backend to Vercel...

REM Check if vercel CLI is installed
where vercel >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Vercel CLI not found. Installing...
    npm install -g vercel
)

REM Install dependencies
echo 📦 Installing dependencies...
npm install

REM Deploy to production
echo 🌐 Deploying to production...
vercel --prod

echo ✅ Deployment complete! Check your Vercel dashboard for the URL.
pause