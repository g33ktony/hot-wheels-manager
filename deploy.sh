#!/bin/bash

###############################################################################
# Hot Wheels Manager - Complete Deploy Pipeline
# Build, verify, commit, and push in one command
# 
# Usage:
#   ./deploy.sh "Your commit message"
#   
# This script:
#   1. Runs full verification (build checks)
#   2. Creates commit with message
#   3. Pushes to current branch
#   4. Shows deployment summary
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Get commit message
COMMIT_MSG="$1"
if [ -z "$COMMIT_MSG" ]; then
    echo -e "${RED}❌ Error: Commit message required${NC}"
    echo "Usage: ./deploy.sh \"Your commit message\""
    exit 1
fi

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Hot Wheels Manager - Complete Deploy Pipeline            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Step 1: Run verification
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}Step 1: Running verification checks${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if ! ./verify.sh; then
    echo -e "${RED}❌ Verification failed. Please fix errors before deploying.${NC}"
    exit 1
fi

echo ""

# Step 2: Confirm deployment
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}Step 2: Deployment confirmation${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

BRANCH=$(git branch --show-current)
REMOTE=$(git config --get branch.$BRANCH.remote || echo "origin")

echo "Branch:  $BRANCH"
echo "Remote:  $REMOTE"
echo "Message: $COMMIT_MSG"
echo ""

read -p "Continue with deployment? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}⏭️  Deployment cancelled by user${NC}"
    exit 0
fi

echo ""

# Step 3: Stage and commit
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}Step 3: Staging and committing${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

git add -A
STAGED=$(git status --porcelain | wc -l)

if [ "$STAGED" -gt 0 ]; then
    echo -e "${BLUE}Files to commit: $STAGED${NC}"
    git status --porcelain | head -15
    
    if git commit -m "$COMMIT_MSG" > /tmp/commit.log 2>&1; then
        COMMIT_HASH=$(git log -1 --pretty=format:%h)
        echo -e "${GREEN}✅ Commit created: $COMMIT_HASH${NC}"
    else
        echo -e "${RED}❌ Commit failed${NC}"
        cat /tmp/commit.log
        exit 1
    fi
else
    echo -e "${YELLOW}⚠️  No changes to commit${NC}"
    COMMIT_HASH=$(git log -1 --pretty=format:%h)
    echo "Latest: $COMMIT_HASH"
fi

echo ""

# Step 4: Push to remote
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}Step 4: Pushing to remote${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if git push "$REMOTE" "$BRANCH" > /tmp/push.log 2>&1; then
    echo -e "${GREEN}✅ Push successful${NC}"
else
    echo -e "${RED}❌ Push failed${NC}"
    cat /tmp/push.log
    exit 1
fi

echo ""

# Step 5: Final summary
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✅ DEPLOYMENT SUCCESSFUL                                ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${GREEN}Summary:${NC}"
echo "  ✅ Verification passed"
echo "  ✅ Changes committed"
echo "  ✅ Pushed to remote"
echo ""

echo -e "${BLUE}Deployment Details:${NC}"
echo "  Branch:    $BRANCH"
echo "  Remote:    $REMOTE"
echo "  Commit:    $COMMIT_HASH"
echo "  Message:   $COMMIT_MSG"
echo ""

echo -e "${YELLOW}Next Steps:${NC}"
echo "  1. Create PR on GitHub (if needed)"
echo "  2. Review and merge changes"
echo "  3. Deploy to production"
echo ""
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
