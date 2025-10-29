# 🔧 Debugging 404 Error on Panel Pre-Ventas

**Issue:** Dashboard (Panel Pre-Ventas) returns 404 when loading pre-sales  
**Status:** Pre-Ventas form works ✅ | Dashboard fails ❌  
**Date:** October 28, 2025

---

## Root Cause Analysis

### What's Working
✅ **Pre-Ventas (Phase 3)** - Purchase form loads and works
- This proves authentication is working
- Routing is working
- Basic API connection exists

### What's Broken
❌ **Panel Pre-Ventas (Phase 4)** - Dashboard returns 404
- Error: "Request failed with status code 404"
- This happens when calling `GET /api/presale/items`
- Backend endpoint is not responding

---

## Likely Causes (Check in Order)

### 1. **Backend Not Running** (Most Common)
**Check:**
```bash
# Check if Railway backend is running
curl -X GET https://hot-wheels-manager-production.up.railway.app/api/presale/items \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Fix:** Ensure Railway deployment is active
- Go to Railway Dashboard
- Select "hot-wheels-manager-backend"
- Check "Deployments" tab - should show recent active deployment
- If no recent deployment, redeploy manually

### 2. **Wrong API URL** (Second Most Common)
**Check environment variable:**
```typescript
// Open browser console and check:
console.log(import.meta.env.VITE_API_URL)
```

**Should show:** `https://hot-wheels-manager-production.up.railway.app/api`

**Fix if wrong:**
- For Vercel **Preview/Staging**: Set `VITE_API_URL=https://hot-wheels-manager-staging.up.railway.app/api`
- For Vercel **Production**: Set `VITE_API_URL=https://hot-wheels-manager-production.up.railway.app/api`

### 3. **CORS Issue** (Third Most Common)
**Check:**
- Open browser DevTools → Network tab
- Try to fetch pre-sales
- Look for CORS error in response headers

**Fix:**
1. Go to Railway Dashboard
2. Select backend service
3. Go to Variables
4. Check `CORS_ORIGIN` includes your Vercel domain:
   ```
   CORS_ORIGIN=https://hot-wheels-manager-staging.vercel.app,https://hot-wheels-manager.vercel.app
   ```
5. Redeploy backend

### 4. **Backend Service Not Deployed**
**Check:**
- Go to Railway Dashboard
- Check if backend shows as "Running"
- Check logs for errors

**Fix:** Redeploy backend
```bash
# Via Railway CLI
railway deploy --service hot-wheels-manager-backend
```

---

## Step-by-Step Fix Guide

### Step 1: Verify Vercel Configuration
```
1. Go to https://vercel.com/dashboard
2. Select "hot-wheels-manager" project
3. Click Settings → Environment Variables
4. Check if VITE_API_URL is set for all environments
5. Should have:
   - Preview: https://hot-wheels-manager-staging.up.railway.app/api
   - Production: https://hot-wheels-manager-production.up.railway.app/api
```

### Step 2: Verify Railway Backend
```
1. Go to https://railway.app/dashboard
2. Select "hot-wheels-manager-backend" service
3. Check if it's in "Running" state
4. Check "Recent Deployments" - should have recent build
5. If failed, check logs for errors
```

### Step 3: Check Backend Connectivity
```bash
# Test API endpoint directly
curl -X GET https://hot-wheels-manager-production.up.railway.app/api/health

# Should return: {"status":"ok"} or similar

# Test with authorization
curl -X GET https://hot-wheels-manager-production.up.railway.app/api/presale/items \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Step 4: Redeploy Frontend
```
1. Go to Vercel Dashboard
2. Select hot-wheels-manager project
3. Click "Deployments"
4. Find latest deployment
5. Click "..." → "Redeploy"
6. Wait for new deployment to complete
```

### Step 5: Test in Browser
```
1. Go to https://hot-wheels-manager.vercel.app/presale/dashboard
2. Open DevTools (F12)
3. Check Console for VITE_API_URL
4. Check Network tab for API requests
5. Should see successful responses
```

---

## Quick Diagnostic Checklist

- [ ] Backend is deployed on Railway
- [ ] Backend is in "Running" state
- [ ] VITE_API_URL is set in Vercel env vars
- [ ] CORS_ORIGIN includes Vercel domain
- [ ] Recent deployment exists (within last 24h)
- [ ] No recent errors in Railway logs
- [ ] API endpoint responds with 200 (not 404)
- [ ] Authorization header sent correctly
- [ ] Frontend deployed after env var changes

---

## Common Error Messages & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| 404 Not Found | Backend not running | Deploy backend |
| CORS blocked | Domain not in CORS_ORIGIN | Update CORS_ORIGIN |
| 401 Unauthorized | No token or expired | Check auth token |
| 500 Internal Error | Backend error | Check Railway logs |
| Connection refused | Backend unreachable | Check Railway status |
| Timeout | Backend slow | Check Railway CPU/memory |

---

## Temporary Local Testing

If staging/production have issues, test locally first:

```bash
# Terminal 1: Start backend
cd backend
npm run dev

# Terminal 2: Start frontend (with local API)
cd frontend
VITE_API_URL=http://localhost:3001/api npm run dev
```

---

## Prevention Tips

1. **Set env vars BEFORE deploying frontend**
   - Set them in Vercel BEFORE triggering build

2. **Always redeploy frontend after changing backend URL**
   - New env vars won't apply to old builds

3. **Monitor Railway dashboard**
   - Check regularly for failed deployments

4. **Use health check endpoint**
   - Add `/api/health` endpoint for monitoring

5. **Enable Railway logs**
   - Check logs immediately if deployment fails

---

## Next Steps

**If this checklist doesn't find the issue:**

1. Share Railway logs from recent deployments
2. Share browser console output
3. Share Network tab requests/responses
4. Share Vercel deployment log
5. Share exact error message from dashboard

---

**Status:** Needs diagnosis and configuration fix  
**Severity:** High (Phase 4 broken on staging)  
**Est. Fix Time:** 15-30 minutes
