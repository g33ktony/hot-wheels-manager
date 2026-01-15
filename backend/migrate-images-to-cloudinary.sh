#!/bin/bash

##############################################################################
# Migrate Images to Cloudinary
#
# This script migrates all base64 images from MongoDB to Cloudinary CDN
# and replaces them with Cloudinary URLs in the database.
#
# Usage:
#   ./migrate-images-to-cloudinary.sh [database-name] [mongodb-uri]
#
# Examples:
#   ./migrate-images-to-cloudinary.sh                    # Uses Railway MongoDB
#   ./migrate-images-to-cloudinary.sh railway            # Explicit db name
#   ./migrate-images-to-cloudinary.sh "mongodb://..."    # Custom connection
#
# Variables needed in .env:
#   - CLOUDINARY_CLOUD_NAME
#   - CLOUDINARY_API_KEY
#   - CLOUDINARY_API_SECRET
#   - CLOUDINARY_UPLOAD_PRESET
#   - MONGODB_URI (optional, if not passed as argument)
#
##############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Load environment variables if .env exists
if [ -f .env ]; then
  export $(cat .env | grep -v '#' | xargs)
fi

# Parse arguments
DB_NAME="${1:-railway}"
MONGODB_URI="${2:-$MONGODB_URI}"

# Validate Cloudinary configuration
if [ -z "$CLOUDINARY_CLOUD_NAME" ] || [ -z "$CLOUDINARY_UPLOAD_PRESET" ]; then
  echo -e "${RED}❌ Error: Cloudinary configuration missing!${NC}"
  echo -e "${YELLOW}Please set these environment variables in .env:${NC}"
  echo "   - CLOUDINARY_CLOUD_NAME"
  echo "   - CLOUDINARY_API_KEY"
  echo "   - CLOUDINARY_API_SECRET"
  echo "   - CLOUDINARY_UPLOAD_PRESET"
  exit 1
fi

# Validate MongoDB connection
if [ -z "$MONGODB_URI" ]; then
  echo -e "${RED}❌ Error: MongoDB connection URI not provided!${NC}"
  echo -e "${YELLOW}Usage:${NC}"
  echo "   ./migrate-images-to-cloudinary.sh [database-name] [mongodb-uri]"
  echo ""
  echo -e "${YELLOW}Or set MONGODB_URI in .env file${NC}"
  exit 1
fi

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   🖼️  Cloudinary Image Migration Tool  ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Configuration:${NC}"
echo "   Database: $DB_NAME"
echo "   Cloud Name: $CLOUDINARY_CLOUD_NAME"
echo "   Upload Preset: $CLOUDINARY_UPLOAD_PRESET"
echo ""

# Check if TypeScript compiler is available
if ! command -v npx &> /dev/null; then
  echo -e "${RED}❌ Error: npm/npx not found!${NC}"
  exit 1
fi

# Run the migration script
echo -e "${BLUE}🚀 Starting migration...${NC}"
echo ""

MONGODB_URI="$MONGODB_URI" \
CLOUDINARY_CLOUD_NAME="$CLOUDINARY_CLOUD_NAME" \
CLOUDINARY_API_KEY="$CLOUDINARY_API_KEY" \
CLOUDINARY_API_SECRET="$CLOUDINARY_API_SECRET" \
CLOUDINARY_UPLOAD_PRESET="$CLOUDINARY_UPLOAD_PRESET" \
npx ts-node src/scripts/migrateImagesToCloudinary.ts "$DB_NAME"

if [ $? -eq 0 ]; then
  echo ""
  echo -e "${GREEN}✅ Migration completed successfully!${NC}"
  echo ""
  echo -e "${BLUE}Next steps:${NC}"
  echo "   1. Check the backup in: backend/backups/"
  echo "   2. Verify images are loading correctly in your app"
  echo "   3. Monitor Cloudinary usage in your dashboard"
  exit 0
else
  echo ""
  echo -e "${RED}❌ Migration failed!${NC}"
  exit 1
fi
