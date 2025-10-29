# Step-by-Step: Configure Railway Backend

## Your Task (Manual Steps Required)

Since I cannot access Railway dashboard directly, you need to perform these exact steps:

---

## Step 1: Log into Railway

1. Open https://railway.app/dashboard in your browser
2. Log in with your GitHub account
3. You should see your projects listed

---

## Step 2: Select Your Backend Project

1. Look for **"hot-wheels-manager-backend"** (or similar name)
2. Click on it
3. You're now in the backend project dashboard

---

## Step 3: Navigate to the Backend Service

1. You should see a list of services (database, backend, etc.)
2. Click on **"backend"** service (or the one running Node.js/Express)
3. You're now viewing the backend service

---

## Step 4: Open Variables Tab

1. In the service view, find and click **Variables** (or "Environment Variables")
2. You should see existing variables like:
   - MONGODB_URI
   - JWT_SECRET
   - NODE_ENV
   - PORT
   - etc.

---

## Step 5: Check for CORS_ORIGIN

Look for an existing entry called **"CORS_ORIGIN"**

### If it EXISTS:
- Click the **pencil/edit icon**
- Go to Step 6 (Edit Mode)

### If it DOES NOT EXIST:
- Click **"New Variable"** or **"Add"** button
- Type name: `CORS_ORIGIN`
- Go to Step 6 (Edit Mode)

---

## Step 6: Set CORS_ORIGIN Value

Copy this ENTIRE value:

```
https://hot-wheels-manager-staging.vercel.app,https://hot-wheels-manager.vercel.app,https://hot-wheels-manager-production.vercel.app,http://localhost:3000,http://localhost:5173
```

1. In the value field, **clear any existing value**
2. **Paste the above value exactly**
3. Click **"Save"** or **"Update"**

---

## Step 7: Verify Variable Saved

You should see **"CORS_ORIGIN"** with the full URL list saved.

**Saved value should look like:**
```
https://hot-wheels-manager-staging.vercel.app,https://hot-wheels-manager.vercel.app,https://hot-wheels-manager-production.vercel.app,http://localhost:3000,http://localhost:5173
```

---

## Step 8: Trigger Backend Redeploy

1. Look for a **"Deploy"** button or **"Redeploy"** option
2. Click it to redeploy with the new CORS configuration
3. Wait for build to complete (usually 2-5 minutes)
4. You should see a green checkmark or "Live" status

---

## Step 9: Verify Backend is Running

**Check the logs:**
1. Go to **Logs** tab
2. You should see messages like:
   - "Listening on port 3001"
   - "Connected to MongoDB"
   - "CORS enabled for: https://hot-wheels-manager-staging.vercel.app,..."
3. No red error messages at the end

**If you see errors:**
- Scroll through logs to find error messages
- Common errors:
  - "MongoDB connection failed" → Check MONGODB_URI
  - "JWT_SECRET not set" → Check JWT_SECRET
  - "Port already in use" → Railway will handle this

---

## Step 10: Test Backend Connectivity

Open your browser console and run:

```javascript
fetch('https://hot-wheels-manager-production.up.railway.app/api/health')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error)
```

**Expected result in console:**
```
{status: "ok"}
```

Or look for similar success response.

**If you see CORS error:**
- Go back to Step 6
- Make sure CORS_ORIGIN value is saved exactly
- Wait 2 minutes
- Redeploy backend again
- Try test again

---

## Summary of What Should Happen

✅ CORS_ORIGIN set with all Vercel domains
✅ Backend redeployed successfully
✅ Logs show "Listening on port 3001" without errors
✅ Health check returns success response
✅ No CORS error messages in browser console

---

## Next: Test All Phases

After Railway is configured, proceed to: `TESTING_ALL_PHASES.md`
