# 🚀 Vercel + Railway Setup - Complete Configuration Guide

## Overview

This guide explains how to configure and deploy the Hot Wheels Manager app with:
- **Frontend**: Vercel (React + TypeScript + Vite)
- **Backend**: Railway (Node.js + Express + MongoDB Atlas)

## Part 1: Railway Backend Setup

### 1.1 Environment Variables on Railway

Go to Railway project settings and set these variables:

```env
# Environment
NODE_ENV=production
PORT=3001

# Database
MONGODB_URI=mongodb+srv://[USERNAME]:[PASSWORD]@[CLUSTER].mongodb.net/hot-wheels-manager?retryWrites=true&w=majority

# JWT Secret (use a strong random secret)
JWT_SECRET=[GENERATE_STRONG_SECRET]

# Uploads
UPLOAD_PATH=uploads
MAX_FILE_SIZE=5242880
ALLOWED_FILE_TYPES=jpeg,jpg,png,webp

# CORS - CRITICAL for authentication to work
# For staging (feature branch Vercel deployment):
CORS_ORIGIN=https://hot-wheels-manager-git-featur-*.vercel.app,https://hot-wheels-manager-staging.up.railway.app

# For production:
CORS_ORIGIN=https://hot-wheels-manager.vercel.app,https://hot-wheels-manager-production.up.railway.app

# Backend URL (Railway public domain)
BACKEND_URL=https://hot-wheels-manager-staging.up.railway.app

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=1000

# Facebook Integration (optional)
FACEBOOK_PAGE_ID=[YOUR_PAGE_ID]
FACEBOOK_ACCESS_TOKEN=[YOUR_TOKEN]
```

### 1.2 Railway Deployment Steps

1. **Connect GitHub Repository**
   - Go to Railway Dashboard
   - Click "New Project"
   - Select "Deploy from GitHub"
   - Choose your repository

2. **Configure Build Settings**
   - Service: `backend`
   - Root Directory: `./backend`
   - Build Command: `npm run build`
   - Start Command: `npm start`

3. **Set Environment Variables**
   - Add all variables from section 1.1
   - Create separate environments for staging and production

4. **Deploy**
   - Push to feature branch → automatically deploys to staging
   - Push to main → automatically deploys to production

### 1.3 Verify Backend is Working

```bash
# Check health endpoint (no auth required)
curl https://hot-wheels-manager-staging.up.railway.app/health

# Expected response:
# {
#   "status": "OK",
#   "timestamp": "2025-10-28T...",
#   "uptime": 12345,
#   "environment": "production"
# }
```

---

## Part 2: Vercel Frontend Setup

### 2.1 Environment Variables on Vercel

Go to: **Vercel Dashboard → Project Settings → Environment Variables**

**Add these variables:**

| Variable | Preview | Production | Development |
|----------|---------|------------|-------------|
| `VITE_API_URL` | `https://hot-wheels-manager-staging.up.railway.app/api` | `https://hot-wheels-manager-production.up.railway.app/api` | `http://localhost:3001/api` |
| `VITE_APP_TITLE` | `Hot Wheels Manager` | `Hot Wheels Manager` | `Hot Wheels Manager` |
| `VITE_APP_VERSION` | `1.0.0` | `1.0.0` | `1.0.0` |

**Steps:**
1. Go to https://vercel.com/dashboard
2. Select project: `hot-wheels-manager`
3. Click **Settings** → **Environment Variables**
4. For each variable:
   - **Name**: `VITE_API_URL`
   - **Value (Preview)**: `https://hot-wheels-manager-staging.up.railway.app/api`
   - **Value (Production)**: `https://hot-wheels-manager-production.up.railway.app/api`
   - Check boxes for: `Preview` and `Production`
   - Click **Add**

### 2.2 Build Settings

Vercel should auto-detect:
- **Build Command**: `npm run build:frontend`
- **Output Directory**: `frontend/dist`
- **Install Command**: `npm install`

If not, set them manually.

### 2.3 Deploy Trigger

After setting environment variables, trigger a new deployment:

**Option A: Manual Redeploy**
1. Go to Vercel Dashboard
2. Select project
3. Click "Deployments" 
4. Find the latest deployment
5. Click "Redeploy"

**Option B: Git Push**
```bash
# This will trigger automatic deployment
git push origin feature/presale-system
```

---

## Part 3: CORS Configuration Details

### Why CORS is Critical

The error `404 Not Found` on `/auth/login` can also be caused by CORS issues:

1. **Frontend** (Vercel): `https://hot-wheels-manager-*.vercel.app`
2. **Backend** (Railway): `https://hot-wheels-manager-*.up.railway.app`
3. **API Route**: `/api/auth/login`

If CORS is not configured, the browser blocks the request.

### CORS_ORIGIN Configuration

In `backend/src/index.ts`, the CORS is configured like this:

```typescript
const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173']

// Example CORS_ORIGIN values:
// Development: "http://localhost:5173"
// Staging: "https://hot-wheels-manager-git-featur-*.vercel.app,https://hot-wheels-manager-staging.up.railway.app"
// Production: "https://hot-wheels-manager.vercel.app,https://hot-wheels-manager-production.up.railway.app"
```

### How to Get Your Vercel Preview URL

Preview URLs follow this pattern:
```
https://hot-wheels-manager-git-[branch-name]-[username]-projects.vercel.app
```

Or check in Vercel Dashboard:
1. Go to your project
2. Click "Deployments"
3. Look for "Preview" deployments
4. Copy the URL for staging configuration

---

## Part 4: Verification Checklist

