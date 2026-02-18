/**
 * Guide: Protecting CRUD Endpoints with Multi-Tenancy Store Access Control
 * 
 * This document shows how to apply store access control to all CRUD endpoints
 * to enforce data isolation per store.
 */

# How to Apply storeId Protection to All Controllers

## 1. Import Required Utilities

```typescript
import { createStoreFilter } from '../utils/storeAccess'
import { Request, Response } from 'express'
```

## 2. Protect GET Endpoints (LIST)

### Pattern: Apply storeId filter to all queries

```typescript
// BEFORE (vulnerable - users see all stores' data)
export const getItems = async (req: Request, res: Response) => {
  const items = await InventoryItemModel.find(query)
    .sort({ createdAt: -1 })
  res.json(items)
}

// AFTER (protected - users only see their store's data)
export const getItems = async (req: Request, res: Response) => {
  // Apply store filter to ensure user only sees their store's data
  const storeFilter = createStoreFilter(req.storeId, req.userRole)
  
  const items = await InventoryItemModel.find({
    ...query,
    ...storeFilter  // Add store filter to any existing filters
  })
    .sort({ createdAt: -1 })
  
  res.json(items)
}
```

## 3. Protect GET by ID (DETAIL)

### Pattern: Check access before returning document

```typescript
// BEFORE (vulnerable)
export const getItemById = async (req: Request, res: Response) => {
  const item = await InventoryItemModel.findById(req.params.id)
  res.json(item)
}

// AFTER (protected)
export const getItemById = async (req: Request, res: Response) => {
  const item = await InventoryItemModel.findById(req.params.id)
  
  if (!item) {
    return res.status(404).json({ error: 'Not found' })
  }
  
  // Check if user can read this store
  if (req.userRole !== 'sys_admin' && item.storeId !== req.storeId) {
    return res.status(403).json({ error: 'Access denied to this store' })
  }
  
  // For sys_admin reading, optional: log the access
  if (req.userRole === 'sys_admin' && item.storeId !== req.storeId) {
    console.log(`sys_admin ${req.userId} viewing store ${item.storeId}`)
  }
  
  res.json(item)
}
```

## 4. Protect POST Endpoints (CREATE)

### Pattern: Assign storeId from authenticated user

```typescript
// BEFORE (vulnerable - user can specify any storeId)
export const createItem = async (req: Request, res: Response) => {
  const newItem = new InventoryItemModel(req.body)
  await newItem.save()
  res.json(newItem)
}

// AFTER (protected - storeId assigned from request context)
export const createItem = async (req: Request, res: Response) => {
  // Never trust client storeId - always use authenticated user's storeId
  const newItem = new InventoryItemModel({
    ...req.body,
    storeId: req.storeId  // Enforce user's store, ignore req.body.storeId
  })
  
  await newItem.save()
  res.json(newItem)
}
```

## 5. Protect PATCH Endpoints (UPDATE)

### Pattern: Check ownership before allowing edit

```typescript
// BEFORE (vulnerable)
export const updateItem = async (req: Request, res: Response) => {
  const item = await InventoryItemModel.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true }
  )
  res.json(item)
}

// AFTER (protected)
export const updateItem = async (req: Request, res: Response) => {
  const item = await InventoryItemModel.findById(req.params.id)
  
  if (!item) {
    return res.status(404).json({ error: 'Not found' })
  }
  
  // Only allow editing own store (sys_admin cannot edit other stores)
  if (item.storeId !== req.storeId) {
    return res.status(403).json({ 
      error: 'You can only edit items from your own store' 
    })
  }
  
  // Prevent changing storeId
  if (req.body.storeId && req.body.storeId !== req.storeId) {
    return res.status(400).json({ 
      error: 'Cannot change store assignment' 
    })
  }
  
  Object.assign(item, req.body)
  await item.save()
  res.json(item)
}
```

## 6. Protect DELETE Endpoints

### Pattern: Check ownership before allowing delete

