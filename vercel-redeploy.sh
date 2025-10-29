#!/bin/bash

###############################################################################
# Vercel Redeploy Script
# Force a production redeploy on Vercel
#
# Usage:
#   ./vercel-redeploy.sh
#   
# This script will trigger a production redeploy on Vercel
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Vercel Redeploy Script                                    ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if Vercel CLI is installed
echo -e "${CYAN}Step 1: Checking for Vercel CLI...${NC}"
if command -v vercel &> /dev/null; then
    echo -e "${GREEN}✅ Vercel CLI found${NC}"
else
    echo -e "${YELLOW}⚠️  Vercel CLI not installed${NC}"
    echo "Installing Vercel CLI..."
    npm install -g vercel
    if command -v vercel &> /dev/null; then
        echo -e "${GREEN}✅ Vercel CLI installed successfully${NC}"
    else
        echo -e "${RED}❌ Failed to install Vercel CLI${NC}"
        echo "Please install manually: npm install -g vercel"
        exit 1
    fi
fi
echo ""

# Show current deployments
echo -e "${CYAN}Step 2: Checking recent deployments...${NC}"
vercel ls --limit 5 2>/dev/null | head -10 || true
echo ""

# Trigger redeploy
echo -e "${CYAN}Step 3: Triggering production redeploy...${NC}"
echo -e "${YELLOW}This will redeploy your production environment${NC}"
echo ""

read -p "Continue with production redeploy? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}⏭️  Redeploy cancelled by user${NC}"
    exit 0
fi

echo ""
echo -e "${BLUE}Deploying to production...${NC}"

if vercel deploy --prod --yes 2>&1 | tee /tmp/vercel-deploy.log; then
    echo -e "${GREEN}✅ Redeploy initiated successfully${NC}"
    
    # Extract URL from logs
    DEPLOY_URL=$(grep -i "https://" /tmp/vercel-deploy.log | tail -1 | grep -o "https://[^ ]*" || echo "Check dashboard")
    
    echo ""
    echo -e "${GREEN}✅ REDEPLOY SUCCESSFUL${NC}"
    echo ""
    echo -e "${BLUE}Deployment Details:${NC}"
    echo "  URL: $DEPLOY_URL"
    echo "  Status: Deploying (check Vercel dashboard)"
    echo ""
    echo -e "${YELLOW}Next Steps:${NC}"
    echo "  1. Wait 2-3 minutes for deployment to complete"
    echo "  2. Check: https://vercel.com/dashboard"
    echo "  3. Test the application with new changes"
    echo ""
    
else
    echo -e "${RED}❌ Redeploy failed${NC}"
    echo "Check the logs above for details"
    exit 1
fi

echo -e "${CYAN}Monitoring deployment...${NC}"
echo "Check your Vercel dashboard at: https://vercel.com/dashboard"
echo ""
