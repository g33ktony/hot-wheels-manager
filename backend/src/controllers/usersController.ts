import { Request, Response } from 'express'
import { UserModel } from '../models/User'
import Store from '../models/Store'
import { createStoreFilter } from '../utils/storeAccess'

/**
 * GET /api/users - List users (only sys_admin can view all, admins see their store)
 */
export const getUsers = async (req: Request, res: Response) => {
  try {
    const { status, role, storeId: queryStoreId } = req.query

    // sys_admin puede ver todos, admins solo su tienda
    let filter: any = {}

    if (req.userRole === 'sys_admin') {
      // sys_admin ve todos
      if (status) filter.status = status
      if (role) filter.role = role
      if (queryStoreId) filter.storeId = queryStoreId
    } else if (req.userRole === 'admin') {
      // admin solo ve su tienda
      filter.storeId = req.storeId
      if (status) filter.status = status
    } else {
      // otros roles no tienen acceso
      return res.status(403).json({
        success: false,
        data: null,
        message: 'No tienes permiso para ver usuarios'
      })
    }

    const users = await UserModel.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })

    res.json({
      success: true,
      data: users,
      message: 'Usuarios obtenidos exitosamente'
    })
  } catch (error: any) {
    console.error('Error getting users:', error)
    res.status(500).json({
      success: false,
      data: null,
      message: 'Error al obtener usuarios: ' + error.message
    })
  }
}

/**
 * GET /api/users/pending - List pending users (only sys_admin)
 */
export const getPendingUsers = async (req: Request, res: Response) => {
  try {
    // Solo sys_admin puede ver usuarios pending
    if (req.userRole !== 'sys_admin') {
      return res.status(403).json({
        success: false,
        data: null,
        message: 'Solo el administrador del sistema puede ver usuarios pendientes'
      })
    }

    const pendingUsers = await UserModel.find({ status: 'pending' })
      .select('-password')
      .sort({ createdAt: -1 })

    const stats = {
      totalPending: pendingUsers.length,
      byStore: {} as Record<string, number>
    }

    pendingUsers.forEach(user => {
      stats.byStore[user.storeId] = (stats.byStore[user.storeId] || 0) + 1
    })

    res.json({
      success: true,
      data: {
        users: pendingUsers,
        stats
      },
      message: `${pendingUsers.length} usuario(s) pendiente(s) de aprobación`
    })
  } catch (error: any) {
    console.error('Error getting pending users:', error)
    res.status(500).json({
      success: false,
      data: null,
      message: 'Error al obtener usuarios pendientes: ' + error.message
    })
  }
}

/**
 * PATCH /api/users/:id/approve - Approve pending user (only sys_admin)
 */
export const approveUser = async (req: Request, res: Response) => {
  try {
    // Solo sys_admin puede aprobar
    if (req.userRole !== 'sys_admin') {
      return res.status(403).json({
        success: false,
        data: null,
        message: 'Solo el administrador del sistema puede aprobar usuarios'
      })
    }

    const { id } = req.params
    const { role, storeId } = req.body

    const user = await UserModel.findById(id)

    if (!user) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Usuario no encontrado'
      })
    }

    if (user.status !== 'pending') {
      return res.status(400).json({
        success: false,
        data: null,
        message: `El usuario ya tiene estado: ${user.status}`
      })
    }

    // Default role is 'admin' if not specified
    const finalRole = role || 'admin'

    // Check if trying to create a second sys_admin (only one allowed)
    if (finalRole === 'sys_admin') {
      const existingSysAdmin = await UserModel.findOne({ role: 'sys_admin' })
      if (existingSysAdmin) {
        return res.status(400).json({
          success: false,
          data: null,
          message: 'No se puede crear más de un administrador del sistema. Ya existe uno: ' + existingSysAdmin.email
        })
      }
    }

    // If admin role, create store automatically
    let finalStoreId = storeId
    if (finalRole === 'admin') {
      try {
        // Create unique store name with timestamp to avoid conflicts
        const timestamp = Date.now()
        const storeName = `Tienda de coleccionables ${user.name} (${timestamp})`
        
        console.log(`🏪 Creating store: ${storeName} for user ${user.email}`)
        
        const newStore = new Store({
          name: storeName,
          storeAdminId: (user._id as any).toString()
        })
        await newStore.save()
        finalStoreId = newStore._id.toString()
        
        console.log(`✅ Store created with ID: ${finalStoreId}`)
        console.log(`✅ Store name: ${newStore.name}`)
        console.log(`✅ Store admin ID: ${newStore.storeAdminId}`)
      } catch (storeError: any) {
        console.error('❌ Error creating store:', storeError.message)
        return res.status(500).json({
          success: false,
          data: null,
          message: 'Error al crear tienda: ' + storeError.message
        })
      }
    } else if (!storeId) {
      // editor/analyst must have a store
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Debe asignar una tienda para el usuario'
      })
    }

    // Actualizar usuario
    user.status = 'approved'
    user.role = finalRole
    user.storeId = finalStoreId
    user.approvedAt = new Date()
    user.approvedBy = req.userEmail || 'system'

    await user.save()

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
          storeId: user.storeId,
          status: user.status,
          approvedAt: user.approvedAt
        }
      },
      message: `Usuario ${user.email} aprobado exitosamente`
    })
  } catch (error: any) {
    console.error('Error approving user:', error)
    res.status(500).json({
      success: false,
      data: null,
      message: 'Error al aprobar usuario: ' + error.message
    })
  }
}