```typescript
// BEFORE (vulnerable)
export const deleteItem = async (req: Request, res: Response) => {
  await InventoryItemModel.deleteOne({ _id: req.params.id })
  res.json({ message: 'Deleted' })
}

// AFTER (protected)
export const deleteItem = async (req: Request, res: Response) => {
  const item = await InventoryItemModel.findById(req.params.id)
  
  if (!item) {
    return res.status(404).json({ error: 'Not found' })
  }
  
  // Only allow deleting own store items
  if (item.storeId !== req.storeId) {
    return res.status(403).json({ 
      error: 'You can only delete items from your own store' 
    })
  }
  
  await InventoryItemModel.deleteOne({ _id: req.params.id })
  res.json({ message: 'Deleted' })
}
```

---

## Controllers to Update (IN PRIORITY ORDER)

### 🔴 CRITICAL (High Usage) - Update First
1. **inventoryController.ts** - Most used, needs immediate protection
2. **customerController.ts** - All GET/POST/PATCH/DELETE
3. **saleController.ts** - All endpoints
4. **deliveryController.ts** - All endpoints

### 🟡 MEDIUM (Common Usage) - Update Next
5. **purchaseController.ts** - All endpoints
6. **supplierController.ts** - All endpoints
7. **leadController.ts** - All endpoints

### 🟢 LOW (Rare Usage) - Update Last
8. **storeSettingsController.ts** - Only operates on own store settings

---

## Quick Migration Checklist

For each controller:

- [ ] Import `createStoreFilter` from utils/storeAccess
- [ ] Find all `ModelName.find(`)
  - [ ] Add `...storeFilter` to query
- [ ] Find all `.findById(`, `.findOne(`
  - [ ] Add ownership check after retrieval
- [ ] Find all `new ModelName(req.body)` or `.create(req.body)`
  - [ ] Add `storeId: req.storeId` to constructor/create
- [ ] Find all `.findByIdAndUpdate()`, `.updateOne(`
  - [ ] Add ownership check before update
  - [ ] Prevent storeId modification
- [ ] Find all `.deleteOne(`, `.remove(`
  - [ ] Add ownership check before delete
- [ ] Test all endpoints with test users from different stores
  - [ ] User A cannot see User B's data
  - [ ] sys_admin can see all data
  - [ ] sys_admin cannot edit other stores

---

## Testing Examples

```typescript
// Test 1: Admin A cannot see Admin B's data
const admin_a_token = await login('admin-a@store-a.com')
const response = await GET('/api/inventory', { token: admin_a_token })
// Should only contain items from store-a

// Test 2: sys_admin can view all stores
const sysadmin_token = await login('sysadmin@company.com')
const stores = await GET('/api/stores', { token: sysadmin_token })
// Should return data from BOTH store-a and store-b

// Test 3: sys_admin cannot edit other stores
const item_from_b = await GET(`/api/inventory/${item_b_id}`)
const editResult = await PATCH(`/api/inventory/${item_b_id}`, 
  { quantity: 100 }, 
  { token: sysadmin_token }
)
// Should FAIL with 403 Access Denied (if sys_admin's store != item.storeId)
```

---

## Files to Modify

**backend/src/controllers/**
- inventoryController.ts ✅
- customerController.ts ✅
- saleController.ts ✅
- deliveryController.ts ✅
- purchaseController.ts ⏳
- supplierController.ts ⏳
- leadController.ts ⏳
- storeSettingsController.ts ⏳

---

## Next Steps After Controllers

1. ✅ Add storeId to all data models (DONE)
2. ✅ Create migration script (DONE)
3. ⏳ **Protect all CRUD endpoints** (IN PROGRESS)
4. Create MongoDB indexes for performance
5. Build frontend store selector UI
6. Run end-to-end tests

---

## Reference: Store Access Logic

```typescript
/* In utils/storeAccess.ts */

// sys_admin can READ from any store
// sys_admin can WRITE only to own store
// admin/editor/analyst can READ/WRITE only own store

checkStoreAccess(userStoreId, targetStoreId, userRole) => {
  if (userRole === 'sys_admin' && readOperation) return true  // READ all
  return userStoreId === targetStoreId  // WRITE own only
}

createStoreFilter(userStoreId, userRole) => {
  // Returns { storeId: userStoreId } for all roles
  // (READ filtering, sys_admin WRITE prevented in controller logic)
  return { storeId: userStoreId }
}
```
