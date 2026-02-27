/**
 * Store Access Control Utilities
 * Verifica si un usuario tiene acceso a una tienda específica
 */

import { Request, Response, NextFunction } from 'express'
import { AuthRequest } from '../middleware/auth'

// Extend Request interface to include custom properties
declare global {
  namespace Express {
    interface Request {
      storeId?: string;
      userId?: string;
      userRole?: string;
      userEmail?: string;
      user?: {
        userId: string;
        email: string;
        role: string;
        storeId: string;
      };
    }
  }
}

/**
 * Verifica si el usuario tiene acceso a la tienda especificada
 * - sys_admin: puede ver TODA la data pero solo EDITAR su tienda
 * - admin/editor/analyst: solo su tienda
 */
export const checkStoreAccess = (userStoreId: string, targetStoreId: string, userRole: string): boolean => {
  // sys_admin puede leer de cualquier tienda pero no editar
  if (userRole === 'sys_admin') {
    return true
  }

  // Otros roles solo acceso a su tienda
  return userStoreId === targetStoreId
}

/**
 * Middleware para verificar acceso a tienda en READ
 * sys_admin puede leer de cualquier tienda
 */
export const requireStoreAccessRead = (req: Request, res: Response, next: NextFunction) => {
  const userStoreId = req.storeId
  const userRole = req.userRole
  const targetStoreId = req.params.storeId || req.body.storeId || req.query.storeId

  if (!userStoreId || !userRole) {
    return res.status(401).json({
      success: false,
      message: 'User not authenticated'
    })
  }

  if (!targetStoreId) {
    return res.status(400).json({
      success: false,
      message: 'Store ID required'
    })
  }

  if (!checkStoreAccess(userStoreId, targetStoreId as string, userRole)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied: You do not have access to this store'
    })
  }

  next()
}

/**
 * Middleware para verificar acceso a tienda en WRITE (editar, crear, eliminar)
 * solo si es su tienda (sys_admin solo puede editar su tienda)
 */
export const requireStoreAccessWrite = (req: Request, res: Response, next: NextFunction) => {
  const userStoreId = req.storeId
  const targetStoreId = req.params.storeId || req.body.storeId || req.query.storeId

  if (!userStoreId) {
    return res.status(401).json({
      success: false,
      message: 'User not authenticated'
    })
  }

  if (!targetStoreId) {
    return res.status(400).json({
      success: false,
      message: 'Store ID required'
    })
  }

  // Nadie puede editar otra tienda (ni sys_admin)
  if (userStoreId !== (targetStoreId as string)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied: You can only edit your own store'
    })
  }

  next()
}

/**
 * Middleware para agregar storeId automáticamente a queries
 * Filtra documentos por tienda del usuario autenticado
 */
export const injectStoreIdToQuery = (req: Request, res: Response, next: NextFunction) => {
  if (req.storeId) {
    // Guardar storeId en el request para que handlers lo usen
    req.storeId = req.storeId
  }
  next()
}

/**
 * Helper para crear filtro Mongoose por tienda
 * Para sys_admin: { storeId: { $in: [userStoreId] } } (solo su tienda)
 * Para otros: { storeId: userStoreId }
 */
export const createStoreFilter = (userStoreId: string, userRole: string, canViewAllStores = false): Record<string, any> => {
  // Si es sys_admin y puede ver todas las tiendas, no filtrar
  if (canViewAllStores && userRole === 'sys_admin') {
    return {} // Sin filtro
  }


  // Por defecto, filtrar por tienda del usuario
  return { storeId: userStoreId }
}

/**
 * Tipos para facilitar type-safety
 */
export interface StoreAwareRequest extends Request {
  userStoreId?: string
  storeId?: string
}