/**
 * PATCH /api/users/:id/reject - Reject pending user (only sys_admin)
 */
export const rejectUser = async (req: Request, res: Response) => {
  try {
    // Solo sys_admin puede rechazar
    if (req.userRole !== 'sys_admin') {
      return res.status(403).json({
        success: false,
        data: null,
        message: 'Solo el administrador del sistema puede rechazar usuarios'
      })
    }

    const { id } = req.params
    const { reason } = req.body

    const user = await UserModel.findById(id)

    if (!user) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Usuario no encontrado'
      })
    }

    if (user.status !== 'pending') {
      return res.status(400).json({
        success: false,
        data: null,
        message: `El usuario ya tiene estado: ${user.status}`
      })
    }

    // Actualizar usuario
    user.status = 'rejected'
    user.rejectionReason = reason || 'No especificado'
    user.approvedBy = req.userEmail || 'system'
    user.approvedAt = new Date()

    await user.save()

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          storeId: user.storeId,
          status: user.status,
          rejectionReason: user.rejectionReason
        }
      },
      message: `Usuario ${user.email} rechazado`
    })
  } catch (error: any) {
    console.error('Error rejecting user:', error)
    res.status(500).json({
      success: false,
      data: null,
      message: 'Error al rechazar usuario: ' + error.message
    })
  }
}

/**
 * PATCH /api/users/:id - Update user (sys_admin or self)
 */
export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { name, phone, role } = req.body

    const user = await UserModel.findById(id)

    if (!user) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Usuario no encontrado'
      })
    }

    // Solo sys_admin o el usuario mismo puede editar
    if (req.userRole !== 'sys_admin' && req.userId !== id) {
      return res.status(403).json({
        success: false,
        data: null,
        message: 'No tienes permiso para editar este usuario'
      })
    }

    // Actualizar campos permitidos
    if (name) user.name = name
    if (phone) user.phone = phone

    // Solo sys_admin puede cambiar rol
    if (role && req.userRole === 'sys_admin') {
      if (['sys_admin', 'admin', 'editor', 'analyst'].includes(role)) {
        // Check if trying to change role to sys_admin when one already exists
        if (role === 'sys_admin' && user.role !== 'sys_admin') {
          const existingSysAdmin = await UserModel.findOne({ role: 'sys_admin' })
          if (existingSysAdmin) {
            return res.status(400).json({
              success: false,
              data: null,
              message: 'No se puede crear más de un administrador del sistema. Ya existe uno: ' + existingSysAdmin.email
            })
          }
        }
        user.role = role
      }
    }

    await user.save()

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          role: user.role,
          storeId: user.storeId,
          status: user.status
        }
      },
      message: 'Usuario actualizado exitosamente'
    })
  } catch (error: any) {
    console.error('Error updating user:', error)
    res.status(500).json({
      success: false,
      data: null,
      message: 'Error al actualizar usuario: ' + error.message
    })
  }
}

/**
 * DELETE /api/users/:id - Delete user (only sys_admin)
 * sys_admin users cannot be deleted
 */
