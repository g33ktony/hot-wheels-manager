import express, { Request, Response } from 'express'
import {
  getStores,
  getStoreDetails,
  createStore,
  updateStore,
  updateUserRole,
  removeUserFromStore,
  assignUserToStore,
  archiveStore,
  restoreStore
} from '../controllers/storesController'

const router = express.Router()

// All routes require authentication (applied in index.ts)

// GET /api/stores - Get all stores (sys_admin only)
router.get('/', getStores)

// GET /api/stores/:id - Get store details
router.get('/:id', getStoreDetails)

// POST /api/stores - Create new store (sys_admin only)
router.post('/', createStore)

// PUT /api/stores/:id - Update store (sys_admin only)
router.put('/:id', updateStore)

// PUT /api/stores/:storeId/users/:userId/role - Update user role
router.put('/:storeId/users/:userId/role', updateUserRole)

// DELETE /api/stores/:storeId/users/:userId - Remove user from store
router.delete('/:storeId/users/:userId', removeUserFromStore)

// POST /api/stores/:storeId/assign-user - Assign user to store
router.post('/:storeId/assign-user', assignUserToStore)

// PATCH /api/stores/:id/archive - Archive store
router.patch('/:id/archive', archiveStore)

// PATCH /api/stores/:id/restore - Restore archived store
router.patch('/:id/restore', restoreStore)

export default router
