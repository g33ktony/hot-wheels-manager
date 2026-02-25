import { Request, Response } from 'express'
import Store from '../models/Store'
import { UserModel } from '../models/User'

/**
 * GET /api/stores - Get all stores with user and item counts
 * Only sys_admin can access
 */
export const getStores = async (req: Request, res: Response) => {
  try {
    const userRole = req.userRole

    // Only sys_admin can view all stores
    if (userRole !== 'sys_admin') {
      return res.status(403).json({
        success: false,
        error: 'Solo sys_admin puede ver todas las tiendas'
      })
    }

    const stores = await Store.find().sort({ createdAt: -1 })

    // Get user counts and item counts for each store
    const storesWithDetails = await Promise.all(
      stores.map(async (store) => {
        const users = await UserModel.find({ storeId: store._id })
        const storeUsers = {
          admin: users.filter((u: any) => u.role === 'admin').length,
          editor: users.filter((u: any) => u.role === 'editor').length,
          analyst: users.filter((u: any) => u.role === 'analyst').length,
          total: users.length,
          userDetails: users.map((u: any) => ({
            _id: u._id,
            name: u.name,
            email: u.email,
            role: u.role,
            status: u.status
          }))
        }

        return {
          ...store.toObject(),
          users: storeUsers
        }
      })
    )

    res.json({
      success: true,
      data: storesWithDetails
    })
  } catch (error: any) {
    console.error('Error getting stores:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get stores'
    })
  }
}

/**
 * GET /api/stores/:id - Get specific store details
 * Only sys_admin or admin of that store can access
 */
export const getStoreDetails = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const userId = req.userId
    const userRole = req.userRole
    const userStoreId = req.storeId

    // Check permission
    if (userRole !== 'sys_admin' && userStoreId !== id) {
      return res.status(403).json({
        success: false,
        error: 'No tienes permiso para ver esta tienda'
      })
    }

    const store = await Store.findById(id)
    if (!store) {
      return res.status(404).json({
        success: false,
        error: 'Tienda no encontrada'
      })
    }

    const users = await UserModel.find({ storeId: id })
    const itemCount = 0 // TODO: Get actual item count from inventory

    res.json({
      success: true,
      data: {
        ...store.toObject(),
        userCount: users.length,
        itemCount,
        users: users.map(u => ({
          _id: u._id,
          name: u.name,
          email: u.email,
          role: u.role,
          status: u.status
        }))
      }
    })
  } catch (error: any) {
    console.error('Error getting store details:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get store details'
    })
  }
}

/**
 * POST /api/stores - Create new store
 * Only sys_admin can create
 */
export const createStore = async (req: Request, res: Response) => {
  try {
    const userRole = req.userRole

    if (userRole !== 'sys_admin') {
      return res.status(403).json({
        success: false,
        error: 'Solo sys_admin puede crear tiendas'
      })
    }

    const { name, description } = req.body

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'El nombre de la tienda es requerido'
      })
    }

    // Check if store already exists
    const existingStore = await Store.findOne({ name })
    if (existingStore) {
      return res.status(400).json({
        success: false,
        error: 'Una tienda con este nombre ya existe'
      })
    }

    const store = new Store({
      name,
      description
    })

    await store.save()

    res.status(201).json({
      success: true,
      message: 'Tienda creada exitosamente',
      data: store
    })
  } catch (error: any) {
    console.error('Error creating store:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create store'
    })
  }
}

/**
 * PUT /api/stores/:id - Update store
 * Only sys_admin can update
 */
export const updateStore = async (req: Request, res: Response) => {
  try {
    const userRole = req.userRole

    if (userRole !== 'sys_admin') {
      return res.status(403).json({
        success: false,
        error: 'Solo sys_admin puede actualizar tiendas'
      })
    }

    const { id } = req.params
    const { name, description, storeAdminId } = req.body

    const store = await Store.findByIdAndUpdate(
      id,
      { name, description, storeAdminId },
      { new: true }
    )

    if (!store) {
      return res.status(404).json({
        success: false,
        error: 'Tienda no encontrada'
      })
    }

    res.json({
      success: true,
      message: 'Tienda actualizada exitosamente',
      data: store
    })
  } catch (error: any) {
    console.error('Error updating store:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update store'
    })
  }
}

/**
 * PUT /api/stores/:storeId/users/:userId/role - Update user role in store
 * Only sys_admin or store admin can update
 */
export const updateUserRole = async (req: Request, res: Response) => {
  try {
    const { storeId, userId } = req.params
    const { role } = req.body
    const userRole = req.userRole
    const currentUserStoreId = req.storeId

    // Permission check
    if (userRole !== 'sys_admin' && currentUserStoreId !== storeId) {
      return res.status(403).json({
        success: false,
        error: 'No tienes permiso para modificar usuarios de esta tienda'
      })
    }

    const user = await UserModel.findOne({ _id: userId, storeId })
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado en esta tienda'
      })
    }

    user.role = role
    await user.save()

    res.json({
      success: true,
      message: 'Rol del usuario actualizado',
      data: user
    })
  } catch (error: any) {
    console.error('Error updating user role:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update user role'
    })
  }
}

/**
 * DELETE /api/stores/:storeId/users/:userId - Remove user from store
 * Only sys_admin or store admin can remove
 */
export const removeUserFromStore = async (req: Request, res: Response) => {
  try {
    const { storeId, userId } = req.params
    const userRole = req.userRole
    const currentUserStoreId = req.storeId

    // Permission check
    if (userRole !== 'sys_admin' && currentUserStoreId !== storeId) {
      return res.status(403).json({
        success: false,
        error: 'No tienes permiso para eliminar usuarios de esta tienda'
      })
    }

    const user = await UserModel.findOneAndDelete({ _id: userId, storeId })
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      })
    }

    res.json({
      success: true,
      message: 'Usuario eliminado de la tienda'
    })
  } catch (error: any) {
    console.error('Error removing user:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to remove user'
    })
  }
}

/**
 * POST /api/stores/:storeId/assign-user - Assign existing user to store
 * Only sys_admin or store admin
 */
export const assignUserToStore = async (req: Request, res: Response) => {
  try {
    const { storeId } = req.params
    const { userId, role } = req.body
    const userRole = req.userRole
    const currentUserStoreId = req.storeId

    // Permission check
    if (userRole !== 'sys_admin' && currentUserStoreId !== storeId) {
      return res.status(403).json({
        success: false,
        error: 'No tienes permiso para asignar usuarios a esta tienda'
      })
    }

    // Check store exists
    const store = await Store.findById(storeId)
    if (!store) {
      return res.status(404).json({
        success: false,
        error: 'Tienda no encontrada'
      })
    }

    // Update user
    const user = await UserModel.findByIdAndUpdate(
      userId,
      { storeId, role },
      { new: true }
    )

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      })
    }

    res.json({
      success: true,
      message: 'Usuario asignado a la tienda',
      data: user
    })
  } catch (error: any) {
    console.error('Error assigning user:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to assign user'
    })
  }
}
