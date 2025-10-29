# 🚀 CI/CD Pipeline Scripts - Documentation

## Overview

The Hot Wheels Manager project now includes automated scripts for building, verifying, and deploying changes. These scripts replace the manual process with a single command.

---

## Available Scripts

### 1. **verify.sh** - Build Verification Only
Compiles and verifies the project without making changes.

**Usage:**
```bash
npm run verify
# or
./verify.sh
```

**What it does:**
- ✅ Compiles backend with TypeScript
- ✅ Compiles frontend with Vite
- ✅ Checks for TypeScript errors
- ✅ Verifies project structure
- ✅ Checks dependencies
- ✅ Shows comprehensive report

**Exit codes:**
- `0` = All checks passed ✅
- `1` = Some checks failed ❌

**Example output:**
```
✅ PASS: Backend TypeScript Compilation
✅ PASS: Frontend TypeScript Compilation
✅ PASS: No TypeScript errors
✅ Passed:  5
❌ Failed:  0
Ready to commit and push!
```

---

### 2. **verify-and-commit.sh** - Verify + Commit
Compiles, verifies, stages, and commits changes in one command.

**Usage:**
```bash
npm run commit "Fix presale items in deliveries"
# or
./verify-and-commit.sh "Fix presale items in deliveries"
```

**What it does:**
1. Checks git status (warns if uncommitted changes)
2. Compiles backend
3. Compiles frontend
4. Checks for common issues (console.log, TODO comments)
5. Stages all changes (`git add -A`)
6. Creates commit with your message
7. Shows success summary with next steps

**Example:**
```bash
./verify-and-commit.sh "fix: properly handle presale items in delivery creation"

# Output:
# ✅ Backend build successful
# ✅ Frontend build successful
# ✅ Staged 5 changed files
# ✅ Commit created: ab12cd34
# 
# Next steps:
#   1. Review commit: git show
#   2. Push to remote: git push
#   3. Create PR on GitHub
```

---

### 3. **deploy.sh** - Full Deploy Pipeline
Complete end-to-end pipeline: verify, commit, and push to remote.

**Usage:**
```bash
npm run deploy "Fix presale items in deliveries"
# or
./deploy.sh "Fix presale items in deliveries"
```

**What it does:**
1. Runs full verification (all checks from verify.sh)
2. If verification passes, prompts for confirmation
3. Stages all changes
4. Creates commit
5. Pushes to current branch on remote
6. Shows comprehensive deployment summary

**Example:**
```bash
./deploy.sh "fix: presale delivery validation"

# Step 1: Running verification checks
# ✅ PASS: Backend TypeScript Compilation
# ✅ PASS: Frontend TypeScript Compilation
# ... (all checks)
# 
# Step 2: Deployment confirmation
# Branch:  feature/presale-system
# Remote:  origin
# Message: fix: presale delivery validation
# Continue with deployment? (y/n) y
#
# Step 3: Staging and committing
# ✅ Commit created: ab12cd34
#
# Step 4: Pushing to remote
# ✅ Push successful
#
# ✅ DEPLOYMENT SUCCESSFUL
# Next Steps:
#   1. Create PR on GitHub (if needed)
#   2. Review and merge changes
#   3. Deploy to production
```

---

## Quick Reference

| Script | Usage | When to Use |
|--------|-------|-----------|
| `verify.sh` | `npm run verify` | Check if code compiles before committing |
| `verify-and-commit.sh` | `npm run commit "message"` | Ready to commit locally |
| `deploy.sh` | `npm run deploy "message"` | Ready to push to remote |

---

## Workflow Examples

### Example 1: Quick Local Check
```bash
# Check if everything compiles
npm run verify

# Output:
# ✅ ALL CHECKS PASSED - READY TO PUSH
# Ready to commit and push!
# Usage: ./verify-and-commit.sh "Your commit message"
```

### Example 2: Make Changes and Commit
```bash
# 1. Make your code changes
# 2. Run verification + commit
npm run commit "feat: add presale items to deliveries"

# Output:
# ✅ ALL CHECKS PASSED - READY TO PUSH
# Next steps:
#   1. Review commit: git show
#   2. Push to remote: git push
```

### Example 3: Complete Deploy Pipeline
```bash
# Verify, commit, and push all at once
npm run deploy "feat: add presale items to deliveries"

# Prompts for confirmation, then:
# ✅ DEPLOYMENT SUCCESSFUL

# Check what was pushed:
git log -n 3 --oneline
```

---

## Features

### ✨ Smart Checks
- Detects `console.log` statements (warnings)
- Identifies TODO/FIXME comments
- Checks for uncommitted changes
- Verifies project structure
- Validates dependencies

