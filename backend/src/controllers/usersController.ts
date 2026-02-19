import { Request, Response } from 'express'
import { UserModel } from '../models/User'
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
    const { role } = req.body

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
    user.status = 'approved'
    user.approvedAt = new Date()
    user.approvedBy = req.userEmail || 'system'
    
    // Actualizar rol si se proporciona
    if (role && ['admin', 'editor', 'analyst'].includes(role)) {
      user.role = role
    }

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

    const user = await UserModel.findByIdAndDelete(id)

    if (!user) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Usuario no encontrado'
      })
    }

    res.json({
      success: true,
      data: null,
      message: `Usuario ${user.email} eliminado exitosamente`
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
