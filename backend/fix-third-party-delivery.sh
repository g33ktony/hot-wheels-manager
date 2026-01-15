#!/bin/bash

# Fix missing third-party delivery fields in existing deliveries
# Usage: ./fix-third-party-delivery.sh [mongodb-uri]

cd "$(dirname "$0")"

echo "🔧 Updating deliveries with third-party fields..."
echo ""

RAILWAY_URI="mongodb://mongo:dLyXlsBgWTbUMXixdaOqdeTvjBKOmNFZ@switchyard.proxy.rlwy.net:42764/railway?authSource=admin"

if [ -z "$1" ]; then
  # No argument, use Railway URI
  node fix-third-party-delivery.js "$RAILWAY_URI"
else
  # Use provided MongoDB URI
  node fix-third-party-delivery.js "$1"
fi

exit $?
