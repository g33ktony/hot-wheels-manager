import { Request, Response, NextFunction } from 'express'

// Extender la interfaz de Request para incluir userId y user
declare global {
  namespace Express {
    interface Request {
      userId?: string
      userRole?: string
      userStatus?: string
      user?: any // From auth middleware
    }
  }
}

/**
 * Tenant Context Middleware
 * 
 * CRITICAL: Este middleware inyecta automáticamente el userId del usuario autenticado
 * en el request. TODOS los controllers deben usar req.userId para filtrar datos.
 * 
 * Debe aplicarse DESPUÉS del authMiddleware y ANTES de los controllers.
 */
export const tenantContext = (req: Request, res: Response, next: NextFunction) => {
  // El authMiddleware ya validó el token y agregó req.user
  if (req.user && typeof req.user === 'object' && 'userId' in req.user) {
    req.userId = (req.user as any).userId
    req.userRole = (req.user as any).role
    req.userStatus = (req.user as any).status
  }
  
  next()
}

/**
 * Admin Only Middleware
 * 
 * Verifica que el usuario sea admin antes de permitir el acceso.
 * Debe aplicarse DESPUÉS del tenantContext middleware.
 */
export const adminOnly = (req: Request, res: Response, next: NextFunction) => {
  if (!req.userRole || req.userRole !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.'
    })
  }
  
  next()
}
