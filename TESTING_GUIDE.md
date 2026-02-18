# 🧪 End-to-End Testing Guide: Multi-Tenancy Implementation

This guide provides step-by-step instructions to verify that the multi-tenancy data isolation is working correctly.

## 📋 Overview

The system now enforces store-based data isolation with the following rules:

### Access Control Rules
- **Regular Users (admin/editor/analyst)**: Can ONLY see and edit data from their own store
- **Sys Admin**: Can READ data from all stores but can ONLY WRITE to their own store
- **API Layer**: All endpoints verify ownership and return 403 (Forbidden) if cross-store access is attempted

## 🎯 Test Accounts

All test accounts have the password: **`password123`**

### Store 1 - Tienda 1 (default-store): Hot Wheels Central
- `admin1@hotwheels.local` - Admin role
- `editor1@hotwheels.local` - Editor role
- `analyst1@hotwheels.local` - Analyst role

### Store 2 - Tienda 2 (store-002): Hot Wheels Norte
- `admin2@hotwheels.local` - Admin role
- `editor2@hotwheels.local` - Editor role

### Sys Admin
- `antonio@hotwheels.com` - Sys Admin role (can access all stores)

## 🧬 Test Scenarios

### Test 1: Regular Users Cannot See Other Stores' Data

**Objective**: Verify that admin users can only see inventory/customers/sales from their own store

1. Login as `admin1@hotwheels.local`
2. Go to **Inventario** page
   - ✅ Should see: 230 inventory items (from Store 1)
3. Go to **Clientes** page
   - ✅ Should see: 17 customers (from Store 1)
4. Go to **Ventas** page
   - ✅ Should see: 24 sales (from Store 1)
5. Logout and login as `admin2@hotwheels.local`
6. Go to **Inventario** page
   - ✅ Should see: 0 inventory items (Store 2 is empty, but data isolation is working!)
   - ✅ Should NOT see the 230 items from Store 1
7. Go to **Clientes** page
   - ✅ Should see: 0 customers (Store 2 is empty)
   - ✅ Should NOT see the 17 customers from Store 1

**Expected Result**: ✅ Each user only sees their own store's data

---

### Test 2: Sys Admin Can View All Stores via Dropdown

**Objective**: Verify that sys_admin can switch between stores and see different data

1. Login as `antonio@hotwheels.com` (sys_admin)
2. Look at the **header/top-bar**
   - ✅ Should see a **Store Selector** dropdown with building icon 🏢
   - ✅ Dropdown should show:
     - Tienda 1 - Hot Wheels Central (default-store)
     - Tienda 2 - Hot Wheels Norte (store-002)
3. Click the dropdown and select **Tienda 1 - Hot Wheels Central**
4. Go to **Inventario** page
   - ✅ Should see: 230 inventory items (from Store 1)
5. Go back to the **Store Selector** dropdown
6. Switch to **Tienda 2 - Hot Wheels Norte**
7. Go to **Inventario** page
   - ✅ Should see: 0 inventory items (Store 2 is empty)
   - ✅ Data has changed based on selected store

**Expected Result**: ✅ Sys admin can switch stores and see different data

---

### Test 3: Sys Admin Can Only EDIT Their Own Store

**Objective**: Verify that sys_admin cannot create/edit data in other stores

1. Login as `antonio@hotwheels.com` (sys_admin)
2. Make sure Store Selector shows **Tienda 1 - Hot Wheels Central** (your default store)
3. Try to **create a new customer** in Tienda 1
   - ✅ Should succeed - customer assigned to your store
4. Switch Store Selector to **Tienda 2 - Hot Wheels Norte**
5. Try to **create a new customer** in Tienda 2
   - ❌ Should FAIL with "Access Denied" or "Only own store" error
   - This is expected - sys_admin can READ all stores but WRITE only own

**Expected Result**: ✅ Sys admin cannot edit other stores' data

---

### Test 4: Cross-Store Operations are Blocked

**Objective**: Verify that users cannot create relationships between different stores

1. Login as `admin1@hotwheels.local` (Store 1 admin)
2. Go to **Ventas** and try to create a sale:
   - Select a customer from Store 1's customer list
   - Select inventory from Store 1
   - ✅ Should succeed
3. Go to **Entregas** and try to create a delivery:
   - Select a customer from Store 1
   - Select items from Store 1
   - ✅ Should succeed
4. Try to make a sale to a customer from a different store (simulate API call or inspector)
   - ❌ Should FAIL - backend validates customer ownership