### 🎨 Beautiful Output
- Color-coded results (green/red/yellow)
- Progress indicators
- Comprehensive summaries
- Clear next steps
- ASCII boxes for emphasis

### ⚡ Fast Execution
- Caches build results
- Minimal redundant checks
- Parallel operations where possible
- Early exit on failures

### 🛡️ Safety
- Requires explicit commit message
- Prompts before pushing
- Logs all errors
- Shows what will be committed
- Suggests next steps

---

## Error Handling

### Backend Compilation Fails
```
❌ Backend build failed
Error output:
  src/controllers/file.ts(42): Unexpected token...
```
**Fix:** Check the error message, fix the TypeScript issue, and run verify again.

### Frontend Compilation Fails
```
❌ Frontend build failed
Error output:
  src/pages/Page.tsx(10): Property 'x' does not exist...
```
**Fix:** Check the error, fix the type issue, and run verify again.

### Push Fails
```
❌ Push failed
fatal: Authentication failed for 'https://github.com/...'
```
**Fix:** Check your git credentials and SSH keys, then try deploy again.

---

## Advanced Usage

### Check Specific Branch
```bash
# Verify before pushing to different branch
git checkout feature/my-feature
npm run verify
```

### Skip Confirmation on Deploy
```bash
# Note: Still shows verification results, just skip the manual step
echo "y" | ./deploy.sh "fix: something"
```

### Run Without Git Operations
```bash
# Just verify compilation (no git operations)
npm run verify
```

### View Build Logs
```bash
# After a failed build, check logs
cat /tmp/backend-build.log
cat /tmp/frontend-build.log
```

---

## Integration with IDE

### VS Code
Add to `.vscode/tasks.json`:
```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Verify Build",
      "type": "shell",
      "command": "npm",
      "args": ["run", "verify"],
      "problemMatcher": []
    },
    {
      "label": "Deploy",
      "type": "shell",
      "command": "npm",
      "args": ["run", "deploy"],
      "problemMatcher": []
    }
  ]
}
```

Then run from Command Palette: `Tasks: Run Task`

---

## Troubleshooting

### Scripts Not Executable
```bash
# Make scripts executable
chmod +x verify.sh verify-and-commit.sh deploy.sh
```

### Permission Denied
```bash
# If you get "permission denied" when running ./script.sh
# Make sure it's executable
ls -la verify.sh  # Check permissions
chmod +x verify.sh  # Make executable
```

### Git Not Configured
```bash
# If git commands fail, configure git
git config --global user.name "Your Name"
git config --global user.email "your@email.com"
```

### npm Commands Not Found
```bash
# Make sure you're in the project root
cd /path/to/hot-wheels-manager
npm run verify  # Should work now
```

---

## Best Practices

### ✅ Do's
- ✅ Use `npm run verify` before starting work
- ✅ Use `npm run commit` when ready to commit locally
- ✅ Use `npm run deploy` when ready for production
- ✅ Write meaningful commit messages
- ✅ Read the output carefully
- ✅ Check git show before pushing

### ❌ Don'ts
- ❌ Don't force push without verification
- ❌ Don't commit without running verify first
- ❌ Don't ignore TypeScript errors
- ❌ Don't skip the deployment confirmation
- ❌ Don't leave console.log statements in code

---

## Performance

### Typical Execution Times

| Script | Time | Notes |
|--------|------|-------|
| `verify.sh` | 30-60s | Includes full compilation |
| `verify-and-commit.sh` | 35-65s | +5s for git operations |
| `deploy.sh` | 40-70s | +5-10s for push operation |

Times depend on:
- System performance
- Network speed (for push)
- Amount of changes
- Project size

---

## Continuous Integration

These scripts can also be used in CI/CD pipelines:

```yaml
# Example: GitHub Actions
- name: Verify
  run: npm run verify
  
- name: Deploy
  if: github.ref == 'refs/heads/main'
  run: npm run deploy "Deploy from CI"
```

---

## Support

### Getting Help
```bash
# View script contents
cat verify.sh
cat verify-and-commit.sh
cat deploy.sh

# Check git status
git status

# View recent commits
git log -n 10 --oneline
```

### Report Issues
If scripts fail:
1. Check the error message
2. Run `npm run verify` for details
3. Review the log files in `/tmp/`
4. Try running commands manually to debug

---

## Summary

| Task | Command |
|------|---------|
| Quick check | `npm run verify` |
| Commit locally | `npm run commit "message"` |
| Commit + push | `npm run deploy "message"` |
| Manual build | `npm run build` |

**Ready to streamline your workflow!** 🚀

---

**Last Updated:** October 29, 2024
**Version:** 1.0
