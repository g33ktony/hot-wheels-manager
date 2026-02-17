import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export interface AuthRequest extends Request {
  user?: {
    userId: string
    email: string
    role: string
  }
}

// Helper to get JWT_SECRET safely
const getJWTSecret = (): string => {
  const secret = process.env.JWT_SECRET
  // En producción, JWT_SECRET DEBE estar configurado
  // En desarrollo, usamos un fallback seguro
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET is required in production!')
    }
    console.warn('⚠️  JWT_SECRET not configured, using development fallback')
    return 'your-secret-key-change-this-in-development'
  }
  return secret
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Obtener token del header
    const token = req.headers.authorization?.replace('Bearer ', '')

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided. Please login.'
      })
    }

    // Verificar token
    const JWT_SECRET = getJWTSecret()
    
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string
      email: string
      role: string
    }

    // Agregar usuario al request
    req.user = decoded
    // Also add to global properties for easier access in authorization middleware
    req.userId = decoded.userId
    req.userRole = decoded.role
    req.userEmail = decoded.email
    next()
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        success: false,
        message: 'Token expired. Please login again.'
      })
    }

    return res.status(401).json({
      success: false,
      message: 'Invalid token. Please login again.'
    })
  }
}