**Expected Result**: ✅ Cannot create relationships between different stores

---

### Test 5: Regular Users Cannot Access Store Selector

**Objective**: Verify that only sys_admin sees the store dropdown

1. Login as `admin1@hotwheels.local` (regular admin)
2. Look at the **header/top-bar**
   - ❌ Should NOT see a **Store Selector** dropdown
   - Only sys_admin should see it
3. Login as `editor1@hotwheels.local` (editor)
4. Look at the **header/top-bar**
   - ❌ Should NOT see the **Store Selector** dropdown
5. Login as `antonio@hotwheels.com` (sys_admin)
6. Look at the **header/top-bar**
   - ✅ Should see the **Store Selector** dropdown

**Expected Result**: ✅ Store Selector only visible to sys_admin

---

### Test 6: Data Isolation at Database Level

**Objective**: Verify that storeId is properly assigned to all documents

**Using MongoDB Client** (Compass, CLI, etc.):

```javascript
// Check that all inventory items have storeId
db.inventoryitems.find({ storeId: { $exists: false } }).count()
// Should return: 0 (all documents have storeId)

// Check distribution across stores
db.inventoryitems.aggregate([
  { $group: { _id: "$storeId", count: { $sum: 1 } } }
])
// Should show: default-store: 230, store-002: 0

// Similar checks for other collections
db.customers.aggregate([{ $group: { _id: "$storeId", count: { $sum: 1 } } }])
db.sales.aggregate([{ $group: { _id: "$storeId", count: { $sum: 1 } } }])
```

**Expected Result**: ✅ All documents have storeId assigned correctly

---

## 📊 Test Summary Table

| Test Scenario | User Type | Expected Result | Status |
|---------------|-----------|-----------------|--------|
| See own store data | Admin (any store) | ✅ Can see | |
| See other store data | Admin (any store) | ❌ Cannot see (403) | |
| Switch stores | Sys Admin | ✅ Can switch | |
| View other store data | Sys Admin | ✅ Can read | |
| Edit other store data | Sys Admin | ❌ Cannot edit (403) | |
| Create relationships across stores | Any role | ❌ Cannot create | |
| See store selector | Sys Admin | ✅ Visible | |
| See store selector | Regular admin | ❌ Not visible | |
| All docs have storeId | DB check | ✅ All have storeId | |

---

## 🛠️ Troubleshooting

### Issue: Store Selector not appearing for sys_admin
- **Check**: Refresh the page after login
- **Check**: Open browser DevTools → Console for any errors
- **Check**: Verify `antonio@hotwheels.com` is actually stored with role: `sys_admin`

### Issue: Can see other stores' data
- **Check**: Backend API may not be implementing the filter correctly
- **Check**: Review console logs for 403 errors that might be failing silently
- **Check**: Verify useStore() hook is being used correctly in components

### Issue: Store Selector shows wrong stores
- **Check**: Verify `/api/store-settings/all` endpoint returns all stores
- **Check**: Verify sys_admin has a valid token
- **Check**: Check network tab in DevTools to see API responses

### Issue: Creating users in different stores fails
- **Check**: Verify both stores exist in database
- **Check**: Verify migration script ran: `npm run migrate-store-data`

---

## ✅ Verification Commands

Run these commands to verify the setup:

```bash
# Check that all users have storeId
npm run check-users

# Verify indexes were created
# (Should see creation summary with 12 new + 13 existing indexes)
npm run create-indexes

# Check migration results
npm run migrate-store-data

# Build verification
cd backend && npm run build
cd frontend && npm run build
```

---

## 📝 Notes

- All test users share password: **`password123`**
- Sys admin (`antonio@hotwheels.com`) has no password change required
- Test data is persistent - stores and users remain after logout
- To reset test data, you can run `npm run reset-db` (WARNING: deletes all data)

---

## 🎯 Success Criteria

✅ **Multi-tenancy is working correctly if**:
1. Regular users can only see their own store's data
2. Sys admin can switch between stores
3. Sys admin can READ all stores but WRITE only own
4. All API responses include data only from the authorized store
5. All database documents have proper storeId assignment
6. Store Selector appears only for sys_admin
7. Cross-store operations are blocked at API layer

---

## 🚀 Next Steps

After verification:
1. Deploy changes to production
2. Migrate existing user data with proper storeId
3. Train team members on multi-store functionality
4. Set up monitoring for cross-store access attempts
5. Consider implementing audit logs for cross-store API attempts
