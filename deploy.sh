#!/bin/bash

# Hot Wheels Manager - Deployment Script
echo "🚀 Hot Wheels Manager Deployment Script"
echo "======================================"

# Check if required tools are installed
command -v git >/dev/null 2>&1 || { echo "❌ Git is required but not installed. Aborting."; exit 1; }
command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required but not installed. Aborting."; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "❌ npm is required but not installed. Aborting."; exit 1; }

echo "✅ Prerequisites check passed"

# Build the application
echo "🔨 Building application..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please fix the errors and try again."
    exit 1
fi

echo "✅ Build completed successfully"

# Check if .env files exist
if [ ! -f "backend/.env" ]; then
    echo "⚠️  Backend .env file not found. Copying from .env.example..."
    cp backend/.env.example backend/.env
    echo "📝 Please edit backend/.env with your production values"
fi

if [ ! -f "frontend/.env" ]; then
    echo "⚠️  Frontend .env file not found. Copying from .env.example..."
    cp frontend/.env.example frontend/.env
    echo "📝 Please edit frontend/.env with your production values"
fi

echo ""
echo "🎯 Next steps:"
echo "1. Set up your MongoDB Atlas database"
echo "2. Update environment variables in .env files"
echo "3. Choose a deployment platform:"
echo "   - Vercel + Railway (recommended)"
echo "   - Vercel + Render"
echo "   - DigitalOcean App Platform"
echo "4. Follow the deployment guide in DEPLOYMENT.md"
echo ""
echo "📚 For detailed instructions, see DEPLOYMENT.md"
