#!/bin/bash
set -e

echo "🔧 Installing workspace dependencies from root..."
npm install

echo "🏗️  Building backend..."
cd backend
npm run build

echo "✅ Build complete!"
