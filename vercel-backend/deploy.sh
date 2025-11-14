#!/bin/bash
echo "🚀 Deploying MargSetu Backend to Vercel..."

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Deploy to production
echo "🌐 Deploying to production..."
vercel --prod

echo "✅ Deployment complete! Check your Vercel dashboard for the URL."