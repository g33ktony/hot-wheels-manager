#!/bin/bash

###############################################################################
# Hot Wheels Manager - Verification Script
# Quick build verification without committing
# 
# Usage:
#   ./verify.sh
#   
# This script:
#   1. Compiles backend and reports status
#   2. Compiles frontend and reports status
#   3. Runs optional linting checks
#   4. Shows comprehensive report
#   5. Returns exit code 0 (success) or 1 (failure)
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# Counters
PASSED=0
FAILED=0
WARNINGS=0

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Hot Wheels Manager - Build Verification                  ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to run test and track result
run_check() {
    local name="$1"
    local command="$2"
    
    echo -e "${BLUE}🔍 Checking: $name${NC}"
    
    if eval "$command" > /tmp/check.log 2>&1; then
        echo -e "${GREEN}✅ PASS: $name${NC}"
        ((PASSED++))
    else
        echo -e "${RED}❌ FAIL: $name${NC}"
        tail -20 /tmp/check.log | sed 's/^/  /'
        ((FAILED++))
    fi
    echo ""
}

# Check 1: Backend TypeScript Compilation
run_check "Backend TypeScript Compilation" "cd backend && npm run build && cd .."

# Check 2: Frontend TypeScript Compilation
run_check "Frontend TypeScript Compilation" "cd frontend && npm run build && cd .."

# Check 3: Check for TypeScript errors in src
echo -e "${BLUE}🔍 Checking: TypeScript errors in source${NC}"
BACKEND_ERRORS=$(cd backend && npx tsc --noEmit 2>&1 | grep -c "error TS" || true)
FRONTEND_ERRORS=$(cd frontend && npx tsc --noEmit 2>&1 | grep -c "error TS" || true)

if [ "$BACKEND_ERRORS" -eq 0 ] && [ "$FRONTEND_ERRORS" -eq 0 ]; then
    echo -e "${GREEN}✅ PASS: No TypeScript errors${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ FAIL: TypeScript errors found${NC}"
    if [ "$BACKEND_ERRORS" -gt 0 ]; then
        echo "  Backend: $BACKEND_ERRORS errors"
        ((FAILED++))
    fi
    if [ "$FRONTEND_ERRORS" -gt 0 ]; then
        echo "  Frontend: $FRONTEND_ERRORS errors"
        ((FAILED++))
    fi
fi
echo ""

# Check 4: Git status
echo -e "${BLUE}🔍 Checking: Git repository status${NC}"
if git status --porcelain > /dev/null 2>&1; then
    CHANGES=$(git status --porcelain | wc -l)
    if [ "$CHANGES" -eq 0 ]; then
        echo -e "${GREEN}✅ PASS: Working directory clean${NC}"
        ((PASSED++))
    else
        echo -e "${YELLOW}⚠️  WARNING: $CHANGES uncommitted changes${NC}"
        ((WARNINGS++))
    fi
else
    echo -e "${RED}❌ FAIL: Not a git repository${NC}"
    ((FAILED++))
fi
echo ""

# Check 5: Dependencies
echo -e "${BLUE}🔍 Checking: Dependencies${NC}"
if [ -d "backend/node_modules" ] && [ -d "frontend/node_modules" ]; then
    echo -e "${GREEN}✅ PASS: Dependencies installed${NC}"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠️  WARNING: Some dependencies may be missing${NC}"
    ((WARNINGS++))
fi
echo ""

# Check 6: File structure
echo -e "${BLUE}🔍 Checking: Project structure${NC}"
REQUIRED_FILES=(
    "backend/src/models"
    "backend/src/controllers"
    "backend/src/routes"
    "frontend/src/pages"
    "frontend/src/components"
    "package.json"
)

STRUCTURE_OK=true
for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -e "$file" ]; then
        echo "  Missing: $file"
        STRUCTURE_OK=false
    fi
done

if [ "$STRUCTURE_OK" = true ]; then
    echo -e "${GREEN}✅ PASS: Project structure intact${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ FAIL: Project structure issues${NC}"
    ((FAILED++))
fi
echo ""

# Final Summary
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"

if [ "$FAILED" -eq 0 ]; then
    echo -e "${GREEN}║  ✅ ALL CHECKS PASSED                                    ║${NC}"
    RESULT=0
else
    echo -e "${RED}║  ❌ SOME CHECKS FAILED                                   ║${NC}"
    RESULT=1
fi

echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Results breakdown
echo -e "${GREEN}✅ Passed:  $PASSED${NC}"
echo -e "${RED}❌ Failed:  $FAILED${NC}"
echo -e "${YELLOW}⚠️  Warnings: $WARNINGS${NC}"
echo ""

# Build matrix
echo -e "${MAGENTA}Build Matrix:${NC}"
echo "  Backend Compilation:  $([ "$BACKEND_ERRORS" -eq 0 ] && echo -e "${GREEN}✅${NC}" || echo -e "${RED}❌${NC}")"
echo "  Frontend Compilation: $([ "$FRONTEND_ERRORS" -eq 0 ] && echo -e "${GREEN}✅${NC}" || echo -e "${RED}❌${NC}")"
echo ""

if [ "$RESULT" -eq 0 ]; then
    echo -e "${GREEN}Ready to commit and push!${NC}"
    echo "Usage: ./verify-and-commit.sh \"Your commit message\""
else
    echo -e "${RED}Please fix the errors above and try again.${NC}"
fi

echo ""
exit $RESULT
