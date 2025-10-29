# Testing All Phases - Complete Guide

## Before You Start

✅ Vercel environment variables are set  
✅ Vercel frontend has been redeployed  
✅ Railway backend CORS is configured  
✅ Railway backend has been redeployed  
✅ All builds are successful  

**Your staging URLs:**
- Frontend: https://hot-wheels-manager.vercel.app
- Backend: https://hot-wheels-manager-production.up.railway.app/api

---

## Test 1: Phase 3 (Pre-Ventas Form) ✅

**What we're testing:** Can users submit pre-sale purchase forms?

### Steps:

1. Open https://hot-wheels-manager.vercel.app
2. Navigate to **"Pre-Ventas"** in the sidebar (or main menu)
3. Click **"Registrar Pre-Venta"** button
4. Fill in the form:
   - **Número de Auto:** 123456
   - **Nombre del Cliente:** Test Client
   - **Email:** test@example.com
   - **Teléfono:** 555-1234
   - **Precio de Venta:** 50.00
   - **Precio de Costo:** 40.00
   - **Cantidad de Cuotas:** 3
   - **Monto de Cuota:** 16.67
5. Click **"Guardar Pre-Venta"**

### Expected Result:
✅ Form submits successfully  
✅ Success message appears  
✅ Form clears (resets)  
✅ Pre-sale item is created  

### If It Fails:
- ❌ "Error creating pre-sale" → Database issue
- ❌ "Network error" → Backend not running
- ❌ Page doesn't load → Frontend issue
- **Fix:** Check that Vercel and Railway are both deployed

---

## Test 2: Phase 4 (Dashboard) 🔴→🟢 THIS WAS BROKEN, NOW SHOULD WORK

**What we're testing:** Does the dashboard load pre-sale items without 404 error?

### Steps:

1. Open https://hot-wheels-manager.vercel.app
2. Navigate to **"Panel Pre-Ventas"** in the sidebar
3. Wait 2-3 seconds for items to load

### Expected Result:
✅ Dashboard loads without errors  
✅ Pre-sale items appear in a card/table format  
✅ Stats show: Total items, Pending items, Overdue items  
✅ Filters work (click filters to show/hide items)  
✅ Each item card shows: Car number, customer name, price, payment status  

### If It Still Shows 404 Error:
- **First:** Hard refresh browser: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)
- **Second:** Wait 5 minutes and reload
- **Third:** Check:
  1. Vercel: Dashboard shows VITE_API_URL set correctly
  2. Railway: Backend logs show CORS_ORIGIN includes Vercel domain
  3. Browser console: Should NOT show "CORS error"
- **If still broken:** Go to DEBUGGING_404_ERROR.md for advanced troubleshooting

### Dashboard Features to Test:
- [ ] Items load on page open
- [ ] Filters work (try filtering by status)
- [ ] Stats update correctly
- [ ] No 404 errors in browser console
- [ ] All item details display

---

## Test 3: Phase 5 (Payment Management) 💰

**What we're testing:** Does the payment management system work?

### Steps:

1. Open https://hot-wheels-manager.vercel.app
2. Navigate to **"Pagos Pre-Venta"** in the sidebar (or click "Payment Management")
3. Wait for page to load

### Expected Result:
✅ Payment dashboard loads without errors  
✅ Shows 4 stat cards: Total amount, Paid amount, Remaining, Overdue  
✅ Displays payment plans (if any pre-sales with pending payments)  
✅ Shows payment history/analytics  
✅ Can expand payment plans to see payment schedule  

### Features to Test:
- [ ] Resumen (Summary) tab shows stats
- [ ] Planes (Plans) tab shows payment plans
- [ ] Análisis (Analytics) tab shows charts/analytics
- [ ] Click on a plan to expand and see payment schedule
- [ ] Numbers are calculated correctly
- [ ] No 404 errors in browser console

---

## Test 4: Full Workflow Test 🔄

**What we're testing:** Complete end-to-end flow from form to dashboard to payments

### Steps:

1. **Create a new pre-sale:**
   - Go to "Pre-Ventas"
   - Submit form with test data
   - Verify success

2. **View in dashboard:**
   - Go to "Panel Pre-Ventas"
   - Verify your new item appears
   - Verify stats updated

3. **Check payments:**
   - Go to "Pagos Pre-Venta"
   - Verify your new payment plan appears
   - Verify amounts are correct

### Expected Result:
✅ Item created → Appears in dashboard → Shows in payments  
✅ All three phases work together seamlessly  
✅ Data is consistent across pages  
✅ No errors anywhere in the flow  

---

## Browser Console Checks

While testing, open **Browser Console** (F12 or Cmd+Option+I):

### ✅ Good Signs:
- No red error messages
- No orange CORS warnings
- API calls in Network tab show 200/201 status codes
- No 404 errors

### ❌ Bad Signs:
- Red error messages like "CORS error"
- "Failed to fetch"
- "404 not found"
- "Unauthorized" (401)
- Network tab shows requests with red status codes (400+)

**If you see errors:**
1. Note the exact error message
2. Check step by step which test is failing
3. If Network shows 404: Check Railway backend is running
4. If CORS error: Check CORS_ORIGIN in Railway
5. If 401 error: Check JWT token/authentication

---

## Quick Status Checklist

After running all tests, you should be able to check:

| Test | Status | Notes |
|------|--------|-------|
| Phase 3 Form | ✅/❌ | Can submit pre-sales? |
| Phase 4 Dashboard | ✅/❌ | Items load without 404? |
| Phase 5 Payments | ✅/❌ | Payment page works? |
| Browser Console | ✅/❌ | No errors? |
| Full Workflow | ✅/❌ | All phases work together? |

---

## If Everything Passes ✅

**Congratulations!** Your staging deployment is working:
- Frontend configured and deployed ✅
- Backend configured and running ✅
- All API endpoints working ✅
- All three phases functional ✅

**Next steps:**
1. Document any issues you found
2. Ready to start Phase 6: Delivery Integration
3. See: `PHASE_6_IMPLEMENTATION_PLAN.md`

---

## If Something Fails ❌

**Before asking for help:**
1. Run through the test again (might be a timing issue)
2. Hard refresh browser (Cmd+Shift+R)
3. Check browser console for exact error message
4. Note which test failed
5. Share the error message

**Common Fixes:**
- 404 on dashboard: Wait 5 minutes, redeploy Vercel
- CORS error: Wait 5 minutes, redeploy Railway
- "Unauthorized": Check if you're logged in
- "Network error": Check that Railway backend is running (green status)

---

## Next Action

After all tests pass: **Start Phase 6 Implementation**

See: `PHASE_6_IMPLEMENTATION_PLAN.md`