Use this checklist to verify everything is working:

### Backend Verification ✅

- [ ] **Health Check**
  ```bash
  curl https://hot-wheels-manager-staging.up.railway.app/health
  ```
  Expected: 200 OK with status object

- [ ] **CORS Headers Present**
  ```bash
  curl -i https://hot-wheels-manager-staging.up.railway.app/health \
    -H "Origin: https://hot-wheels-manager-git-featur-xxxxx.vercel.app"
  ```
  Expected: Response includes `Access-Control-Allow-Origin` header

- [ ] **Database Connected**
  Check Railway logs - should see: "✅ MongoDB Atlas connected successfully"

- [ ] **Environment Variables Set**
  Check Railway Project Settings - should have all required variables

### Frontend Verification ✅

- [ ] **Environment Variables Set**
  ```javascript
  // Open browser DevTools console on deployed site
  console.log(import.meta.env.VITE_API_URL)
  // Expected: "https://hot-wheels-manager-staging.up.railway.app/api"
  ```

- [ ] **API URL Correct**
  Open DevTools → Network tab → Try to login
  Expected: Request URL shows `/api/auth/login` (not just `/auth/login`)

- [ ] **CORS Headers in Request**
  Check Request headers for:
  ```
  Origin: https://hot-wheels-manager-git-featur-xxxxx.vercel.app
  ```

- [ ] **No 404 Errors**
  Network tab should show login request returning 200/401 (not 404)

### Authentication Flow Verification ✅

- [ ] **Login Works**
  1. Go to frontend URL
  2. Enter email: `admin@hotwheels.com`
  3. Enter password: (check what you set)
  4. Click login
  5. Should redirect to dashboard (not stay on login page)

- [ ] **Token Stored**
  ```javascript
  // Browser console
  localStorage.getItem('token')
  // Expected: JWT token string (starts with "eyJ...")
  ```

- [ ] **Dashboard Loads**
  After login, dashboard should load with:
  - Navigation sidebar
  - User info in header
  - Main content area

---

## Part 5: Troubleshooting

### Issue: 404 on /auth/login

**Checklist:**
- [ ] Vercel `VITE_API_URL` set correctly (includes `/api`)
- [ ] Railway `CORS_ORIGIN` includes Vercel URL
- [ ] Frontend deployment redeployed after env var changes
- [ ] Backend redeployed after CORS changes

**Debug:**
```javascript
// Browser console
fetch('https://hot-wheels-manager-staging.up.railway.app/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'admin@hotwheels.com', password: 'test' })
}).then(r => r.text()).then(console.log)
```

### Issue: CORS Error (Blocked by browser)

**Check:**
- [ ] Vercel URL matches `CORS_ORIGIN` on Railway
- [ ] No typos in URLs
- [ ] Origin header is being sent correctly

**Debug in Browser:**
```
DevTools → Network → Login request → Response Headers
Should see: "Access-Control-Allow-Origin: https://..."
```

### Issue: Token Verification Fails

**Check:**
- [ ] `JWT_SECRET` is same on backend as when token was created
- [ ] Token not expired (default: 1 day)
- [ ] Token stored correctly in localStorage

### Issue: 500 Internal Server Error

**Check Railway Logs:**
1. Go to Railway Dashboard
2. Select project
3. Click "Logs"
4. Look for error messages
5. Check MongoDB connection
6. Check environment variables

---

## Part 6: Local Development Reference

For reference, local development uses:

```env
# frontend/.env (Development)
VITE_API_URL=http://localhost:3001/api

# backend/.env (Development)  
NODE_ENV=development
PORT=3001
CORS_ORIGIN=http://localhost:5173
```

Run locally with:
```bash
npm run dev  # Runs both frontend and backend
```

---

## Part 7: Production Merge

Once everything works on staging:

1. **Test on Staging**
   - Verify all features work
   - Check performance
   - Monitor for errors

2. **Merge to Main**
   ```bash
   git checkout main
   git pull origin main
   git merge feature/presale-system
   git push origin main
   ```

3. **Monitor Production**
   - Check Vercel deployments
   - Check Railway logs
   - Monitor for errors

---

## Summary

| Step | Status | Action |
|------|--------|--------|
| 1. Railway Backend Config | ⏳ | Set all environment variables in Railway Dashboard |
| 2. Vercel Frontend Config | ⏳ | Set `VITE_API_URL` in Vercel Dashboard |
| 3. Verify Backend Health | ⏳ | Test `/health` endpoint |
| 4. Redeploy Frontend | ⏳ | Trigger new deployment on Vercel |
| 5. Test Login | ⏳ | Try login on staging URL |
| 6. Monitor Logs | ⏳ | Check for errors in Railway/Vercel logs |

---

## Quick Reference URLs

```
Frontend Staging: https://hot-wheels-manager-git-featur-*.vercel.app
Frontend Production: https://hot-wheels-manager.vercel.app

Backend Staging: https://hot-wheels-manager-staging.up.railway.app
Backend Production: https://hot-wheels-manager-production.up.railway.app

Health Check: https://hot-wheels-manager-staging.up.railway.app/health
Login Endpoint: https://hot-wheels-manager-staging.up.railway.app/api/auth/login
```

---

## Files Modified

- ✅ `frontend/.env.production` - Fixed `/api` suffix
- ✅ Documentation created

## Next Steps

1. **Set environment variables** in Railway Dashboard (if not already done)
2. **Set VITE_API_URL** in Vercel Dashboard
3. **Redeploy** both frontend and backend
4. **Test** login on staging
5. **Monitor** Railway logs for issues

