#!/bin/bash
set -e

echo "🚀 Starting Hot Wheels Manager Backend..."
echo "📁 Current directory: $(pwd)"
echo "📂 Listing contents:"
ls -la

echo "📁 Backend directory contents:"
ls -la backend/

echo "🔧 Node.js version: $(node --version)"
echo "📦 npm version: $(npm --version)"

echo "🎯 Environment variables:"
echo "  NODE_ENV: $NODE_ENV"
echo "  PORT: $PORT"
echo "  MONGODB_URI: ${MONGODB_URI:0:20}..." # Show first 20 chars only

echo "🏗️  Building application..."
cd backend
npm run build

echo "🚀 Starting server..."
npm start