# Presale API 404 - Quick Fix Guide

**Issue**: `GET /api/presale/items` returns 404 on Railway  
**Status**: Debugging route added and pushed

---

## ✅ What Was Done

1. **Added Debug Route**
   - Route: `GET /api/presale/items/test/debug`
   - Purpose: Verify presale routes are loaded
   - Expected response: `{"success": true, "message": "Presale items route is loaded"}`

2. **Added Logging**
   - Console logs at each step of GET request
   - Error logging with stack trace
   - Will appear in Railway Dashboard logs

3. **Deployed**
   - Changes committed: `a5d4311`
   - Changes pushed to `feature/presale-system`
   - Ready to deploy to Railway

---

## 🚀 Next Steps (Required)

### Step 1: Trigger Railway Deployment
1. Go to Railway Dashboard: https://railway.app
2. Select `hot-wheels-manager-backend`
3. Go to "Deployments" tab
4. Click "Deploy" or push new commit to trigger auto-deploy
5. Wait for deployment to complete (2-3 minutes)

### Step 2: Test Debug Route First
```bash
# Test if presale routes are loaded
curl https://hot-wheels-manager-staging.up.railway.app/api/presale/items/test/debug

# Response should be:
{
  "success": true,
  "message": "Presale items route is loaded",
  "timestamp": "2025-10-28T11:45:00.000Z"
}
```

**Result Analysis**:
- ✅ Returns 200: Routes are loaded! Issue is in GET handler
- ❌ Returns 404: Routes not deployed yet, wait longer
- ❌ Returns 401: Authentication issue

### Step 3: Check Railway Logs
1. Railway Dashboard → `hot-wheels-manager-backend`
2. Click "Logs" tab (live)
3. Make request to `/api/presale/items`
4. Watch for debug output:
   - `📌 GET /presale/items - Filters:`
   - `📌 Calling PreSaleItemService.getPreSaleItems`
   - `✅ Successfully retrieved presale items`
   - `❌ Error in GET /presale/items`

### Step 4: Analyze Logs

**If you see "✅ Successfully retrieved presale items"**
- Route works! Check frontend
- Might be caching or token issue
- Clear browser cache and retry

**If you see "❌ Error in GET /presale/items"**
- Error message will tell you what failed
- Common issues:
  - Database connection failed
  - Service method not found
  - Model not initialized
- Share error message for next fix

**If no logs appear**
- Request might be blocked before reaching route
- Could be authentication middleware issue
- Check Railway environment variables

---

## 🔧 Troubleshooting Checklist

### Authentication
- [ ] User is logged in (check browser dev tools → Application → localStorage → "token")
- [ ] Token is not expired
- [ ] Token is being sent in request headers (check Network tab)

### Database
- [ ] MongoDB Atlas is running
- [ ] Connection string is correct (check Railway variables)
- [ ] Database user has correct permissions
- [ ] PreSaleItem collection exists

### Deployment
- [ ] Changes are deployed to Railway (check Deployments tab)
- [ ] Build succeeded (check Deploy Logs)
- [ ] No build errors (check Build Log)

### Code
- [ ] Route file was modified: ✅ (presaleItemsRoutes.ts)
- [ ] Changes were committed: ✅ (a5d4311)
- [ ] Changes were pushed: ✅ (feature/presale-system)

---

## 📊 Key URLs

| Environment | Base URL | Presale Items |
|---|---|---|
| Local | http://localhost:3001/api | http://localhost:3001/api/presale/items |
| Railway | https://hot-wheels-manager-staging.up.railway.app/api | https://hot-wheels-manager-staging.up.railway.app/api/presale/items |
| Debug | (same as above) | /api/presale/items/test/debug |

---

## 💡 Common Errors & Solutions

### "Cannot find module 'PreSaleItemService'"
- **Cause**: Service not exported or import path wrong
- **Fix**: Check `backend/src/services/PreSaleItemService.ts` exports default
- **Status**: ✅ Verified correct

### "PreSaleItem.find is not a function"
- **Cause**: Mongoose model not initialized
- **Fix**: Ensure model is imported and schema is defined
- **Status**: ✅ Verified model exists

### "MongooseError: connect ECONNREFUSED"
- **Cause**: MongoDB not reachable
- **Fix**: Check MONGODB_URI env var in Railway
- **Solution**: Verify connection string, check network access

### "401 Unauthorized"
- **Cause**: Token missing or invalid
- **Fix**: Login again to get fresh token
- **Solution**: Check localStorage for 'token'

### "403 Forbidden"
- **Cause**: Auth middleware blocking request
- **Fix**: Check authMiddleware implementation
- **Solution**: Verify JWT_SECRET matches

---

## 📝 Useful Commands

```bash
# Check status after deploy
curl https://hot-wheels-manager-staging.up.railway.app/health

# Test auth (replace TOKEN with actual token from localStorage)
curl -H "Authorization: Bearer TOKEN" \
  https://hot-wheels-manager-staging.up.railway.app/api/presale/items

# View recent commits
git log --oneline -5

# Check current branch
git branch

# Pull latest changes
git pull origin feature/presale-system
```

---

## 📞 Support Info

**Files to Check**:
- `PRESALE_API_404_DEBUG.md` - Detailed diagnostics
- `PRESALE_PHOTO_FEATURE.md` - Photo feature implementation
- `PRESALE_SYSTEM_COMPLETE.md` - Full system documentation

**Related Files**:
- `backend/src/routes/presaleItemsRoutes.ts` - Route with logging
- `backend/src/index.ts` - Route registration
- `frontend/src/services/presale.ts` - API calls

---

## 🎯 Success Indicators

✅ **Issue Resolved When**:
1. Debug route returns 200
2. GET /presale/items returns 200 with data
3. Frontend loads presale dashboard
4. Photos display on presale items
5. Can create new presale items

---

**Created**: October 28, 2025  
**Last Updated**: October 28, 2025  
**Ready for Deployment**: YES ✅
