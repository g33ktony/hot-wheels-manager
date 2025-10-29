# ✅ 404 Error Fix Checklist

**Issue:** Panel Pre-Ventas returns 404  
**Created:** October 28, 2025  
**Status:** Ready for Implementation

---

## 📋 Step-by-Step Checklist

### Phase 1: Vercel Configuration ⚙️

- [ ] Go to https://vercel.com/dashboard
- [ ] Click "hot-wheels-manager" project
- [ ] Click Settings → Environment Variables
- [ ] Check if "VITE_API_URL" exists
- [ ] If not, click "Add New"
- [ ] Set Name: `VITE_API_URL`
- [ ] Set Preview value: `https://hot-wheels-manager-staging.up.railway.app/api`
- [ ] Set Production value: `https://hot-wheels-manager-production.up.railway.app/api`
- [ ] Click "Save"
- [ ] Wait for confirmation message

### Phase 2: Frontend Redeploy 🚀

- [ ] Go to Vercel Deployments tab
- [ ] Find the latest deployment in the list
- [ ] Click on the deployment
- [ ] Click "..." (three dots) menu
- [ ] Select "Redeploy"
- [ ] Wait for status to show "Ready" (2-3 minutes)
- [ ] See success message

### Phase 3: Railway Backend Verification ✅

- [ ] Go to https://railway.app/dashboard
- [ ] Click "hot-wheels-manager-backend"
- [ ] Check main status indicator
- [ ] Verify it shows "Running" (green)
- [ ] Click "Logs" tab
- [ ] Scroll to bottom of recent logs
- [ ] Should see "Server running on port 3001" or similar
- [ ] If not running, click "Deploy" button

### Phase 4: Testing 🧪

- [ ] Go to https://hot-wheels-manager.vercel.app/presale/dashboard
- [ ] Wait for page to load (5-10 seconds)
- [ ] Dashboard should now display pre-sale items
- [ ] If shows items with list, ✅ FIXED!
- [ ] If still shows error, proceed to troubleshooting

---

## 🔧 Troubleshooting If Still Broken

### Check 1: Verify API URL Set Correctly

- [ ] Open browser DevTools (F12)
- [ ] Go to Console tab
- [ ] Paste: `console.log(import.meta.env.VITE_API_URL)`
- [ ] Should show: `https://hot-wheels-manager-staging.up.railway.app/api`
- [ ] If not correct, go back to Vercel and check env vars

### Check 2: Test API Endpoint Directly

- [ ] Open new browser tab
- [ ] Paste: `https://hot-wheels-manager-production.up.railway.app/api/presale/items`
- [ ] If you see JSON data, ✅ backend working
- [ ] If you see 404 or error, ❌ backend issue

### Check 3: Check Railway Backend Status

- [ ] Go to https://railway.app
- [ ] Click "hot-wheels-manager-backend"
- [ ] Click "Metrics" tab
- [ ] Check CPU and Memory usage
- [ ] If very high (>90%), service may be overloaded
- [ ] Click "Restart" button to restart service

### Check 4: Review Recent Deployments

- [ ] On Railway: Click "Deployments" tab
- [ ] Look at the 5 most recent deployments
- [ ] If all say "Failed" in red, deployment broken
- [ ] Click on a failed deployment to see error logs
- [ ] Share error logs with support if needed

---

## 📝 Information to Gather If Still Stuck

If the above checklist doesn't fix it, gather:

- [ ] Screenshot of Vercel Environment Variables page
- [ ] Screenshot of Railway Deployments (last 5)
- [ ] Screenshot of Railway Logs (last 20 lines)
- [ ] Browser console output (right-click → "Save as HAR")
- [ ] Network tab requests (right-click → "Save as HAR")
- [ ] Error message shown on dashboard
- [ ] What is the exact URL shown in browser address bar?

---

## 🎯 Expected Results

**After completing Phase 1-4, you should see:**

✅ Dashboard loads in 5-10 seconds  
✅ Shows title "Panel Pre-Ventas"  
✅ Shows filter buttons (Status, Car ID, Supplier)  
✅ Shows stat cards with numbers  
✅ Shows list of pre-sale items with details  
✅ Can click to expand items  
✅ Can search/filter items  

**If you see all of these:** 🎉 **FIX SUCCESSFUL**

---

## 🚀 Next Steps After Fix

Once dashboard works:

- [ ] Test clicking on items to expand
- [ ] Test filter buttons (All, Pending, In Progress, Completed)
- [ ] Test search by Car ID
- [ ] Go to "Pagos Pre-Venta" (Payments) page
- [ ] Verify Payment Management works
- [ ] Start Phase 6: Delivery Integration

---

## ⏱️ Time Estimates

- **Phase 1 (Vercel Config):** 3-5 minutes
- **Phase 2 (Frontend Deploy):** 3-5 minutes
- **Phase 3 (Railway Check):** 2-3 minutes
- **Phase 4 (Testing):** 2-5 minutes
- **Total:** 10-18 minutes

**If troubleshooting needed:** Add 5-15 minutes

---

## 💡 Common Mistakes to Avoid

❌ **Don't:**
- Set env var, then forget to redeploy
- Copy-paste URL with extra spaces
- Only set Production, forget Preview
- Not wait for "Ready" status after deploy
- Not check if Railway shows "Running"

✅ **Do:**
- Set env vars FIRST
- Then redeploy SECOND
- Wait for confirmations
- Test immediately after
- Check both Vercel AND Railway

---

## 📞 Getting Help

If stuck on any step:

1. Check the file: **DEBUGGING_404_ERROR.md**
2. Check the file: **QUICK_FIX_404.md**
3. Check the file: **404_ERROR_SUMMARY.md**
4. Share diagnostic info listed above
5. Provide exact error message

---

**Status:** Ready to execute  
**Next:** Follow Phase 1 above  
**Support:** See referenced documentation files
