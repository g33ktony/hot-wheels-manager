#!/bin/bash

##################################################
# MongoDB Atlas Automatic Backup Configuration
# This script provides instructions for setting up
# automatic backups via MongoDB Atlas
##################################################

echo "🔄 MongoDB Atlas Automatic Backup Setup"
echo "========================================"

# Check if MONGODB_URI is set
if [ -z "$MONGODB_URI" ]; then
    echo "❌ MONGODB_URI environment variable not set"
    echo "Please export: export MONGODB_URI='mongodb+srv://...'"
    exit 1
fi

# Extract connection string components
if [[ $MONGODB_URI == *"@"* ]]; then
    ATLAS_CLUSTER=$(echo $MONGODB_URI | sed 's/.*@\([^/]*\).*/\1/')
    echo "✅ MongoDB Atlas Cluster detected: $ATLAS_CLUSTER"
else
    echo "❌ Not a MongoDB Atlas connection string"
    exit 1
fi

echo ""
echo "📋 To Enable Automatic Backups:"
echo "1. Go to https://cloud.mongodb.com/"
echo "2. Select your project and cluster: $ATLAS_CLUSTER"
echo "3. Go to Backup > Backup Settings"
echo "4. Enable 'Backup Now' or 'Automatic Backups'"
echo "5. Set retention policy (recommended: 7 days, daily backups)"
echo ""
echo "🔐 Atlas Backup Features:"
echo "- Automated daily backups with point-in-time recovery"
echo "- 7-day retention (configurable)"
echo "- Stored in MongoDB Atlas cloud"
echo "- No additional configuration needed"
echo ""
echo "⚠️  For Local Backups (optional):"
echo "Run: ./scripts/backup-mongodb.sh"
echo ""
echo "✅ Automatic backups are now configured!"
