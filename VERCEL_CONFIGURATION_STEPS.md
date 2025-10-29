# Step-by-Step: Configure Vercel Environment Variables

## Your Task (Manual Steps Required)

Since I cannot access Vercel dashboard directly, you need to perform these exact steps:

---

## Step 1: Log into Vercel

1. Open https://vercel.com/dashboard in your browser
2. Log in with your GitHub account
3. You should see your projects listed

---

## Step 2: Select Your Project

1. Click on the **"hot-wheels-manager"** project
2. You're now in the project dashboard

---

## Step 3: Open Settings

1. Click **Settings** (top navigation bar)
2. You should see tabs like: General, Git, Environment Variables, etc.

---

## Step 4: Navigate to Environment Variables

1. Click **Environment Variables** (left sidebar or tabs)
2. You should see a list of existing environment variables (if any)

---

## Step 5: Check for VITE_API_URL

Look for an existing entry called **"VITE_API_URL"**

### If it EXISTS:
- Click the **pencil icon** to edit it
- Update both Preview and Production values
- Continue to Step 6

### If it DOES NOT EXIST:
- Click **"Add New"** button
- Type the name exactly: `VITE_API_URL`
- Continue to Step 6

---

## Step 6: Add Values

You need to set TWO values:

### For Preview (Staging):
```
https://hot-wheels-manager-staging.up.railway.app/api
```

1. Under "Select environments to expose this variable", check **PREVIEW**
2. In the value field, paste the above URL
3. Click **"Add"** or **"Save"** (depending on new vs edit)

### For Production:
```
https://hot-wheels-manager-production.up.railway.app/api
```

1. Under "Select environments to expose this variable", check **PRODUCTION**
2. In the value field, paste the above URL
3. Click **"Save"**

---

## Step 7: Verify Both Are Set

You should see **two entries** or **one entry** with two values:
- Preview: `https://hot-wheels-manager-staging.up.railway.app/api` ✅
- Production: `https://hot-wheels-manager-production.up.railway.app/api` ✅

---

## Step 8: Redeploy Frontend

1. Go to **Deployments** tab
2. Find the latest deployment (top of the list)
3. Click the **"..."** (three dots) on the right
4. Click **"Redeploy"**
5. Wait for it to show "Ready" (usually 2-3 minutes)

---

## Step 9: Verify Deployment

1. Once "Ready" appears, click the deployment
2. You should see the production link like: `https://hot-wheels-manager.vercel.app`
3. Click it to open your app
4. App should load without errors

---

## What Should Happen

✅ After redeploy, navigate to: https://hot-wheels-manager.vercel.app/presale/dashboard
✅ Dashboard should load with pre-sale items (no 404 error)
✅ If you see items loading, the fix worked! 🎉

---

## Troubleshooting

### If you still see "Error loading pre-sales - 404":
- Wait 5 minutes for caching to clear
- Hard refresh browser: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)
- Clear browser cache
- Try in Incognito window
- If still fails, check Step 7 values are exactly correct

### If Redeploy fails:
- Check that variables are saved (not just in text fields)
- Try refreshing the page
- Try redeploying again

---

## Next: Railway Backend Configuration

After Vercel is configured and working, proceed to: `RAILWAY_BACKEND_CONFIGURATION.md`
