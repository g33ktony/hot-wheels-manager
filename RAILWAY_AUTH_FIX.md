# 🔧 Railway Auth Route 404 Fix

## Problem
The frontend was receiving a **404 error** when calling `/auth/login`:

```
Route /auth/login not found
Status: 404
URL: https://hot-wheels-manager-staging.up.railway.app/auth/login
```

### Root Cause
The `VITE_API_URL` environment variable was missing the `/api` prefix:

```bash
# ❌ WRONG (in frontend/.env.production)
VITE_API_URL=https://hot-wheels-manager-production.up.railway.app

# This caused frontend to call:
https://hot-wheels-manager-production.up.railway.app/auth/login
# Instead of:
https://hot-wheels-manager-production.up.railway.app/api/auth/login
```

## Solution

### 1. ✅ Fixed `.env.production`
Updated `/frontend/.env.production` to include `/api`:

```bash
# ✅ CORRECT
VITE_API_URL=https://hot-wheels-manager-production.up.railway.app/api
VITE_APP_TITLE=Hot Wheels Manager
VITE_APP_VERSION=1.0.0
```

### 2. ⚙️ Set Vercel Environment Variables

You need to set these environment variables in the **Vercel Dashboard** for preview/staging deployments:

**Go to**: `Vercel Dashboard → Project Settings → Environment Variables`

**Add these variables:**

| Variable | Value | Environment |
|----------|-------|-------------|
| `VITE_API_URL` | `https://hot-wheels-manager-staging.up.railway.app/api` | Preview (Staging) |
| `VITE_API_URL` | `https://hot-wheels-manager-production.up.railway.app/api` | Production |

**Steps:**
1. Go to https://vercel.com/dashboard
2. Select your project: `hot-wheels-manager`
3. Click "Settings" → "Environment Variables"
4. Add the staging URL for the feature branch deployment
5. Add the production URL for production deployment
6. Trigger a redeploy: `git push` to your branch

### 3. ✅ Development Environment

The development `.env` file already has the correct configuration:

```bash
# frontend/.env (Development)
VITE_API_URL=http://localhost:3001/api ✅ Correct
```

## How It Works

```
Vite Build Time:
  ├─ Reads VITE_API_URL from environment
  │   ├─ .env (development)
  │   ├─ .env.production (production)
  │   └─ Vercel Dashboard (preview)
  │
  └─ Replaces import.meta.env.VITE_API_URL with actual value
      ├─ Frontend code:
      │   const API_URL = import.meta.env.VITE_API_URL
      │
      └─ Result:
          const API_URL = 'https://hot-wheels-manager-staging.up.railway.app/api'
```

## Backend Routes

Backend Express server is correctly configured at `/api/auth`:

```typescript
// backend/src/index.ts
app.use('/api/auth', authRoutes)  // ✅ Correct

// backend/src/routes/auth.routes.ts
router.post('/login', login)      // → /api/auth/login
router.get('/verify', verifyToken) // → /api/auth/verify
```

## Testing

### Test the Fix

**Option 1: Development** (local)
```bash
npm run dev
# Frontend: http://localhost:5173
# Backend: http://localhost:3001
# Login request: http://localhost:3001/api/auth/login ✅
```

**Option 2: Staging** (Vercel Preview + Railway Staging)
1. Push code to feature branch: `git push origin feature/presale-system`
2. Wait for Vercel preview deployment
3. Check Network tab in DevTools
4. Should see request to: `https://hot-wheels-manager-staging.up.railway.app/api/auth/login` ✅

**Option 3: Production** (Vercel Production + Railway Production)
1. Merge to `main`: `git merge feature/presale-system`
2. Wait for Vercel production deployment
3. Should see request to: `https://hot-wheels-manager-production.up.railway.app/api/auth/login` ✅

### Debug Commands

```bash
# Check what API URL is being used (browser console)
console.log(import.meta.env.VITE_API_URL)

# Should output:
# Development: "http://localhost:3001/api"
# Staging: "https://hot-wheels-manager-staging.up.railway.app/api"
# Production: "https://hot-wheels-manager-production.up.railway.app/api"
```

## Checklist

- [x] Fixed `.env.production` with `/api` suffix
- [ ] Set `VITE_API_URL` in Vercel Dashboard for staging
- [ ] Set `VITE_API_URL` in Vercel Dashboard for production
- [ ] Trigger new Vercel deployment (redeploy)
- [ ] Verify login works on staging URL
- [ ] Verify login works on production URL

## Files Modified

```
frontend/.env.production
```

## Commit

```
Commit: 4a0f82a
Message: "fix: add /api to production API URL in .env.production"
```

## Related Issues

- 404 when calling `/auth/login` from staging frontend
- Missing `/api` prefix in API URL configuration
- Frontend unable to authenticate users on deployed environments

## Next Steps

1. **Set Vercel Environment Variables** (manual step needed)
2. **Trigger Vercel Redeploy** for the feature branch
3. **Test login** on staging and production URLs
4. **Merge to main** when verified

---

**Status**: 🟡 Partial Fix
- ✅ Code fix applied (`.env.production`)
- ⏳ Vercel dashboard update needed (environment variables)
- ⏳ Deployment verification pending
