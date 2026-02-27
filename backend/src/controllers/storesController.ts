import { Request, Response } from 'express'
import Store from '../models/Store'
import { UserModel } from '../models/User'

/**
 * Ensure sys_admin has a personal store
 */
const ensureSysAdminStore = async (userEmail: string) => {
  try {
    // Check if sys_admin already has a store
    let existingStore = await Store.findOne({ storeAdminId: userEmail })
    if (existingStore) {
      // Also ensure the user's storeId matches the store's _id
      await UserModel.updateOne(
        { email: userEmail },
        { storeId: existingStore._id.toString() }
      )
      console.log(`✅ Ensured sys_admin storeId matches store _id: ${existingStore._id}`)
      return existingStore
    }

    // Create sys_admin's personal store if it doesn't exist
    const sysAdminStore = new Store({
      name: 'Tienda de Coleccionables - Sistema',
      description: 'Tienda personal del administrador del sistema',
      storeAdminId: userEmail
    })
    await sysAdminStore.save()
    console.log(`✅ Created sys_admin store: ${sysAdminStore._id}`)
    
    // Update the user's storeId to match the new store's _id
    await UserModel.updateOne(
      { email: userEmail },
      { storeId: sysAdminStore._id.toString() }
    )
    console.log(`✅ Updated user storeId to: ${sysAdminStore._id}`)
    
    return sysAdminStore
  } catch (error: any) {
    console.error('Error ensuring sys_admin store:', error)
    return null
  }
}

/**
 * GET /api/stores - Get all stores with user and item counts
 * Only sys_admin can access
 * Query params: archived (true/false) - filter by archive status
 */
export const getStores = async (req: Request, res: Response) => {
  try {
    const userRole = req.userRole
    const { archived } = req.query

    // Only sys_admin can view all stores
    if (userRole !== 'sys_admin') {
      return res.status(403).json({
        success: false,
        error: 'Solo sys_admin puede ver todas las tiendas'
      })
    }

    // Ensure sys_admin has a store
    if (req.userEmail) {
      await ensureSysAdminStore(req.userEmail)
    }

    // Build filter based on archived parameter
    const filter: any = {}
    if (archived === 'true') {
      filter.isArchived = true
    } else if (archived === 'false') {
      filter.isArchived = false
    }
    // If archived param not specified, return all stores

    const stores = await Store.find(filter).sort({ createdAt: -1 })

    // Get user counts and item counts for each store
    const storesWithDetails = await Promise.all(
      stores.map(async (store) => {
        const users = await UserModel.find({ storeId: store._id })
        
        // Check if this store's admin is sys_admin
        const isAdminSysAdmin = users.some((u: any) => u.role === 'sys_admin')
        
        const storeUsers = {
          admin: users.filter((u: any) => u.role === 'admin').length,
          editor: users.filter((u: any) => u.role === 'editor').length,
          analyst: users.filter((u: any) => u.role === 'analyst').length,
          sys_admin: users.filter((u: any) => u.role === 'sys_admin').length,
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
          users: storeUsers,
          isSysAdminStore: isAdminSysAdmin,
          isSysAdminOwnStore: store.storeAdminId === req.userEmail, // True if this is the sys_admin's own store
          canDelete: !isAdminSysAdmin && store.storeAdminId !== req.userEmail // Can't delete if it has sys_admin or is sys_admin's own store
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
 * sys_admin users cannot be removed from stores
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

    const user = await UserModel.findOne({ _id: userId, storeId })
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      })
    }

    // Prevent removal of sys_admin users
    if (user.role === 'sys_admin') {
      return res.status(403).json({
        success: false,
        error: 'No se puede eliminar usuarios con rol de administrador del sistema'
      })
    }

    await UserModel.findOneAndDelete({ _id: userId, storeId })

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
/**
 * PATCH /api/stores/:id/archive - Archive a store and save its users
 * Only sys_admin can archive stores
 */
export const archiveStore = async (req: Request, res: Response) => {
  try {
    // Only sys_admin can archive
    if (req.userRole !== 'sys_admin') {
      return res.status(403).json({
        success: false,
        data: null,
        message: 'Solo el administrador del sistema puede archivar tiendas'
      })
    }

    const { id } = req.params

    const store = await Store.findById(id)

    if (!store) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Tienda no encontrada'
      })
    }

    if (store.isArchived) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'La tienda ya está archivada'
      })
    }

    // Get all users in this store before archiving
    const users = await UserModel.find({ storeId: id })
    const archivedUsers = users.map((u: any) => ({
      _id: u._id.toString(),
      name: u.name,
      email: u.email,
      role: u.role,
      status: u.status,
      phone: u.phone,
      storeId: u.storeId?.toString(),
      approvedAt: u.approvedAt
    }))

    // Archive the store
    store.isArchived = true
    store.archivedAt = new Date()
    store.archivedBy = req.userEmail || 'system'
    store.archivedUsers = archivedUsers

    await store.save()

    res.json({
      success: true,
      data: {
        store: {
          _id: store._id,
          name: store.name,
          isArchived: store.isArchived,
          archivedAt: store.archivedAt,
          usersCount: archivedUsers.length
        }
      },
      message: `Tienda ${store.name} archivada exitosamente con ${archivedUsers.length} usuario(s)`
    })
  } catch (error: any) {
    console.error('Error archiving store:', error)
    res.status(500).json({
      success: false,
      data: null,
      message: 'Error al archivar tienda: ' + error.message
    })
  }
}

/**
 * PATCH /api/stores/:id/restore - Restore an archived store
 * Only sys_admin can restore stores
 */
export const restoreStore = async (req: Request, res: Response) => {
  try {
    // Only sys_admin can restore
    if (req.userRole !== 'sys_admin') {
      return res.status(403).json({
        success: false,
        data: null,
        message: 'Solo el administrador del sistema puede restaurar tiendas'
      })
    }

    const { id } = req.params

    const store = await Store.findById(id)

    if (!store) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Tienda no encontrada'
      })
    }

    if (!store.isArchived) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'La tienda no está archivada'
      })
    }

    // Restore the store
    store.isArchived = false
    store.archivedAt = undefined
    store.archivedBy = undefined
    store.archivedUsers = []

    await store.save()

    res.json({
      success: true,
      data: {
        store: {
          _id: store._id,
          name: store.name,
          isArchived: store.isArchived
        }
      },
      message: `Tienda ${store.name} restaurada exitosamente`
    })
  } catch (error: any) {
    console.error('Error restoring store:', error)
    res.status(500).json({
      success: false,
      data: null,
      message: 'Error al restaurar tienda: ' + error.message
    })
  }
}