export const deleteUser = async (req: Request, res: Response) => {
  try {
    // Solo sys_admin puede eliminar
    if (req.userRole !== 'sys_admin') {
      return res.status(403).json({
        success: false,
        data: null,
        message: 'Solo el administrador del sistema puede eliminar usuarios'
      })
    }

    const { id } = req.params

    const user = await UserModel.findById(id)

    if (!user) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Usuario no encontrado'
      })
    }

    // Prevent deletion of sys_admin users
    if (user.role === 'sys_admin') {
      return res.status(403).json({
        success: false,
        data: null,
        message: 'No se puede eliminar usuarios con rol de administrador del sistema'
      })
    }

    // If this user is an admin of a store, archive that store
    const userEmail = user.email
    const storesAdminedByUser = await Store.find({ storeAdminId: userEmail })
    
    for (const store of storesAdminedByUser) {
      if (!store.isArchived) {
        // Get all users in this store before archiving
        const storeUsers = await UserModel.find({ storeId: store._id })
        const archivedUsers = storeUsers.map((u: any) => ({
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
        
        console.log(`✅ Store ${store.name} archived automatically because admin was deleted`)
      }
    }

    await UserModel.findByIdAndDelete(id)

    res.json({
      success: true,
      data: null,
      message: `Usuario ${user.email} eliminado exitosamente${storesAdminedByUser.length > 0 ? ` y ${storesAdminedByUser.length} tienda(s) archivada(s)` : ''}`
    })
  } catch (error: any) {
    console.error('Error deleting user:', error)
    res.status(500).json({
      success: false,
      data: null,
      message: 'Error al eliminar usuario: ' + error.message
    })
  }
}

/**
 * POST /api/users/create-in-store - Create new user in store (admin or sys_admin)
 * Admin can only create in their store
 * sys_admin can create in any store
 */
export const createUserInStore = async (req: Request, res: Response) => {
  try {
    const { name, email, role, storeId } = req.body
    const requesterRole = req.userRole as string
    const requesterStoreId = req.storeId as string

    // Verify auth properties exist
    // sys_admin can work without storeId (superuser), but others need it
    if (!requesterRole) {
      return res.status(401).json({
        success: false,
        error: 'No autenticado'
      })
    }

    if (requesterRole !== 'sys_admin' && !requesterStoreId) {
      return res.status(401).json({
        success: false,
        error: 'No autenticado'
      })
    }

    // Only admin or sys_admin can create users
    if (!['admin', 'sys_admin'].includes(requesterRole)) {
      return res.status(403).json({
        success: false,
        error: 'Solo admins pueden crear usuarios'
      })
    }

    // Validate input
    // sys_admin needs to specify which store, admin uses their own store
    if (!name || !email || !role) {
      return res.status(400).json({
        success: false,
        error: 'Nombre, email y rol son requeridos'
      })
    }

    // Determine which storeId to use
    let storeIdStr: string
    
    if (requesterRole === 'sys_admin') {
      // sys_admin must specify which store
      if (!storeId) {
        return res.status(400).json({
          success: false,
          error: 'Debes especificar la tienda para crear el usuario'
        })
      }
      storeIdStr = typeof storeId === 'string' ? storeId : String(storeId)
    } else {
      // admin uses their own store
      if (!requesterStoreId) {
        return res.status(401).json({
          success: false,
          error: 'No tienes una tienda asignada'
        })
      }
      // Allow admin to optionally specify a store, or use their own
      if (storeId && storeId !== requesterStoreId) {
        return res.status(403).json({
          success: false,
          error: 'Solo puedes crear usuarios en tu tienda'
        })
      }
      storeIdStr = requesterStoreId
    }

    // Check if email already exists
    const emailLower = email.toLowerCase().trim()
    const existingUser = await UserModel.findOne({ email: emailLower })
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'El email ya está registrado'
      })
    }

    // Generate temporary password
    const tempPassword = Math.random().toString(36).slice(-8)

    // Hash password
    const bcrypt = require('bcryptjs')
    const hashedPassword = await bcrypt.hash(tempPassword, 10)

    // Create user
    const newUser = new UserModel({
      name: name.trim(),
      email: emailLower,
      password: hashedPassword,
      role,
      storeId: storeIdStr,
      status: 'approved', // Created by admin are auto-approved
      phone: ''
    })

    await newUser.save()

    // TODO: Send email with temporary password
    // await sendEmail(email, 'Bienvenido', `Tu contraseña temporal es: ${tempPassword}`)

    res.status(201).json({
      success: true,
      message: 'Usuario creado exitosamente',
      data: {
        user: {
          _id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          storeId: newUser.storeId,
          status: newUser.status
        },
        temporaryPassword: tempPassword
      }
    })
  } catch (error: any) {
    console.error('Error creating user in store:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Error al crear usuario'
    })
  }
}
