import express from 'express'
import {
  getUsers,
  getPendingUsers,
  approveUser,
  rejectUser,
  updateUser,
  deleteUser
} from '../controllers/usersController'

const router = express.Router()

// All routes require authentication (applied in index.ts)

// GET /api/users - Get users (sys_admin sees all, admin sees their store)
router.get('/', getUsers)

// GET /api/users/pending - Get pending users (sys_admin only)
router.get('/pending', getPendingUsers)

// PATCH /api/users/:id/approve - Approve pending user (sys_admin only)
router.patch('/:id/approve', approveUser)

// PATCH /api/users/:id/reject - Reject pending user (sys_admin only)
router.patch('/:id/reject', rejectUser)

// PATCH /api/users/:id - Update user
router.patch('/:id', updateUser)

// DELETE /api/users/:id - Delete user (sys_admin only)
router.delete('/:id', deleteUser)

export default router
