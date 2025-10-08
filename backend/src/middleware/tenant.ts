import { Request, Response, NextFunction } from 'express'

// Middleware para inyectar userId en req.userId desde req.user (authMiddleware)
export const tenantContext = (req: Request, res: Response, next: NextFunction) => {
  // @ts-ignore
  if (req.user && req.user.userId) {
    // @ts-ignore
    req.userId = req.user.userId
  }
  next()
}
