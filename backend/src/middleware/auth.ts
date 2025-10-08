import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export interface AuthRequest extends Request {
  user?: {
    userId: string
    email: string
    role: string
    status: string
  }
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
    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this'
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string
      email: string
      role: string
      status: string
    }

    // Agregar usuario al request
    req.user = decoded
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
