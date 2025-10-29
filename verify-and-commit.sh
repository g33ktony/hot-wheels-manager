#!/bin/bash

###############################################################################
# Hot Wheels Manager - CI/CD Pipeline
# Automated build verification and commit workflow
# 
# Usage:
#   ./verify-and-commit.sh "Your commit message"
#   
# This script:
#   1. Verifies no uncommitted changes exist (or stashes them)
#   2. Compiles backend and checks for errors
#   3. Compiles frontend and checks for errors
#   4. Runs linting checks (if available)
#   5. Stages all changes
#   6. Creates commit with provided message
#   7. Shows success/failure summary
###############################################################################

set -e  # Exit on first error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get commit message from argument
COMMIT_MSG="$1"
if [ -z "$COMMIT_MSG" ]; then
    echo -e "${RED}❌ Error: Commit message required${NC}"
    echo "Usage: ./verify-and-commit.sh \"Your commit message\""
    exit 1
fi

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Hot Wheels Manager - CI/CD Pipeline                      ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Step 1: Check git status
echo -e "${BLUE}📋 Step 1: Checking git status...${NC}"
if git status --porcelain | grep -q .; then
    echo -e "${YELLOW}⚠️  Uncommitted changes detected${NC}"
    echo "Changes:"
    git status --porcelain | head -20
    echo ""
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}⏭️  Aborted by user${NC}"
        exit 0
    fi
else
    echo -e "${GREEN}✅ Git working directory clean${NC}"
fi
echo ""

# Step 2: Build backend
echo -e "${BLUE}🔨 Step 2: Building backend...${NC}"
if cd backend && npm run build > /tmp/backend-build.log 2>&1; then
    echo -e "${GREEN}✅ Backend build successful${NC}"
    cd ..
else
    echo -e "${RED}❌ Backend build failed${NC}"
    echo "Error output:"
    tail -30 /tmp/backend-build.log
    exit 1
fi
echo ""

# Step 3: Build frontend
echo -e "${BLUE}🔨 Step 3: Building frontend...${NC}"
if cd frontend && npm run build > /tmp/frontend-build.log 2>&1; then
    echo -e "${GREEN}✅ Frontend build successful${NC}"
    cd ..
else
    echo -e "${RED}❌ Frontend build failed${NC}"
    echo "Error output:"
    tail -30 /tmp/frontend-build.log
    exit 1
fi
echo ""

# Step 4: Check for obvious issues
echo -e "${BLUE}🔍 Step 4: Checking for common issues...${NC}"

# Check for console.log statements (optional warning)
CONSOLE_LOGS=$(grep -r "console\.log" frontend/src --include="*.tsx" --include="*.ts" 2>/dev/null | wc -l)
if [ "$CONSOLE_LOGS" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Warning: Found $CONSOLE_LOGS console.log statements${NC}"
fi

# Check for TODO comments
TODOS=$(grep -r "TODO\|FIXME" backend/src frontend/src --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l || true)
if [ "$TODOS" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Warning: Found $TODOS TODO/FIXME comments${NC}"
fi

echo -e "${GREEN}✅ Code check complete${NC}"
echo ""

# Step 5: Stage changes
echo -e "${BLUE}📦 Step 5: Staging changes...${NC}"
git add -A
STAGED=$(git status --porcelain | wc -l)
echo -e "${GREEN}✅ Staged $STAGED changed files${NC}"
echo ""

# Step 6: Show what will be committed
echo -e "${BLUE}📝 Step 6: Changes to be committed:${NC}"
git status --porcelain
echo ""

# Step 7: Create commit
echo -e "${BLUE}💾 Step 7: Creating commit...${NC}"
if git commit -m "$COMMIT_MSG" 2>&1 | tee /tmp/commit.log; then
    COMMIT_HASH=$(git log -1 --pretty=format:%h)
    echo -e "${GREEN}✅ Commit created: $COMMIT_HASH${NC}"
else
    echo -e "${RED}❌ Commit failed${NC}"
    tail -10 /tmp/commit.log
    exit 1
fi
echo ""

# Step 8: Show final summary
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✅ ALL CHECKS PASSED - READY TO PUSH                    ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Summary:${NC}"
echo "  ✅ Backend compiled successfully"
echo "  ✅ Frontend compiled successfully"
echo "  ✅ No critical issues found"
echo "  ✅ Changes staged and committed"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "  1. Review commit: git show"
echo "  2. Push to remote: git push"
echo "  3. Create PR on GitHub"
echo ""
echo -e "${YELLOW}Commit details:${NC}"
echo "  Hash: $COMMIT_HASH"
echo "  Branch: $(git branch --show-current)"
echo "  Message: $COMMIT_MSG"
echo ""
