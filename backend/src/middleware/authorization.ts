import { Request, Response, NextFunction } from 'express'
import { hasPermission, Permission } from '../utils/rolePermissions'

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      userId?: string
      userRole?: string
      userEmail?: string
    }
  }
}

/**
 * Middleware to check if user has specific permission
 * Usage: router.post('/edit-catalog/:id', requirePermission('catalog:edit'), handler)
 */
export const requirePermission = (permission: Permission) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.userRole

    if (!userRole) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      })
    }

    if (!hasPermission(userRole, permission)) {
      return res.status(403).json({
        success: false,
        message: `Permission denied: ${permission} required`
      })
    }

    next()
  }
}

/**
 * Middleware to check if user has any of the specified permissions
 */
export const requireAnyPermission = (permissions: Permission[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.userRole

    if (!userRole) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      })
    }

    const hasAny = permissions.some(p => hasPermission(userRole, p))
    if (!hasAny) {
      return res.status(403).json({
        success: false,
        message: 'Permission denied: insufficient privileges'
      })
    }

    next()
  }
}

/**
 * Middleware to require sys_admin role
 */
export const requireSysAdmin = (req: Request, res: Response, next: NextFunction) => {
  const userRole = req.userRole

  if (userRole !== 'sys_admin') {
    return res.status(403).json({
      success: false,
      message: 'Sys Admin access required'
    })
  }

  next()
}

/**
 * Middleware to require admin or higher role
 */
export const requireAdminOrHigher = (req: Request, res: Response, next: NextFunction) => {
  const userRole = req.userRole

  if (!['sys_admin', 'admin'].includes(userRole || '')) {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    })
  }

  next()
}
