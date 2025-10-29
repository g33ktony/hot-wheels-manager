# 🚨 Quick Fix for 404 Error - Panel Pre-Ventas

**Problem:** Dashboard shows "Error loading pre-sales - Request failed with status code 404"

**Solution:** 3 Quick Steps

---

## Step 1: Check Environment Variables in Vercel ⚙️

1. Go to **https://vercel.com/dashboard**
2. Click **"hot-wheels-manager"** project
3. Click **Settings** → **Environment Variables**
4. Add/update these variables:

| Name | Preview | Production |
|------|---------|-----------|
| `VITE_API_URL` | `https://hot-wheels-manager-staging.up.railway.app/api` | `https://hot-wheels-manager-production.up.railway.app/api` |

5. Click **Save**

---

## Step 2: Redeploy Frontend 🚀

After setting env vars:

1. Go to **Deployments** tab
2. Click the latest deployment
3. Click **"..." menu** → **"Redeploy"**
4. Wait for "Ready" status (takes 2-3 min)

---

## Step 3: Check Railway Backend ✅

Make sure backend is running:

1. Go to **https://railway.app/dashboard**
2. Click **"hot-wheels-manager-backend"**
3. Check if status is **"Running"**
4. If not, click **"Deploy"** to redeploy

---

## Verify It Works

After completing steps above:

1. Go to **https://hot-wheels-manager.vercel.app/presale/dashboard**
2. Dashboard should now load pre-sales ✅
3. If still broken, check **DEBUGGING_404_ERROR.md**

---

**Expected:** ✅ Dashboard loads with pre-sale items  
**If stuck:** See DEBUGGING_404_ERROR.md for advanced troubleshooting
