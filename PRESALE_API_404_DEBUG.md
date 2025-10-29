# Presale API 404 Error Diagnostics & Fix

**Date**: October 28, 2025  
**Status**: 🔴 **In Progress - Debugging**  
**Issue**: GET request to `https://hot-wheels-manager-staging.up.railway.app/api/presale/items` returns 404

---

## Error Details

### Request Information
- **URL**: `https://hot-wheels-manager-staging.up.railway.app/api/presale/items`
- **Method**: GET
- **Status Code**: 404
- **Source**: Network (Browser DevTools)
- **IP**: 66.33.22.26:443
- **Initiator**: `index-BxOuTndt.js:535:7121`

---

## Root Cause Analysis

### Verified Working Components

✅ **Backend Route Registration**
- Route file: `backend/src/routes/presaleItemsRoutes.ts`
- Routes are properly imported in `backend/src/index.ts`
- Route middleware: `authMiddleware`
- Registration: `app.use('/api/presale/items', authMiddleware, presaleItemsRoutes)`

✅ **Frontend API Client**
- Service: `frontend/src/services/presale.ts`
- Base URL: `import.meta.env.VITE_API_URL || 'http://localhost:3001/api'`
- Request: `api.get('/presale/items')`
- Auth header: JWT token added via interceptor

✅ **Build Status**
- TypeScript compilation: ✅ No errors
- Frontend build: ✅ 2721 modules transformed
- Backend build: ✅ TypeScript compilation complete

### Potential Issues (To Investigate)

1. **Authentication Middleware Failure**
   - Token might not be sent correctly
   - Token might be expired or invalid
   - Auth middleware might be rejecting valid tokens

2. **Service Method Error**
   - `PreSaleItemService.getPreSaleItems()` might be throwing an error
   - Database connection might be failing
   - Collection might not exist

3. **Route Order Issue**
   - Error handler might be intercepting the request
   - Not found handler might be catching it before presale routes

4. **Deployment Issue**
   - Changes might not be deployed to Railway yet
   - Environment variables might be different in production

---

## Debugging Steps Implemented

### Step 1: Added Debug Route
**File**: `backend/src/routes/presaleItemsRoutes.ts`

Added test endpoint:
```typescript
router.get('/test/debug', async (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Presale items route is loaded',
    timestamp: new Date().toISOString()
  })
})
```

**Test**: Visit `https://hot-wheels-manager-staging.up.railway.app/api/presale/items/test/debug`
- Should return 200 with debug message
- If returns 404: Route file not deployed

### Step 2: Added Console Logging
**File**: `backend/src/routes/presaleItemsRoutes.ts`

Added detailed logging to GET route:
```typescript
console.log('📌 GET /presale/items - Filters:', { status, carId, onlyActive })
console.log('📌 Calling PreSaleItemService.getPreSaleItems with filters:', filters)
console.log('✅ Successfully retrieved presale items:', items.length)
console.error('❌ Error in GET /presale/items:', error.message, error.stack)
```

**Test**: Check Railway logs for debug output
- Monitor → Logs in Railway dashboard
- Should see logging messages for each request

### Step 3: Enhanced Error Response
**File**: `backend/src/routes/presaleItemsRoutes.ts`

Updated error response to include stack trace:
```typescript
res.status(500).json({
  success: false,
  error: error.message || 'Failed to fetch pre-sale items',
  details: error.stack
})
```

---

## Next Steps

### Immediate Actions Required

1. **Deploy Current Changes**
   ```bash
   git commit -m "debug: add logging and test route for presale API 404"
   git push origin feature/presale-system
   ```
   Then trigger Railway deployment

2. **Monitor Railway Logs**
   - Go to Railway Dashboard
   - Select hot-wheels-manager-backend
   - View live logs
   - Make request to presale/items endpoint
   - Check for debug output

3. **Test Debug Route First**
   ```
   GET /api/presale/items/test/debug
   ```
   - If 404: Route not deployed
   - If 200: Routes are loaded, issue is in service

4. **Check Authentication**
   If debug route returns 200 but main route returns 401:
   - Token is invalid or expired
   - Need to login again
   - Check localStorage for 'token'

5. **Verify Database Connection**
   If error shows in logs:
   - Check MongoDB Atlas connection
   - Verify MONGODB_URI environment variable
   - Check if PreSaleItem collection exists

---

## Troubleshooting Decision Tree

```
GET /presale/items returns 404?
├─ YES
│  ├─ GET /presale/items/test/debug
│  │  ├─ Returns 200
│  │  │  ├─ Routes loaded, issue in service
│  │  │  └─ Check: Database, Service logic, Filters
│  │  └─ Returns 404
│  │     └─ Routes not deployed, trigger Railway deploy
│
├─ Returns 401
│  ├─ Token missing or invalid
│  ├─ Check: localStorage.token, JWT validity
│  └─ Solution: Login again
│
└─ Returns 200
   ├─ Check data format
   └─ Presale items working!
```

---

## Related Files for Investigation

### Backend Routes
- `/backend/src/routes/presaleItemsRoutes.ts` - Main route file
- `/backend/src/index.ts` - Route registration (lines 27-28, 141-142)
- `/backend/src/middleware/auth.ts` - Authentication middleware

### Backend Services
- `/backend/src/services/PreSaleItemService.ts` - Service implementation
- `/backend/src/models/PreSaleItem.ts` - Database model

### Frontend
- `/frontend/src/services/presale.ts` - API service
- `/frontend/src/hooks/usePresale.ts` - React Query hooks
- `/frontend/src/services/api.ts` - Axios configuration

### Database
- `/backend/src/models/PreSaleItem.ts` - Collection schema
- Pre-sale items collection in MongoDB Atlas

---

## Environment Variables to Verify

### Production (Railway)
```
MONGODB_URI = [MongoDB connection string]
JWT_SECRET = [JWT secret key]
CORS_ORIGIN = [Frontend URL]
NODE_ENV = production
PORT = 3001
```

### Check in Railway Dashboard
Settings → Variables

---

## How to Monitor

### Railway Logs
1. Dashboard → hot-wheels-manager-backend
2. "Logs" tab (live view)
3. Filter by "presale" or "404"
4. Watch for debug output

### Frontend Error
1. Browser DevTools → Console
2. Look for failed requests
3. Response will show error details

### API Testing
```bash
# Test with authentication token
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://hot-wheels-manager-staging.up.railway.app/api/presale/items

# Test debug route
curl https://hot-wheels-manager-staging.up.railway.app/api/presale/items/test/debug
```

---

## Files Modified in This Session

1. **backend/src/routes/presaleItemsRoutes.ts**
   - Added debug test route
   - Added console logging to GET endpoint
   - Enhanced error response with stack trace

---

## Commit Message

```
debug: add logging and test route for presale API 404 error

- Added /test/debug route to verify presale routes are loaded
- Added detailed console logging to GET /presale/items endpoint
- Enhanced error response to include stack trace
- Will help diagnose if issue is in route loading or service execution
```

---

## Summary

🔍 **Current Status**: Debugging in progress
- Build: ✅ Passing
- Routes: ✅ Registered
- Service: ⏳ Needs verification
- Database: ⏳ Needs verification
- Deployment: ⏳ Needs trigger

**Next Step**: Deploy changes and monitor Railway logs to see where the request fails.

---

**Created**: October 28, 2025 11:45 AM  
**Last Updated**: October 28, 2025 11:45 AM
